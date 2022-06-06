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

const U1_CATEGORY_ROUTES = '/users/u1/categories';
const U2_CATEGORY_ROUTES = '/users/u2/categories';

/************************************** POST /users/:username/categories */

describe("POST /users/:username/categories", () => {
  test("authorized for user: creates a category for user", async () => {
    const res = await request(app)
      .post(`${U1_CATEGORY_ROUTES}`)
      .send({
        label: 'new category',
        parentId: null
      })
      .set("authorization", `Bearer ${u1Token}`);

    expect(res.statusCode).toEqual(201);
  });

  test("authorized for admin: creates a category for user", async () => {
    const res = await request(app)
      .post(`${U1_CATEGORY_ROUTES}`)
      .send({
        label: 'new category',
        parentId: null
      })
      .set("authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toEqual(201);
  });

  test("unauthorized for diff user", async () => {
    const res = await request(app)
      .post(`${U2_CATEGORY_ROUTES}`)
      .send({
        label: 'new category',
        parentId: null
      })
      .set("authorization", `Bearer ${u1Token}`);

    expect(res.statusCode).toEqual(401);
  });

  test("unauthorized for anon", async () => {
    const res = await request(app)
      .post(`${U2_CATEGORY_ROUTES}`)
      .send({
        label: 'new category',
        parentId: null
      });

    expect(res.statusCode).toEqual(401);
  });


  test("bad request if missing data", async () => {
    const res = await request(app)
      .post(`${U1_CATEGORY_ROUTES}`)
      .send({
        label: 'new category'
      })
      .set("authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toEqual(400);
  });

  test("bad request if invalid data", async () => {
    const res = await request(app)
      .post(`${U1_CATEGORY_ROUTES}`)
      .send({
        label: 'new category',
        parentId: 'not a number or null'
      })
      .set("authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toEqual(400);
  });
 
})

/************************************** GET /users/:username/categories */

describe("GET /users/:username/categories", () => {
  test("authorized for user: retrieves all user categories", async () => {
    const res = await request(app)
      .get(`${U1_CATEGORY_ROUTES}`)
      .set("authorization", `Bearer ${u1Token}`);
    
    expect(res.body).toEqual({
      categories: [
        {
          id: expect.any(Number),
          username: 'u1',
          label: 'cuisines',
          parentId: null,
          recipes: [],
          children: [ids.category],
        },
        {
          id: expect.any(Number),
          username: 'u1',
          label: 'diets',
          parentId: null,
          recipes: [],
          children: [],
        },
        {
          id: expect.any(Number),
          username: 'u1',
          label: 'courses',
          parentId: null,
          recipes: [],
          children: [expect.any(Number), expect.any(Number)]
        },
        {
          id: expect.any(Number),
          username: 'u1',
          label: 'occasions',
          parentId: null,
          recipes: [],
          children: [],
        },
      ]
    })
  });

  test("authorized for admin: retrieves all user categories", async () => {
    const res = await request(app)
      .get(`${U1_CATEGORY_ROUTES}`)
      .set("authorization", `Bearer ${adminToken}`);
    
    expect(res.body).toEqual({
      categories: [
        {
          id: expect.any(Number),
          username: 'u1',
          label: 'cuisines',
          parentId: null,
          recipes: [],
          children: [ids.category],
        },
        {
          id: expect.any(Number),
          username: 'u1',
          label: 'diets',
          parentId: null,
          recipes: [],
          children: [],
        },
        {
          id: expect.any(Number),
          username: 'u1',
          label: 'courses',
          parentId: null,
          recipes: [],
          children: [expect.any(Number), expect.any(Number)]
        },
        {
          id: expect.any(Number),
          username: 'u1',
          label: 'occasions',
          parentId: null,
          recipes: [],
          children: [],
        },
      ]
    })
  });

  test("unauthorized for diff user", async () => {
    const res = await request(app)
    .get(`${U2_CATEGORY_ROUTES}`)
    .set("authorization", `Bearer ${u1Token}`);
  
    expect(res.statusCode).toEqual(401);
  });

  test("unauth for anon", async () => {
    const res = await request(app)
    .get(`${U2_CATEGORY_ROUTES}`)
  
    expect(res.statusCode).toEqual(401);
  });
});

/************************************** GET /users/:username/categories/:id */

describe("GET /user/:username/categories/:id", () => {
  test("authorized for user: retrieves data for user category", async () => {
    const res = await request(app)
      .get(`${U1_CATEGORY_ROUTES}/${ids.defaultCategories[0]}`)
      .set("authorization", `Bearer ${u1Token}`);

    expect(res.body).toEqual({
      category: {
        id: ids.defaultCategories[0],
        username: 'u1',
        label: 'cuisines',
        parentId: null,
        children: [ids.category],
        recipes: [],
      }
    });
  });

  test("authorized for admin: retrieves data for user category", async () => {
    const res = await request(app)
      .get(`${U1_CATEGORY_ROUTES}/${ids.defaultCategories[0]}`)
      .set("authorization", `Bearer ${adminToken}`);

    expect(res.body).toEqual({
      category: {
        id: ids.defaultCategories[0],
        username: 'u1',
        label: 'cuisines',
        parentId: null,
        children: [ ids.category ],
        recipes: [],
      }
    });
  });

  test("unauthorized for diff user", async () => {
    const res = await request(app)
      .get(`${U2_CATEGORY_ROUTES}/${ids.defaultCategories[0]}`)
      .set("authorization", `Bearer ${u1Token}`);

    expect(res.statusCode).toEqual(401);
  });

  test("unauthorized for anon", async () => {
    const res = await request(app)
      .get(`${U1_CATEGORY_ROUTES}/${ids.defaultCategories[0]}`)

    expect(res.statusCode).toEqual(401);
  });
});

/************************************** PATCH /users/:username/categories/:id */
describe("PATCH /users/:username/categories/:id", () => {
  test("authorized for admin: updates user category", async () => {

    const res = await request(app)
      .patch(`${U1_CATEGORY_ROUTES}/${ids.category}`)
      .send({
        parentId: ids.defaultCategories[0],
        label: 'new label'
      })
      .set("authorization", `Bearer ${adminToken}`);

    expect(res.body).toEqual({
      category: {
        id: ids.category,
        label: 'new label',
        username: 'u1',
        parentId: ids.defaultCategories[0],
      }
    })
  });

  test("authorized for user: updates user category", async () => {

    const res = await request(app)
      .patch(`${U1_CATEGORY_ROUTES}/${ids.category}`)
      .send({
        parentId: ids.defaultCategories[0],
        label: 'new label'
      })
      .set("authorization", `Bearer ${u1Token}`);

    expect(res.body).toEqual({
      category: {
        id: ids.category,
        label: 'new label',
        username: 'u1',
        parentId: ids.defaultCategories[0],
      }
    })
  });

  test("unauthorized for diff user", async () => {

    const res = await request(app)
      .patch(`${U2_CATEGORY_ROUTES}/${ids.category}`)
      .send({
        parentId: ids.defaultCategories[0],
        label: 'new label'
      })
      .set("authorization", `Bearer ${u1Token}`);

    expect(res.statusCode).toEqual(401)
  });

  test("unauthorized for anon", async () => {

    const res = await request(app)
      .patch(`${U1_CATEGORY_ROUTES}/${ids.category}`)
      .send({
        parentId: ids.defaultCategories[0],
        label: 'new label'
      });

    expect(res.statusCode).toEqual(401)
  });

  test("not found if no such category", async () => {

    const res = await request(app)
      .patch(`${U1_CATEGORY_ROUTES}/-1`)
      .send({
        parentId: ids.defaultCategories[0],
        label: 'new label'
      })
      .set("authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toEqual(404)
  });

  test("bad request if invalid data", async () => {

    const res = await request(app)
      .patch(`${U1_CATEGORY_ROUTES}/-1`)
      .send({
        parentId: ids.defaultCategories[0],
        label: 66
      })
      .set("authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toEqual(400)
  });

});

/************************************** DELETE /users/:username/categories/:id */
describe("DELETE /users/:username/categories/:id", () => {

  test("authorized for admin: deletes user category", async () => {
    const res = await request(app)
      .delete(`${U1_CATEGORY_ROUTES}/${ids.category}`)
      .set('authorization', `Bearer ${adminToken}`);

    expect(res.body).toEqual({ deleted: ids.category });
  });

  test("authorized for user: deletes user category", async () => {
    const res = await request(app)
      .delete(`${U1_CATEGORY_ROUTES}/${ids.category}`)
      .set('authorization', `Bearer ${u1Token}`);

    expect(res.body).toEqual({ deleted: ids.category });
  });

  test("unauthorized for diff user", async () => {
    const res = await request(app)
      .delete(`${U2_CATEGORY_ROUTES}/${ids.category}`)
      .set('authorization', `Bearer ${u1Token}`);

    expect(res.statusCode).toEqual(401);
  });

  test("unauthorized for anon", async () => {
    const res = await request(app)
      .delete(`${U2_CATEGORY_ROUTES}/${ids.category}`);

      expect(res.statusCode).toEqual(401);
  });

  test("not found if category missing", async () => {
    const res = await request(app)
    .delete(`${U1_CATEGORY_ROUTES}/-1`)
    .set('authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toEqual(404);
  })
});

/************************************** POST /users/:username/categories/:categoryId/recipe/:recipeId */
describe("POST /users/:username/categories/:categoryId/recipe/:recipeId", () => {

  test("authorized for admin: adds recipe to category", async () => {
    const res = await request(app)
      .post(`${U1_CATEGORY_ROUTES}/${ids.category}/recipe/${ids.recipe}`)
      .set('authorization', `Bearer ${adminToken}`);

    expect(res.body).toEqual({ added: ids.recipe });
  });

  test("authorized for user: adds recipe to category", async () => {
    const res = await request(app)
      .post(`${U1_CATEGORY_ROUTES}/${ids.category}/recipe/${ids.recipe}`)
      .set('authorization', `Bearer ${u1Token}`);

    expect(res.body).toEqual({ added: ids.recipe });
  });

  test("unauthorized for diff user", async () => {
    const res = await request(app)
      .post(`${U2_CATEGORY_ROUTES}/${ids.category}/recipe/${ids.recipe}`)
      .set('authorization', `Bearer ${u1Token}`);

    expect(res.statusCode).toEqual(401);
  });

  test("unauthorized for anon", async () => {
    const res = await request(app)
      .post(`${U2_CATEGORY_ROUTES}/${ids.category}/recipe/${ids.recipe}`);

    expect(res.statusCode).toEqual(401);
  });

  test("not found if recipe missing", async () => {
    const res = await request(app)
      .post(`${U1_CATEGORY_ROUTES}/${ids.category}/recipe/-1`)
      .set('authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toEqual(404);
  });

  test("not found if category missing", async () => {
    const res = await request(app)
      .post(`${U1_CATEGORY_ROUTES}/-1/recipe/${ids.recipe}`)
      .set('authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toEqual(404);
  });
});