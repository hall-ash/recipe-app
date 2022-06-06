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
      const { originalName: label, measures } = ingredient;
      const { amount: usAmount, unitShort: usUnit } = measures.us;
      const { amount: metricAmount, unitShort: metricUnit } = measures.metric;
      
      return { label, usAmount, usUnit, metricAmount, metricUnit };
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


module.exports = {
  extractRecipeInfo,
}