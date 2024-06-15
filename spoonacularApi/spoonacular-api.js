const axios = require('axios');
const BASE_API_URL = 'https://api.spoonacular.com/recipes';
const extractDomain = require("extract-domain");

const extractRecipeInfo = async ({ url }) => {

  try {
    const res = await axios({
      url: '/extract',
      baseURL: BASE_API_URL,
      params: {
        apiKey: process.env.SPOONACULAR_API_KEY, 
        url,
      }
    });

    const { 
      title, 
      servings,
      sourceUrl,
      sourceName: source,
      image,
      cuisines,
      dishTypes,
      diets,
      occasions,
      instructions: instructionsString,
      extendedIngredients,
    } = res.data;

    // convert string to array where each element is an instruction step
    // remove first element (1st element is 'Instructions')
    const instructions = instructionsString.split('\n\n').slice(1);

    // get array of ingredients: 
    // [{ name, usAmount, usUnit, metricAmount, metricUnit }, ...]
    const ingredients = extendedIngredients.map(ingredient => {
      const { originalName: label, name: baseFood, measures: { us, metric } } = ingredient;

      const measures = [
        {
          amount: us.amount,
          unit: us.unitShort,
          unitType: 'us',
        },
        {
          amount: metric.amount,
          unit: metric.unitShort,
          unitType: 'metric',
        }
      ];
      
      return { label, baseFood, measures };
    });

    // get domain name if source is null
    const sourceName = !source ? extractDomain(sourceUrl) : source;

    return { 
      title, servings, sourceUrl, sourceName, image, 
      instructions, ingredients,
      cuisines, courses: dishTypes, diets, occasions 
    }

  } catch (e) {
    console.error(e);
  }
}

const getConversion = async (baseFood, sourceAmount, sourceUnit, targetUnit) => {

  try {
    const res = await axios({
      url: '/convert',
      baseURL: BASE_API_URL,
      params: {
        apiKey: process.env.SPOONACULAR_API_KEY,
        sourceAmount,
        sourceUnit,
        targetUnit,
        ingredientName: baseFood,
      }
    })

    return res.data.targetAmount;

    // return new Promise(resolve => resolve(113));

  } catch (e) {
    console.error(e);
  }
}


module.exports = {
  extractRecipeInfo,
  getConversion
}