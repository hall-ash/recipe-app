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



/************************************** _getCount */
describe("_getCount", () => {

  test("returns 0 if a recipe has no ingredients", async () => {

    // delete all ingredients from recipe
    await db.query(`DELETE FROM ingredients WHERE recipe_id = ${ids.recipe}`);

    const count = await Ingredient._getCount(ids.recipe);
    expect(count).toEqual(0);
  });

  test("returns the number of ingredients for a recipe", async () => {

    const count = await Ingredient._getCount(ids.recipe);
    expect(count).toEqual(3);
  });

});

/************************************** create */
describe("create", () => {

  test("creates a new ingredient in the database and returns the ingredient", async () => {
    
    // remove ingredients from recipe
    await db.query(`DELETE FROM ingredients WHERE recipe_id = ${ids.recipe}`);

    const ingredientData = {
      label: 'ingredient label',
      measures: [
        {
          amount: 200,
          unit: 'g',
          unitType: 'metric'
        },
        {
          amount: 8,
          unit: 'oz',
          unitType: 'us',
        }
      ]
    };

    const ingredient = await Ingredient.create(ids.recipe, [ingredientData]);
    expect(ingredient).toEqual([
      {
        id: expect.any(Number),
        recipeId: ids.recipe,
        label: 'ingredient label',
        baseFood: null,
        ordinal: 1,
        measures: {
          metric: {
            ingredientId: expect.any(Number),
            amount: '200',
            unit: 'g',
            unitType: 'metric'
          }, 
          us: {
            ingredientId: expect.any(Number),
            amount: '8',
            unit: 'oz',
            unitType: 'us'
          }
        }
      }
    ])

    const dbResult = await db.query(`
      SELECT *
      FROM ingredients
      WHERE recipe_id = ${ids.recipe}
    `);

    expect(dbResult.rows).toHaveLength(1);
 
  });

  test("appends the new ingredient to the end of a recipe's ingredients", async () => {

    const ingredientData = {
      label: 'ingredient label',
    };

    // create ingredient
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
    
     // delete all ingredients from recipe
     await db.query(`DELETE FROM ingredients WHERE recipe_id = ${ids.recipe}`);

    const ingredientData = [
      {
        label: 'ingredient 1',
        measures: [
          {
            amount: 200,
            unit: 'g',
            unitType: 'metric'
          },
          {
            amount: 8,
            unit: 'oz',
            unitType: 'us',
          }
        ],
      },
      {
        label: 'ingredient 2',
        measures: [],
      }
    ];

    const ingredients = await Ingredient.create(ids.recipe, ingredientData);
    expect(ingredients).toEqual([
        {
          id: expect.any(Number),
          recipeId: ids.recipe,
          label: 'ingredient 1',
          baseFood: null,
          ordinal: 1,
          measures: {
            metric: {
              ingredientId: expect.any(Number),
              amount: '200',
              unit: 'g',
              unitType: 'metric'
            }, 
            us: {
              ingredientId: expect.any(Number),
              amount: '8',
              unit: 'oz',
              unitType: 'us'
            }
          }
        },
        {
          id: expect.any(Number),
          recipeId: ids.recipe,
          label: 'ingredient 2',
          baseFood: null,
          ordinal: 2,
          measures: {
            metric: {},
            us: {},
          }
        }
    ])

    const dbResult = await db.query(`
      SELECT *
      FROM ingredients
      WHERE recipe_id = ${ids.recipe}
    `);

    expect(dbResult.rows).toHaveLength(2);
  });

  test(`creates multiple ingredients and appends them to the end of
        the recipe's ingredients`, async () => {

    const ingredientData = [
      {
        label: 'ingredient 4',
        measures: [
          {
            amount: 200,
            unit: 'g',
            unitType: 'metric'
          },
          {
            amount: 8,
            unit: 'oz',
            unitType: 'us',
          }
        ],
      },
      {
        label: 'ingredient 5',
        measures: [],
      }
    ];

    // add 2nd set ingredients
    const ingredients = await Ingredient.create(ids.recipe, ingredientData);
    expect(ingredients).toEqual([
      {
        id: expect.any(Number),
        recipeId: ids.recipe,
        label: 'ingredient 4',
        baseFood: null,
        ordinal: 4,
        measures: {
          metric: {
            ingredientId: expect.any(Number),
            amount: '200',
            unit: 'g',
            unitType: 'metric'
          }, 
          us: {
            ingredientId: expect.any(Number),
            amount: '8',
            unit: 'oz',
            unitType: 'us'
          }
        }
      },
      {
        id: expect.any(Number),
        recipeId: ids.recipe,
        label: 'ingredient 5',
        baseFood: null,
        ordinal: 5,
        measures: {
          metric: {},
          us: {},
        }
      }
  ])

    const dbResult = await db.query(`
      SELECT * FROM ingredients
      WHERE recipe_id = ${ids.recipe}
    `);
    expect(dbResult.rows).toHaveLength(5); 

    
  });

});

/************************************** get */

describe("get", () => {
  test("gets ingredient given id", async () => {
    const ingredient = await Ingredient.get(ids.ingredients[0]);

    expect(ingredient).toEqual({
      id: ids.ingredients[0],
      recipeId: ids.recipe,
      label: 'ingredient 1',
      baseFood: null,
      ordinal: 1,
      measures: {
        metric: {
          ingredientId: ids.ingredients[0],
          amount: '200',
          unit: 'g',
          unitType: 'metric',
        },
        us: {
          ingredientId: ids.ingredients[0],
          amount: '8',
          unit: 'oz',
          unitType: 'us',
        }
      }
    })
  });

  test("throws NotFoundError if ingredient not found", async () => {
    try {
      await Ingredient.get(-1);
    } catch (e) {
      expect(e).toBeInstanceOf(NotFoundError);
    }
  });
});

/************************************** getAll */

describe("getAll", () => {

  test("gets all ingredients given a recipe id", async () => {
    const ingredients = await Ingredient.getAll(ids.recipe);

    expect(ingredients).toEqual([
      {
        id: ids.ingredients[0],
        recipeId: ids.recipe,
        label: 'ingredient 1',
        baseFood: null,
        ordinal: 1,
        measures: {
          metric: {
            ingredientId: ids.ingredients[0],
            amount: '200',
            unit: 'g',
            unitType: 'metric',
          },
          us: {
            ingredientId: ids.ingredients[0],
            amount: '8',
            unit: 'oz',
            unitType: 'us',
          }
        }
      },
      {
        id: ids.ingredients[1],
        recipeId: ids.recipe,
        label: 'ingredient 2',
        baseFood: null,
        ordinal: 2,
        measures: {
          metric: {
            ingredientId: ids.ingredients[1],
            amount: '200',
            unit: 'g',
            unitType: 'metric',
          },
          us: {
            ingredientId: ids.ingredients[1],
            amount: '8',
            unit: 'oz',
            unitType: 'us',
          }
        }
      },
      {
        id: ids.ingredients[2],
        recipeId: ids.recipe,
        label: 'ingredient 3',
        baseFood: null,
        ordinal: 3,
        measures: {
          metric: {
            ingredientId: ids.ingredients[2],
            amount: '200',
            unit: 'g',
            unitType: 'metric',
          },
          us: {
            ingredientId: ids.ingredients[2],
            amount: '8',
            unit: 'oz',
            unitType: 'us',
          }
        }
      },
    ])
  });

  test("returns empty list if recipe id not found", async () => {
    const ingredients = await Ingredient.getAll(-1);
    expect(ingredients).toEqual([]);
  })
})

/************************************** update */

describe("update", () => {

  test("updates label, ordinal, amount, unit fields", async () => {
    const data = {
      label: 'updated label',
      ordinal: 100,
      measure: {
        unitType: 'metric',
        measureData: {
          amount: 500,
          unit: 'kg'
        }
      }
    };

    const updatedIngredient = await Ingredient.update(data, ids.ingredients[0]);

    expect(updatedIngredient).toEqual({
      id: ids.ingredients[0],
      recipeId: ids.recipe,
      label: 'updated label',
      baseFood: null,
      ordinal: 100,
      measures: {
        metric: {
          ingredientId: ids.ingredients[0],
          amount: '500',
          unit: 'kg',
          unitType: 'metric',
        },
        us: {
          ingredientId: ids.ingredients[0],
          amount: '8',
          unit: 'oz',
          unitType: 'us',
        },
      }
    });

  });
  
  test("updates ingredient label and ordinal", async () => {
    const data = {
      label: 'updated label',
      ordinal: 100,
    };

    const updatedIngredient = await Ingredient.update(data, ids.ingredients[0]);

    expect(updatedIngredient).toEqual({
      id: ids.ingredients[0],
      recipeId: ids.recipe,
      label: 'updated label',
      baseFood: null,
      ordinal: 100,
      measures: {
        metric: {
          ingredientId: ids.ingredients[0],
          amount: '200',
          unit: 'g',
          unitType: 'metric',
        },
        us: {
          ingredientId: ids.ingredients[0],
          amount: '8',
          unit: 'oz',
          unitType: 'us',
        },
      }
    })

  });

  test("updates ingredient amount and unit", async () => {
    const data = {
      measure: {
        unitType: 'metric',
        measureData: {
          amount: 500,
          unit: 'updated unit'
        }
      }
    };

    const updatedIngredient = await Ingredient.update(data, ids.ingredients[0]);

    expect(updatedIngredient).toEqual({
      id: ids.ingredients[0],
      recipeId: ids.recipe,
      label: 'ingredient 1',
      baseFood: null,
      ordinal: 1,
      measures: {
        metric: {
          ingredientId: ids.ingredients[0],
          amount: '500',
          unit: 'updated unit',
          unitType: 'metric',
        },
        us: {
          ingredientId: ids.ingredients[0],
          amount: '8',
          unit: 'oz',
          unitType: 'us',
        },
      }
    });

  });

  test("throws NotFoundError if ingredient not found", async () => {
    const data = {
      label: 'updated label',
    };

    try {
      await Ingredient.update(data, -1)
    } catch (e) {
      expect(e).toBeInstanceOf(NotFoundError);
    }
  });

  test("throws NotFoundError if ingredient measure not found", async () => {
    const data = {
      measure: {
        unitType: 'does not exist',
        measureData: {
          amount: 500,
          unit: 'updated unit'
        }
      }
    };

    try {
      await Ingredient.update(data, ids.ingredients[0])
    } catch (e) {
      expect(e).toBeInstanceOf(NotFoundError);
    }
  });

  test("throws BadRequestError if unit type not provided", async () => {
    const data = {
      measure: {
        measureData: {
          amount: 500,
          unit: 'updated unit'
        }
      }
    };

    try {
      await Ingredient.update(data, ids.ingredients[0])
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestError);
    }
  });

  test("updates multiple ingredients", async () => {
    const data = [
      {
        id: ids.ingredients[0],
        data: {
          label: 'updated label',
        }
      },
      {
        id: ids.ingredients[1],
        data: {
          measure: {
            unitType: 'us',
            measureData: {
              amount: 500,
            }
          }
        }
      }
    ];


    const ingredients = await Ingredient.update(data);

    expect(ingredients).toEqual([
      {
        id: ids.ingredients[0],
        recipeId: ids.recipe,
        label: 'updated label',
        baseFood: null,
        ordinal: 1,
        measures: {
          metric: {
            ingredientId: ids.ingredients[0],
            amount: '200',
            unit: 'g',
            unitType: 'metric',
          },
          us: {
            ingredientId: ids.ingredients[0],
            amount: '8',
            unit: 'oz',
            unitType: 'us',
          },
        }
      },
      {
        id: ids.ingredients[1],
        recipeId: ids.recipe,
        label: 'ingredient 2',
        baseFood: null,
        ordinal: 2,
        measures: {
          metric: {
            ingredientId: ids.ingredients[1],
            amount: '200',
            unit: 'g',
            unitType: 'metric',
          },
          us: {
            ingredientId: ids.ingredients[1],
            amount: '500',
            unit: 'oz',
            unitType: 'us',
          },
        }
      }
    ])
  });

  test("updates metric measure on updating us measure if ingredient has a 'baseFood'", async () => {
    // add ingredient with a baseFood
    const newIngred = (await db.query(`
      INSERT INTO ingredients
      (recipe_id, label, base_food, ordinal)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [ids.recipe, 'shredded cheese', 'cheese', 1])).rows[0];

    // add measures
    await db.query(`
      INSERT INTO ingredient_measures
      (ingredient_id, amount, unit, unit_type)
      VALUES ($1, 2, 'cups', 'us'),
             ($1, 226, 'g', 'metric')
    `, [newIngred.id])

    // update newIngred
    const updateData = {
      measure: {
        unitType: 'us',
        measureData: {
          amount: 1
        }
      }
    };

    const updatedIngred = await Ingredient.update(updateData, newIngred.id);

    expect(updatedIngred).toEqual({
      id: newIngred.id,
      recipeId: ids.recipe,
      label: 'shredded cheese',
      baseFood: 'cheese',
      ordinal: 1,
      measures: {
        metric: {
          ingredientId: newIngred.id,
          amount: '113', // check that metric measurement has been updated
          unit: 'g',
          unitType: 'metric',
        },
        us: {
          ingredientId: newIngred.id,
          amount: '1',
          unit: 'cups',
          unitType: 'us',
        },
      }
    });


  });

})


/************************************** updateAmounts */

// describe("updateAmounts", () => {

//   let id1, id2, id3;
//   beforeEach(async () => {
//     // add ingredients
//      [id1, id2, id3] = (await db.query(`
//       INSERT INTO ingredients
//       (recipe_id, label, ordinal)
//       VALUES (${ids.recipe}, 'ingredient 1', 1),
//             (${ids.recipe}, 'ingredient 2', 2),
//             (${ids.recipe}, 'ingredient 3', 3)
//       RETURNING id
//     `)).rows.map(i => i.id);
//   });

//   test(`updates ingredients in the database and returns 
//         an array of updated ingredient objects`, async () => {

//     const toUpdate = [
//       {
//         id: id1,
//         usAmount: 10,
//         metricAmount: 100,
//       },
//       {
//         id: id2,
//         usAmount: 20,
//         metricAmount: 200,
//       },
//       {
//         id: id3,
//         usAmount: 30,
//         metricAmount: 300,
//       },
//     ];
//     const updated = await Ingredient.updateAmounts(toUpdate);

//     const dbResult = await db.query(`
//       SELECT id, 
//              recipe_id AS "recipeId",
//              unit_id AS "unitId",
//              label,
//              ordinal,
//              metric_amount AS "metricAmount",
//              us_amount AS "usAmount"
//       FROM ingredients
//       WHERE recipe_id = ${ids.recipe}
//     `);

//     expect(dbResult.rows).toEqual(updated);
//   });

//   test(`updates a single ingredient and returns an array
//         containing the updated ingredient`, async () => {
//     const toUpdate = [
//       {
//         id: id1,
//         usAmount: 10,
//         metricAmount: 100,
//       },
//     ];
//     const updated = await Ingredient.updateAmounts(toUpdate);

//     const dbResult = await db.query(`
//       SELECT id, 
//              recipe_id AS "recipeId",
//              unit_id AS "unitId",
//              label,
//              ordinal,
//              metric_amount AS "metricAmount",
//              us_amount AS "usAmount"
//       FROM ingredients
//       WHERE recipe_id = ${ids.recipe}
//       AND id = ${updated[0].id}
//     `);

//     expect(dbResult.rows).toEqual(updated);
//   });

// });

/************************************** remove */

describe("remove", () => {

  test("removes the ingredient from the database", async () => {

    const numIngredientsBeforeRemove = (await db.query(`
      SELECT * FROM ingredients
    `)).rows.length;
   
    // remove ingredient
    await Ingredient.remove(ids.ingredients[0]);

    const numIngredientsAfterRemove = (await db.query(`
      SELECT * FROM ingredients
    `)).rows.length;

    // expect 1 less ingredient
    expect(numIngredientsAfterRemove).toEqual(numIngredientsBeforeRemove - 1);


  });

  test("throws NotFoundError if ingredient is not in database", async () => {
    try {
      await Ingredient.remove(-1);
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundError);
    }
  });
});