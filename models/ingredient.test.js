"use strict";

const Ingredient = require('./ingredient');
const db = require('../database/db');
const { BadRequestError, NotFoundError } = require("../expressError");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  ids,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);


beforeAll(async () => {
  // remove ingredients from recipe
  await db.query(`DELETE FROM ingredients WHERE recipe_id = ${ids.recipe}`);
});

/************************************** _getCount */
describe("_getCount", () => {

  test("returns 0 if a recipe has no ingredients", async () => {
    const count = await Ingredient._getCount(ids.recipe);
    expect(count).toEqual(0);
  });

  test("returns the number of ingredients for a recipe", async () => {
    // add ingredients
    await db.query(`
      INSERT INTO ingredients
      (recipe_id, unit_id, label, ordinal, metric_amount, us_amount)
      VALUES (${ids.recipe}, ${ids.unit}, 'ingredient 1', 1, 200, 8),
             (${ids.recipe}, ${ids.unit}, 'ingredient 2', 2, 200, 8),
             (${ids.recipe}, ${ids.unit}, 'ingredient 3', 3, 200, 8)
    `);

    const count = await Ingredient._getCount(ids.recipe);
    expect(count).toEqual(3);
  });

});

/************************************** create */
describe("create", () => {

  test("creates a new ingredient in the database and returns the ingredient", async () => {
    
    const ingredientData = {
      unitId: ids.unit,
      label: 'ingredient label',
      metricAmount: 200,
      usAmount: 8,
    }

    const ingredient = await Ingredient.create(ids.recipe, [ingredientData]);

    const dbResult = await db.query(`
      SELECT id, 
             recipe_id AS "recipeId", 
             unit_id AS "unitId",
             label,
             ordinal,
             metric_amount AS "metricAmount", 
             us_amount AS "usAmount"
      FROM ingredients
      WHERE recipe_id = ${ids.recipe}
    `);

    expect(dbResult.rows).toEqual(ingredient);
 
  });

  test("if there are no ingredients for a recipe, adds the new ingredient as first ingredient", async () => {

    const ingredientData = {
      unitId: ids.unit,
      label: 'ingredient label',
      metricAmount: 200,
      usAmount: 8,
    }

    await Ingredient.create(ids.recipe, [ingredientData]);

    const dbResult = await db.query(`
      SELECT ordinal
      FROM ingredients
      WHERE recipe_id = ${ids.recipe}
    `);

    expect(dbResult.rows[0].ordinal).toEqual(1);

  });

  test("appends the new ingredient to the end of a recipe's ingredients", async () => {

    const ingredientData = {
      unitId: ids.unit,
      label: 'ingredient label',
      metricAmount: 200,
      usAmount: 8,
    }
    
    // add ingredients
    await db.query(`
      INSERT INTO ingredients
      (recipe_id, unit_id, label, ordinal, metric_amount, us_amount)
      VALUES (${ids.recipe}, ${ids.unit}, 'ingredient 1', 1, 200, 8),
             (${ids.recipe}, ${ids.unit}, 'ingredient 2', 2, 200, 8),
             (${ids.recipe}, ${ids.unit}, 'ingredient 3', 3, 200, 8)
    `);

    // get created ingredient
    const ingred = (await Ingredient.create(ids.recipe, [ingredientData]))[0];

    const dbResult = await db.query(`
      SELECT ordinal
      FROM ingredients
      WHERE recipe_id = ${ids.recipe} AND id = ${ingred.id}
    `);

    // new ingredient should be #4
    expect(dbResult.rows[0].ordinal).toEqual(4);
    
  });

  test(`creates multiple ingredients for the 
        given recipe when passed an array of ingredients
        and returns an array of the created ingredients`, async () => {
    const ingredientData = [
      {
        unitId: ids.unit,
        label: 'ingredient label 1',
        metricAmount: 200,
        usAmount: 8,
      },
      {
        unitId: ids.unit,
        label: 'ingredient label 2',
        metricAmount: 200,
        usAmount: 8,
      }
    ]

    const ingredients = await Ingredient.create(ids.recipe, ingredientData);

    const dbResult = await db.query(`
      SELECT id,
             recipe_id AS "recipeId", 
             unit_id AS "unitId", 
             label, 
             ordinal, 
             metric_amount AS "metricAmount", 
             us_amount AS "usAmount"
      FROM ingredients
      WHERE recipe_id = ${ids.recipe}
    `);

    expect(dbResult.rows).toEqual(ingredients);
  });

  test(`creates multiple ingredients and appends them to the end of
        the recipe's ingredients`, async () => {
     // add 1st set ingredients
     await db.query(`
     INSERT INTO ingredients
     (recipe_id, unit_id, label, ordinal, metric_amount, us_amount)
     VALUES (${ids.recipe}, ${ids.unit}, 'ingredient 1', 1, 200, 8),
            (${ids.recipe}, ${ids.unit}, 'ingredient 2', 2, 200, 8),
            (${ids.recipe}, ${ids.unit}, 'ingredient 3', 3, 200, 8)
   `);

    const ingredientData = [
      {
        unitId: ids.unit,
        label: 'ingredient 4',
        metricAmount: 200,
        usAmount: 8,
      },
      {
        unitId: ids.unit,
        label: 'ingredient 5',
        metricAmount: 200,
        usAmount: 8,
      }
    ]

    // add 2nd set ingredients
    const ingredients = await Ingredient.create(ids.recipe, ingredientData);

    const dbResult = await db.query(`
      SELECT * FROM ingredients
      WHERE recipe_id = ${ids.recipe}
    `);
    expect(dbResult.rows.length).toEqual(5); 

    expect(ingredients).toEqual([
      {
        id: expect.any(Number),
        recipeId: ids.recipe,
        unitId: ids.unit,
        label: 'ingredient 4',
        ordinal: 4,
        metricAmount: '200',
        usAmount: '8',
      }, 
      {
        id: expect.any(Number),
        recipeId: ids.recipe,
        unitId: ids.unit,
        label: 'ingredient 5',
        ordinal: 5,
        metricAmount: '200',
        usAmount: '8',
      }
    ])
  });

});

/************************************** update */

describe("updateAmounts", () => {

  let id1, id2, id3;
  beforeEach(async () => {
    // add ingredients
     [id1, id2, id3] = (await db.query(`
      INSERT INTO ingredients
      (recipe_id, unit_id, label, ordinal, metric_amount, us_amount)
      VALUES (${ids.recipe}, ${ids.unit}, 'ingredient 1', 1, 200, 8),
            (${ids.recipe}, ${ids.unit}, 'ingredient 2', 2, 200, 8),
            (${ids.recipe}, ${ids.unit}, 'ingredient 3', 3, 200, 8)
      RETURNING id
    `)).rows.map(i => i.id);
  });

  test(`updates ingredients in the database and returns 
        an array of updated ingredient objects`, async () => {

    const toUpdate = [
      {
        id: id1,
        usAmount: 10,
        metricAmount: 100,
      },
      {
        id: id2,
        usAmount: 20,
        metricAmount: 200,
      },
      {
        id: id3,
        usAmount: 30,
        metricAmount: 300,
      },
    ];
    const updated = await Ingredient.updateAmounts(toUpdate);

    const dbResult = await db.query(`
      SELECT id, 
             recipe_id AS "recipeId",
             unit_id AS "unitId",
             label,
             ordinal,
             metric_amount AS "metricAmount",
             us_amount AS "usAmount"
      FROM ingredients
      WHERE recipe_id = ${ids.recipe}
    `);

    expect(dbResult.rows).toEqual(updated);
  });

  test(`updates a single ingredient and returns an array
        containing the updated ingredient`, async () => {
    const toUpdate = [
      {
        id: id1,
        usAmount: 10,
        metricAmount: 100,
      },
    ];
    const updated = await Ingredient.updateAmounts(toUpdate);

    const dbResult = await db.query(`
      SELECT id, 
             recipe_id AS "recipeId",
             unit_id AS "unitId",
             label,
             ordinal,
             metric_amount AS "metricAmount",
             us_amount AS "usAmount"
      FROM ingredients
      WHERE recipe_id = ${ids.recipe}
      AND id = ${updated[0].id}
    `);

    expect(dbResult.rows).toEqual(updated);
  });

});

/************************************** remove */

describe("remove", () => {

  let ingredientId;
  beforeEach(async () => {
    // add ingredient
    ingredientId = (await db.query(`
     INSERT INTO ingredients
     (recipe_id, unit_id, label, ordinal, metric_amount, us_amount)
     VALUES (${ids.recipe}, ${ids.unit}, 'ingredient 1', 1, 200, 8)
     RETURNING id
    `)).rows[0].id;
  });

  test("removes the ingredient from the database", async () => {

    // check that db has 1 ingredient
    expect((await db.query(`
      SELECT * FROM ingredients
    `)).rows.length).toEqual(1);

    // remove ingredient
    await Ingredient.remove(ingredientId);

    // check that there are 0 ingredients in database
    expect((await db.query(`
      SELECT * FROM ingredients
    `)).rows.length).toEqual(0);

  });

  test("throws NotFoundError if ingredient is not in database", async () => {
    try {
      await Ingredient.remove(-1);
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundError);
    }
  });
});