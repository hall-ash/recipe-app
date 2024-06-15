"use strict";

const request = require("supertest");
const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  adminToken,
  ids,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

const U1_RECIPE_ROUTES = '/users/u1/recipes';
const U2_RECIPE_ROUTES = '/users/u2/recipes';

/************************************** POST /users/:username/recipes */
describe("POST  /users/:username/recipes", () => {

  const recipeData = {
    title: 'r1 title',
    sourceUrl: 'r1.com',
    sourceName: 'r1 source',
    image: 'r1.jpg',
    servings: 4,
    instructions: [
     'instruction 1',
     'instruction 2',
     'instruction 3'
    ],
    ingredients: [
      {
        label: 'chicken',
        usAmount: 1.5,
        usUnit: 'lb',
        metricAmount: 680.389,
        metricUnit: 'g'
      },
      {
        label: 'sauce',
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
    ],
    cuisines: [],
    diets: [],
    courses: ['dinner', 'main course'],
    occasions: [],
  }

  test("authorized for admin: creates a new recipe for user", async () => {
    const res = await request(app)
      .post(`${U1_RECIPE_ROUTES}`)
      .send(recipeData)
      .set("authorization", `Bearer ${adminToken}`);
    console.log(res);
    expect(res.statusCode).toEqual(201);
  });

  test("authorized for user: creates a new recipe for user", async () => {
    const res = await request(app)
      .post(`${U1_RECIPE_ROUTES}`)
      .send(recipeData)
      .set("authorization", `Bearer ${u1Token}`);

    expect(res.statusCode).toEqual(201);
  });

  test("unauthorized for diff user", async () => {
    const res = await request(app)
      .post(`${U2_RECIPE_ROUTES}`)
      .send(recipeData)
      .set("authorization", `Bearer ${u1Token}`);

    expect(res.statusCode).toEqual(401);
  });

  test("unauthorized for anon", async () => {
    const res = await request(app)
      .post(`${U2_RECIPE_ROUTES}`)
      .send(recipeData);

    expect(res.statusCode).toEqual(401);
  });

  test("bad request if missing data", async () => {
    const res = await request(app)
      .post(`${U1_RECIPE_ROUTES}`)
      .send({ url: 'recipe.com' }) // missing title
      .set("authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toEqual(400);
  });

  test("bad request if invalid data", async () => {
    const invalidData = { ...recipeData, servings: 'not a number' };

    const res = await request(app)
      .post(`${U1_RECIPE_ROUTES}`)
      .send(invalidData)
      .set("authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toEqual(400);
  });

});

/************************************** GET /users/:username/recipes */
describe("GET /users/:username/recipes ", () => {
  test("authorized for user: retrieves all user recipes", async () => {
    const res = await request(app)
      .get(`${U1_RECIPE_ROUTES}`)
      .set("authorization", `Bearer ${u1Token}`);

    expect(res.body).toEqual({
      recipes: [
        {
          id: ids.recipe,
          title: 'r1 title',
          url: 'r1.com',
          source_name: 'r1 source',
          image: 'r1.jpg',
          servings: 4,
          created_at: expect.any(String),
          edited_at: null,
        }
      ]
    });
  });

  test("authorized for admin: retrieves all user recipes", async () => {
    const res = await request(app)
      .get(`${U1_RECIPE_ROUTES}`)
      .set("authorization", `Bearer ${adminToken}`);

    expect(res.body).toEqual({
      recipes: [
        {
          id: ids.recipe,
          title: 'r1 title',
          url: 'r1.com',
          source_name: 'r1 source',
          image: 'r1.jpg',
          servings: 4,
          created_at: expect.any(String),
          edited_at: null,
        }
      ]
    });
  });

  test("unauthorized for diff user", async () => {
    const res = await request(app)
      .get(`${U2_RECIPE_ROUTES}`)
      .set("authorization", `Bearer ${u1Token}`);

    expect(res.statusCode).toEqual(401);
  });

  test("unauthorized for anon", async () => {
    const res = await request(app)
      .get(`${U2_RECIPE_ROUTES}`);

    expect(res.statusCode).toEqual(401);
  });
})

/************************************** GET /users/:username/recipes/:id */
describe("GET /users/:username/recipes/:id ", () => { 
  test("authorized for user: retrieves data for user recipe", async () => {
    const res = await request(app)
      .get(`${U1_RECIPE_ROUTES}/${ids.recipe}`)
      .set("authorization", `Bearer ${u1Token}`);

    expect(res.body).toEqual({
      recipe: {
        id: ids.recipe,
        username: 'u1',
        title: 'r1 title',
        url: 'r1.com',
        sourceName: 'r1 source',
        image: 'r1.jpg',
        servings: 4,
        editedAt: null,
        createdAt: expect.any(String),
        notes: null,
        isFavorite: false,
        instructions: [
          {
            id: expect.any(Number),
            ordinal: 1,
            recipeId: ids.recipe,
            step: 'instruction 1'
          },
          {
            id: expect.any(Number),
            ordinal: 2,
            recipeId: ids.recipe,
            step: 'instruction 2'
          },
          {
            id: expect.any(Number),
            ordinal: 3,
            recipeId: ids.recipe,
            step: 'instruction 3'
          },
        ],
        ingredients: [
          {
            id: expect.any(Number),
            ordinal: 1,
            recipeId: ids.recipe,
            label: 'chicken',
            baseFood: expect.any(String),
            measures: {
              metric: {
                ingredientId: expect.any(Number),
                amount: expect.any(String),
                unit: expect.any(String),
                unitType: 'metric',
              },
              us: {
                ingredientId: expect.any(Number),
                amount: expect.any(String),
                unit: expect.any(String),
                unitType: 'us',
              }
            }
          },
          {
            id: expect.any(Number),
            ordinal: 2,
            recipeId: ids.recipe,
            label: 'sauce',
            baseFood: expect.any(String),
            measures: {
              metric: {
                ingredientId: expect.any(Number),
                amount: expect.any(String),
                unit: expect.any(String),
                unitType: 'metric',
              },
              us: {
                ingredientId: expect.any(Number),
                amount: expect.any(String),
                unit: expect.any(String),
                unitType: 'us',
              }
            }
          },
          {
            id: expect.any(Number),
            ordinal: 3,
            recipeId: ids.recipe,
            label: 'honey',
            baseFood: expect.any(String),
            measures: {
              metric: {
                ingredientId: expect.any(Number),
                amount: expect.any(String),
                unit: expect.any(String),
                unitType: 'metric',
              },
              us: {
                ingredientId: expect.any(Number),
                amount: expect.any(String),
                unit: expect.any(String),
                unitType: 'us',
              }
            }
          },
        ],
      }
    })
  });

  test("authorized for admin: retrieves data for user recipe", async () => {
    const res = await request(app)
      .get(`${U1_RECIPE_ROUTES}/${ids.recipe}`)
      .set("authorization", `Bearer ${adminToken}`);

    expect(res.body).toEqual({
      recipe: {
        id: ids.recipe,
        username: 'u1',
        title: 'r1 title',
        url: 'r1.com',
        sourceName: 'r1 source',
        image: 'r1.jpg',
        servings: 4,
        editedAt: null,
        createdAt: expect.any(String),
        notes: null,
        isFavorite: false,
        instructions: [
          {
            id: expect.any(Number),
            ordinal: 1,
            recipeId: ids.recipe,
            step: 'instruction 1'
          },
          {
            id: expect.any(Number),
            ordinal: 2,
            recipeId: ids.recipe,
            step: 'instruction 2'
          },
          {
            id: expect.any(Number),
            ordinal: 3,
            recipeId: ids.recipe,
            step: 'instruction 3'
          },
        ],
        ingredients: [
          {
            id: expect.any(Number),
            ordinal: 1,
            recipeId: ids.recipe,
            label: 'chicken',
            baseFood: expect.any(String),
            measures: {
              metric: {
                ingredientId: expect.any(Number),
                amount: expect.any(String),
                unit: expect.any(String),
                unitType: 'metric',
              },
              us: {
                ingredientId: expect.any(Number),
                amount: expect.any(String),
                unit: expect.any(String),
                unitType: 'us',
              }
            }
          },
          {
            id: expect.any(Number),
            ordinal: 2,
            recipeId: ids.recipe,
            label: 'sauce',
            baseFood: expect.any(String),
            measures: {
              metric: {
                ingredientId: expect.any(Number),
                amount: expect.any(String),
                unit: expect.any(String),
                unitType: 'metric',
              },
              us: {
                ingredientId: expect.any(Number),
                amount: expect.any(String),
                unit: expect.any(String),
                unitType: 'us',
              }
            }
          },
          {
            id: expect.any(Number),
            ordinal: 3,
            recipeId: ids.recipe,
            label: 'honey',
            baseFood: expect.any(String),
            measures: {
              metric: {
                ingredientId: expect.any(Number),
                amount: expect.any(String),
                unit: expect.any(String),
                unitType: 'metric',
              },
              us: {
                ingredientId: expect.any(Number),
                amount: expect.any(String),
                unit: expect.any(String),
                unitType: 'us',
              }
            }
          },
        ],
      }
    })
  });

  test("unauthorized for diff user", async () => {
    const res = await request(app)
      .get(`${U2_RECIPE_ROUTES}/${ids.recipe}`)
      .set("authorization", `Bearer ${u1Token}`);

    expect(res.statusCode).toEqual(401);
  });

  test("unauthorized for anon", async () => {
    const res = await request(app)
      .get(`${U2_RECIPE_ROUTES}/${ids.recipe}`);

    expect(res.statusCode).toEqual(401);
  });

});

/************************************** PATCH /users/:username/recipes/favorites/:id */
describe("PATCH /users/:username/recipes/favorites/:id ", () => {
  test("authorized for admin: favorites/unfavorites user recipe", async () => {
    const res = await request(app)
      .patch(`${U1_RECIPE_ROUTES}/favorites/${ids.recipe}`)
      .set("authorization", `Bearer ${adminToken}`);

    expect(res.body).toEqual({ favoriteToggled: ids.recipe })
  });

  test("authorized for user: favorites/unfavorites user recipe", async () => {
    const res = await request(app)
      .patch(`${U1_RECIPE_ROUTES}/favorites/${ids.recipe}`)
      .set("authorization", `Bearer ${u1Token}`);

    expect(res.body).toEqual({ favoriteToggled: ids.recipe })
  });

  test("unauthorized for diff user", async () => {
    const res = await request(app)
      .patch(`${U2_RECIPE_ROUTES}/favorites/${ids.recipe}`)
      .set("authorization", `Bearer ${u1Token}`);

    expect(res.statusCode).toEqual(401)
  });

  test("unauthorized for anon", async () => {
    const res = await request(app)
      .patch(`${U1_RECIPE_ROUTES}/favorites/${ids.recipe}`);

    expect(res.statusCode).toEqual(401)
  });

});

/************************************** PATCH /users/:username/recipes/:id */
describe("PATCH /users/:username/recipes/:id", () => {
  const updateData = {
    title: 'new title',
    instructions: ['new instruction'],
  }

  const expectedResult = { recipe: {
    id: expect.any(Number),
    username: 'u1',
    title: 'new title',
    url: 'r1.com',
    sourceName: 'r1 source',
    image: 'r1.jpg',
    servings: 4,
    editedAt: expect.any(String),
    createdAt: expect.any(String),
    notes: null,
    isFavorite: false,
    instructions: [
      {
        id: expect.any(Number),
        ordinal: 1,
        recipeId: expect.any(Number),
        step: 'new instruction'
      },
    ],
    ingredients: [
      {
        id: expect.any(Number),
        ordinal: 1,
        recipeId: expect.any(Number),
        label: 'chicken',
        baseFood: expect.any(String),
        measures: {
          metric: {
            ingredientId: expect.any(Number),
            amount: expect.any(String),
            unit: expect.any(String),
            unitType: 'metric',
          },
          us: {
            ingredientId: expect.any(Number),
            amount: expect.any(String),
            unit: expect.any(String),
            unitType: 'us',
          }
        }
      },
      {
        id: expect.any(Number),
        ordinal: 2,
        recipeId: expect.any(Number),
        label: 'sauce',
        baseFood: expect.any(String),
        measures: {
          metric: {
            ingredientId: expect.any(Number),
            amount: expect.any(String),
            unit: expect.any(String),
            unitType: 'metric',
          },
          us: {
            ingredientId: expect.any(Number),
            amount: expect.any(String),
            unit: expect.any(String),
            unitType: 'us',
          }
        }
      },
      {
        id: expect.any(Number),
        ordinal: 3,
        recipeId: expect.any(Number),
        label: 'honey',
        baseFood: expect.any(String),
        measures: {
          metric: {
            ingredientId: expect.any(Number),
            amount: expect.any(String),
            unit: expect.any(String),
            unitType: 'metric',
          },
          us: {
            ingredientId: expect.any(Number),
            amount: expect.any(String),
            unit: expect.any(String),
            unitType: 'us',
          }
        }
      },
    ],
  }};

  test("authorized for admin: updates user recipe", async () => {
    const res = await request(app)
      .patch(`${U1_RECIPE_ROUTES}/${ids.recipe}`)
      .send(updateData)
      .set("authorization", `Bearer ${adminToken}`);

    expect(res.body).toEqual(expectedResult);

  });

  test("authorized for user: updates user recipe", async () => {
    const res = await request(app)
      .patch(`${U1_RECIPE_ROUTES}/${ids.recipe}`)
      .send(updateData)
      .set("authorization", `Bearer ${u1Token}`);

    expect(res.body).toEqual(expectedResult);

  });

  test("unauthorized for diff user", async () => {
    const res = await request(app)
      .patch(`${U2_RECIPE_ROUTES}/${ids.recipe}`)
      .send(updateData)
      .set("authorization", `Bearer ${u1Token}`);

    expect(res.statusCode).toEqual(401);

  });

  test("unauthorized for anon", async () => {
    const res = await request(app)
      .patch(`${U2_RECIPE_ROUTES}/${ids.recipe}`)
      .send(updateData);

    expect(res.statusCode).toEqual(401);

  });

  test("not found if no such recipe", async () => {
    const res = await request(app)
      .patch(`${U1_RECIPE_ROUTES}/-1`)
      .send(updateData)
      .set("authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toEqual(404);

  });

  test("bad request if invalid data", async () => {
    const res = await request(app)
      .patch(`${U1_RECIPE_ROUTES}/-1`)
      .send({ title: 123 })
      .set("authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toEqual(400);

  });

});

/************************************** DELETE /users/:username/recipes/:id */
describe("DELETE /users/:username/recipes/:id", () => {

  test("authorized for admin: deletes user recipe", async () => {
    const res = await request(app)
      .delete(`${U1_RECIPE_ROUTES}/${ids.recipe}`)
      .set('authorization', `Bearer ${adminToken}`);

    expect(res.body).toEqual({ deleted: ids.recipe });
  });

  test("authorized for user: deletes user recipe", async () => {
    const res = await request(app)
      .delete(`${U1_RECIPE_ROUTES}/${ids.recipe}`)
      .set('authorization', `Bearer ${u1Token}`);

    expect(res.body).toEqual({ deleted: ids.recipe });
  });

  test("unauthorized for diff user", async () => {
    const res = await request(app)
      .delete(`${U2_RECIPE_ROUTES}/${ids.recipe}`)
      .set('authorization', `Bearer ${u1Token}`);

    expect(res.statusCode).toEqual(401);
  });

  test("unauthorized for anon", async () => {
    const res = await request(app)
      .delete(`${U2_RECIPE_ROUTES}/${ids.recipe}`);

      expect(res.statusCode).toEqual(401);
  });

  test("not found if recipe missing", async () => {
    const res = await request(app)
    .delete(`${U1_RECIPE_ROUTES}/-1`)
    .set('authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toEqual(404);
  })
});
