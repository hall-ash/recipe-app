"use strict";

const Category = require('./category');
const db = require('../database/db');
const { BadRequestError, NotFoundError, UnauthorizedError, ForbiddenError } = require("../expressError");
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


/************************************** create */
describe("create", () => {

  test("creates a child category in the database and returns { id, username, label, parentId }", async () => {
   
    const data = { 
      label: 'new cat', 
      parentId: ids.parentCategories[0] 
    };

    const category = await Category.create(ids.users[0], data);

    const categoryInDb = (await db.query(`
      SELECT id, username, label, parent_id AS "parentId"
      FROM categories
      WHERE label = 'new cat' AND parent_id = ${ids.parentCategories[0]}
    `)).rows[0];

    expect(categoryInDb).toEqual({
      id: category.id,
      username: category.username,
      label: category.label,
      parentId: category.parentId,
    });

  });

  test("creates a root category in the database and returns { id, username, label, parentId }", async () => {
    const data = {
      label: 'top level cat',
      parentId: null,
    };

    const category = await Category.create(ids.users[0], data);

    const categoryInDb = (await db.query(`
      SELECT id, username, label, parent_id AS "parentId"
      FROM categories
      WHERE label = 'top level cat' 
    `)).rows[0];

    expect(categoryInDb).toEqual({
      id: category.id,
      username: category.username,
      label: category.label,
      parentId: category.parentId,
    });
  });

  test("throws NotFoundError if attempting to child category with a nonexistant parent category", async () => {
    const data = { 
      label: 'new cat', 
      parentId: null 
    };
    
    try {
      await Category.create(ids.users[0], data);
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundError);
    }
  });

  test("throws BadRequestError on creating root category with duplicate label", async () => {
    const data = { 
      label: 'cuisine', // already created in _testCommon.js
      parentId: null  
    };
    
    try {
      await Category.create(ids.users[0], data);
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestError);
    }
  });

  test("throws BadRequestError on creating child category with duplicate label under the same parent", async () => {
    const data = { 
      label: 'italian', // already created in _testCommon.js
      parentId: ids.parentCategories[0], 
    };
    
    try {
      await Category.create(ids.users[0], data);
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestError);
    }
  });

  test("throws UnauthorizedError on creating category with different username as parent category", async () => {
    const data = { 
      label: 'new category', 
      parentId: ids.parentCategories[0], // parent cat belongs to users[0[]
    };
    
    try {
      // attempt to add category from users[1] to parent category from users[0]
      await Category.create(ids.users[1], data)
    } catch (err) {
      console.log(err)
      expect(err).toBeInstanceOf(UnauthorizedError);
    }
  })

});

/************************************** get */
describe("get", () => {

  test("returns the category given its id", async () => {

    const category = await Category.get(ids.users[0], ids.categories[0]);

    expect(category).toEqual({
      id: ids.categories[0],
      username: ids.users[0],
      label: 'italian',
      parentId: ids.parentCategories[0],
      children: [],
      recipes: [ids.recipe]
    });

  });

  test("throws NotFoundError if category is not in database", async () => {
    try {
      await Category.get(ids.users[0], -1)
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundError);
    }
  });

});
/************************************** getAll */
describe("getAll", () => {
  test("returns all root categories for the given user", async () => {
    const rootCategories = await Category.getAllRoots(ids.users[0]);

    expect(rootCategories).toEqual([
      {
        id: ids.parentCategories[0],
        label: 'cuisines',
        username: ids.users[0],
        parentId: null,
        recipes: [],
        children: [ids.categories[0]]
      },
      {
        id: ids.parentCategories[1],
        label: 'diets',
        username: ids.users[0],
        parentId: null,
        recipes: [],
        children: [ids.categories[1]]
      },
      {
        id: ids.parentCategories[2],
        label: 'courses',
        username: ids.users[0],
        parentId: null,
        recipes: [],
        children: [ids.categories[2]]
      },
      {
        id: ids.parentCategories[3],
        label: 'occasions',
        username: ids.users[0],
        parentId: null,
        recipes: [],
        children: [ids.categories[3]]
      },
    ])
  });

  test("returns an empty array if the given user does not exist", async () => {
    const rootCategories = await Category.getAllRoots(-1);
    expect(rootCategories).toEqual([]);
  })
})

/************************************** getCategorySubTree */
describe("getCategorySubTree", () => {
  test("returns category data including data for its children", async () => {

    // add 2 children to parent category
    const [child1, child2] = (await db.query(`
      INSERT INTO categories (username, label, parent_id)
      VALUES ($1, 'child 1', $2),
             ($1, 'child 2', $2)
      RETURNING id
    `, [ids.users[0], ids.categories[0]])).rows.map(c => c.id);

    const categoryData = await Category.getCategorySubTree(ids.users[0], ids.categories[0]);

    expect(categoryData).toEqual({
      id: ids.categories[0],
      label: 'italian',
      username: ids.users[0],
      parentId: ids.parentCategories[0],
      recipes: [ids.recipe],
      children: [
        {
          id: child1,
          label: 'child 1',
          username: ids.users[0],
          parentId: ids.categories[0],
          children: [],
          recipes: [],
        },
        { id: child2,
          label: 'child 2',
          username: ids.users[0],
          parentId: ids.categories[0],
          children: [],
          recipes: [],
        }
      ]
    })
  });

  test("throws NotFoundError if category is not in database", async () => {
    try {
      await Category.getCategorySubTree(ids.users[0], -1);
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundError);
    }
  })
})

/************************************** getRootIds */
describe("getAllRootIds", () => {
  test("returns a list of root ids for the given user", async () => {
    const rootIds = await Category.getRootIds(ids.users[0]);
    expect(rootIds).toEqual(ids.parentCategories);
  });

  test("returns empty list for if user does not exist", async () => {
    const rootIds = await Category.getRootIds(-1);
    expect(rootIds).toHaveLength(0);
  })
});

/************************************** getCategoryTrees */
describe("getCategoryTrees", () => {
  test("returns a list of all recipe categories for the given user", async () => {
    const categories = await Category.getCategoryTrees(ids.users[0]);

    expect(categories).toEqual([
      {
        id: ids.parentCategories[0],
        label: 'cuisines',
        username: ids.users[0],
        parentId: null,
        recipes: [],
        children: [
          {
            id: ids.categories[0],
            label: 'italian',
            username: ids.users[0],
            parentId: ids.parentCategories[0],
            children: [],
            recipes: [ids.recipe]
          }
        ]
      },
      {
        id: ids.parentCategories[1],
        label: 'diets',
        username: ids.users[0],
        parentId: null,
        recipes: [],
        children: [
          {
            id: ids.categories[1],
            label: 'vegan',
            username: ids.users[0],
            parentId: ids.parentCategories[1],
            children: [],
            recipes: [ids.recipe]
          }
        ]
      },
      {
        id: ids.parentCategories[2],
        label: 'courses',
        username: ids.users[0],
        parentId: null,
        recipes: [],
        children: [
          {
            id: ids.categories[2],
            label: 'dinner',
            username: ids.users[0],
            parentId: ids.parentCategories[2],
            children: [],
            recipes: [ids.recipe]
          }
        ]
      },
      {
        id: ids.parentCategories[3],
        label: 'occasions',
        username: ids.users[0],
        parentId: null,
        recipes: [],
        children: [
          {
            id: ids.categories[3],
            label: 'thanksgiving',
            username: ids.users[0],
            parentId: ids.parentCategories[3],
            children: [],
            recipes: [ids.recipe]
          }
        ]
      },
    ])
  })
})


/************************************** update */
describe("update", () => {

  test("updates the label and parentId given its id and returns the updated category: { id, label, username, parentId }", async () => {

    // ids.categories[0] has parentId: ids.parentCategories[0]
    // change parent to ids.parentCategories[1]
    const data = {
      label: 'updated label',
      parentId: ids.parentCategories[1]
    };

    const updated = await Category.update(ids.users[0], ids.categories[0], data);

    expect(updated).toEqual({
      id: ids.categories[0],
      label: 'updated label',
      username: ids.users[0],
      parentId: ids.parentCategories[1]
    });

    const numChildren = (await db.query(`
      SELECT id FROM categories
      WHERE parent_id = $1
    `, [ids.parentCategories[1]])).rows.length;

    expect(numChildren).toEqual(2);
  });

  test("throws BadRequestError on creating duplicate label in parent category", async () => {

    const data = {
      label: 'dinner',
      parentId: ids.parentCategories[2]
    };

    try {
      await Category.update(ids.users[0], ids.categories[0], data)
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestError);
    }
  });

  test("throws NotFoundError if category is not in database", async () => {
    try {
      await Category.update(ids.users[0], -1, { label: 'new label'});
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundError);
    }
  });

  test("throws ForbiddenError if attempting to update default root category", async () => {
    const data = {
      label: 'dinner',
      parentId: ids.parentCategories[2]
    };
    
    try {
      await Category.update(ids.users[0], ids.parentCategories[0], data);
    } catch (err) {
      console.error(err)
      expect(err).toBeInstanceOf(ForbiddenError);
    }
  })

});

/************************************** remove */
describe("remove", () => {

  test("removes a category from the database given its id", async () => {

    const numCategoriesBeforeRemove = (await db.query(`
      SELECT * FROM categories
    `)).rows.length;

    await Category.remove(ids.users[0], ids.categories[0]);

    const numCategoriesAfterRemove = (await db.query(`
      SELECT * FROM categories
    `)).rows.length;
    
    expect(numCategoriesAfterRemove).toEqual(numCategoriesBeforeRemove - 1);

  });

  test("throws NotFoundError if category not in database", async () => {
    try {
      await Category.remove(ids.users[0], -1);
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundError);
    }
  });

  test("throws ForbiddenError if attempting to delete default root category", async () => {
    try {
      await Category.remove(ids.users[0], ids.parentCategories[0]);
    } catch (err) {
      expect(err).toBeInstanceOf(ForbiddenError);
    }
  });

});

/************************************** addRecipe */
describe("addRecipe", () => {

  test("adds recipe to category", async () => {
    await Category.addRecipe(ids.users[0], ids.parentCategories[0], ids.recipe);

    const dbRes = await db.query(`
      SELECT recipe_id, category_id
      FROM recipes_categories
      WHERE recipe_id = $1 AND category_id = $2
    `, [ids.recipe, ids.parentCategories[0]])

    expect(dbRes.rows.length).toEqual(1)
  });

  test("throws NotFoundError if recipe not found", async () => {
    try {
      await Category.addRecipe(ids.users[0], ids.parentCategories[0], -1)
    } catch (err) {
      console.log(err)
      expect(err).toBeInstanceOf(NotFoundError);
    }
  });

  test("throws NotFoundError if user not found", async () => {
    try {
      await Category.addRecipe(-1, ids.parentCategories[0], ids.recipe)
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundError);
    }
  });

  test("throws NotFoundError if category not found", async () => {
    try {
      await Category.addRecipe(ids.users[0], -1, ids.recipe)
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundError);
    }
  });

});

/************************************** getDefaultCategoryIds */
describe("getDefaultCategoryIds", () => {
  test("returns the ids for the default categories as an array", async () => {
    const catIds = await Category.getDefaultCategoryIds(ids.users[0]);
    expect(new Set(catIds)).toEqual(new Set(ids.parentCategories))
  });
})