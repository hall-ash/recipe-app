"use strict";

const request = require("supertest");
const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** GET / */
describe("GET /", () => {

  const query = {
    url: 'https://www.wellplated.com/slow-cooker-honey-garlic-chicken/'
  };

  test("returns recipe data as json given a url", async () => {
  
    const res = await request(app)
      .get('/')
      .query(query);

    expect(res.statusCode).toEqual(200);
      const { 
        title,
        servings,
        sourceUrl,
        sourceName,
        image,
        ingredients,
        instructions,
        cuisines,
        diets,
        courses,
        occasions,
      } = res.body.recipeData;
  
      expect(title).toBe('Slow Cooker Honey Garlic Chicken');
      expect(servings).toEqual(4);
      expect(sourceUrl).toBe('https://www.wellplated.com/slow-cooker-honey-garlic-chicken/');
      expect(sourceName).toEqual('wellplated.com');
      expect(image).toBe('https://spoonacular.com/recipeImages/1084395-556x370.jpg');
      
      expect(instructions).toEqual(
        [
          'Place the chicken in the bottom of a 6-quart or larger slow cooker. In a medium mixing bowl or very large measuring cup, whisk together the soy sauce, honey, tomato paste, chili paste, garlic, and rice vinegar. Pour over the chicken. Cover and cook on LOW for 4 to 5 hours or HIGH for 2 to 3 hours, until the chicken reaches an internal temperature of 165 degrees F on an instant-read thermometer. If you are available, flip the chicken over once halfway through to coat both sides. (If not, dont stress; it will still be tasty.)',
          "Remove the chicken to a plate and let cool slightly. Whisk the cornstarch into the slow cooker cooking liquid. Cover and cook on HIGH for 15 minutes, until the sauce thickens slightly, stirring occasionally. If you'd like the sauce particularly thick, you can cook it for a full 30 minutes in the slow cooker OR follow the stovetop method below.",
          'For quicker sauce thickening, reduce the sauce on the stove: After whisking in the cornstarch, transfer the cooking liquid to a medium saucepan. Cook on the stovetop over medium heat, stirring often until the sauce thickens, 5 to 10 minutes. (If your slow cooker insert is stovetop safe, you can remove it from the slow cooker and place it directly on the burner, but do not do this unless you are POSITIVE your insert is stovetop safe or it may crack.)',
          'With two forks (or your fingers if the chicken is cool enough), shred the chicken and place it in the slow cooker. If you reduced the sauce on the stove, add it back to the slow cooker now. Stir to coat the chicken with the sauce. Serve over rice, sprinkled with green onions and sesame seeds.'
        ]
      );
  
      expect(ingredients).toEqual(
        [
          {
            label: 'boneless, skinless chicken thighs — or chicken breasts',
            usAmount: 1.5,
            usUnit: 'lb',
            metricAmount: 680.389,
            metricUnit: 'g'
          },
          {
            label: 'low-sodium soy sauce',
            usAmount: 0.333,
            usUnit: 'cups',
            metricAmount: 78.863,
            metricUnit: 'ml'
          },
          {
            label: 'honey',
            usAmount: 0.333,
            usUnit: 'cups',
            metricAmount: 78.863,
            metricUnit: 'ml'
          },
          {
            label: 'tomato paste',
            usAmount: 2,
            usUnit: 'Tbsps',
            metricAmount: 2,
            metricUnit: 'Tbsps'
          },
          {
            label: 'chili paste — sambal oelek, sriracha, or hot sauce',
            usAmount: 2,
            usUnit: 'tsps',
            metricAmount: 2,
            metricUnit: 'tsps'
          },
          {
            label: 'garlic — minced',
            usAmount: 4,
            usUnit: 'cloves',
            metricAmount: 4,
            metricUnit: 'cloves'
          },
          {
            label: 'rice vinegar',
            usAmount: 1,
            usUnit: 'Tbsp',
            metricAmount: 1,
            metricUnit: 'Tbsp'
          },
          {
            label: 'cornstarch',
            usAmount: 2,
            usUnit: 'Tbsps',
            metricAmount: 2,
            metricUnit: 'Tbsps'
          },
          {
            label: 'Prepared brown rice, quinoa, or cauliflower rice',
            usAmount: 1,
            usUnit: 'serving',
            metricAmount: 1,
            metricUnit: 'serving'
          },
          {
            label: 'Toasted sesame seeds',
            usAmount: 1,
            usUnit: 'serving',
            metricAmount: 1,
            metricUnit: 'serving'
          },
          {
            label: 'Chopped green onion',
            usAmount: 1,
            usUnit: 'serving',
            metricAmount: 1,
            metricUnit: 'serving'
          }
        ]
      );
  
      expect(cuisines).toEqual([]);
      expect(diets).toEqual([ 'gluten free', 'dairy free' ]);
      expect(courses).toEqual([ 'lunch', 'main course', 'main dish', 'dinner' ]);
      expect(occasions).toEqual([]);
 
  });

});