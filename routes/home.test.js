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
          expect.any(String),
          expect.any(String),
          expect.any(String),
          expect.any(String),
        ]
      );
  
      expect(ingredients[0]).toEqual({
        label: expect.any(String),
        baseFood: expect.any(String),
        measures: [
          {
            amount: expect.any(Number),
            unit: expect.any(String),
            unitType: 'us',
          },
          {
            amount: expect.any(Number),
            unit: expect.any(String),
            unitType: 'metric',
          }
        ]
      });

      expect(ingredients).toHaveLength(11);
  
      expect(cuisines).toEqual([]);
      expect(diets).toEqual([ 'gluten free', 'dairy free' ]);
      expect(courses).toEqual([ 'lunch', 'main course', 'main dish', 'dinner' ]);
      expect(occasions).toEqual([]);
 
  });

});