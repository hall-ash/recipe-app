"use strict";

const Recipe = require('./recipe');
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

let recipeIds;
beforeAll(async () => {
// add more recipes to filter
  recipeIds = (await db.query(`
    INSERT INTO recipes
    (title, username, url, source_name, image) 
    VALUES ('a: test recipe', 'u1', 'recipeA.com', 'sourceAB', 'rA.jpeg'),
           ('b: test recipe', 'u1', 'recipeB.com', 'sourceAB', 'rB.jpeg'),
           ('z: test recipe', 'u1', 'recipeZ.com', 'sourceZ', 'rZ.jpeg')
    RETURNING id
  `)).rows.map(r => r.id);

  // add a category with no recipes
  await db.query(`
    INSERT INTO categories
    (label, parent_id, username) VALUES ('brunch', $1, $2)
  `, [ids.parentCategories[2], ids.users[0]]);
  
  // add category to recipe
  await db.query(`
    INSERT INTO recipes_categories
    (recipe_id, category_id)
    VALUES (${recipeIds[0]}, ${ids.categories[0]}),
           (${recipeIds[2]}, ${ids.categories[0]})
  `);

});

/************************************** _getIngredients */
describe("_getIngredients", () => {

  test("returns the ingredients for the given recipe", async () => {
    const ingredients = await Recipe._getIngredients(ids.recipe);

    expect(ingredients).toEqual(
      [
        {
          id: expect.any(Number),
          recipeId: ids.recipe,
          unitId: ids.unit,
          label: 'ingredient 1',
          ordinal: 1,
          metricAmount: '200',
          usAmount: '8',
        },
        {
          id: expect.any(Number),
          recipeId: ids.recipe,
          unitId: ids.unit,
          label: 'ingredient 2',
          ordinal: 2,
          metricAmount: '200',
          usAmount: '8',
        },
        {
          id: expect.any(Number),
          recipeId: ids.recipe,
          unitId: ids.unit,
          label: 'ingredient 3',
          ordinal: 3,
          metricAmount: '200',
          usAmount: '8',
        },
      ],
    );

  });
});

/************************************** _getInstructions */
describe("_getInstructions", () => {

  test("returns the instructions for the given recipe", async () => {
    const instructions = await Recipe._getInstructions(ids.recipe);

    expect(instructions).toEqual([
      {
        id: expect.any(Number),
        recipeId: ids.recipe,
        ordinal: 1,
        step: 'step 1',
      },
      {
        id: expect.any(Number),
        recipeId: ids.recipe,
        ordinal: 2,
        step: 'step 2',
      },
      {
        id: expect.any(Number),
        recipeId: ids.recipe,
        ordinal: 3,
        step: 'step 3',
      },
    ]);

  });
});

/************************************** get */
describe("get", () => {
  test("returns the recipe object given its id", async () => {

    const recipe = await Recipe.get(ids.users[0], ids.recipe);

    expect(recipe).toEqual({
      id: ids.recipe,
      username: ids.users[0],
      title: 'test recipe',
      url: 'recipe.com',
      sourceName: 'source name',
      image: 'recipe.jpeg',
      servings: 1,
      notes: 'recipe notes',
      editedAt: null,
      isFavorite: false,
      createdAt: expect.any(Date),
      instructions: [
        {
          id: expect.any(Number),
          recipeId: ids.recipe,
          ordinal: 1,
          step: 'step 1',
        },
        {
          id: expect.any(Number),
          recipeId: ids.recipe,
          ordinal: 2,
          step: 'step 2',
        },
        {
          id: expect.any(Number),
          recipeId: ids.recipe,
          ordinal: 3,
          step: 'step 3',
        },
      ],
      ingredients: [
        {
          id: expect.any(Number),
          recipeId: ids.recipe,
          unitId: ids.unit,
          label: 'ingredient 1',
          ordinal: 1,
          metricAmount: '200',
          usAmount: '8',
        },
        {
          id: expect.any(Number),
          recipeId: ids.recipe,
          unitId: ids.unit,
          label: 'ingredient 2',
          ordinal: 2,
          metricAmount: '200',
          usAmount: '8',
        },
        {
          id: expect.any(Number),
          recipeId: ids.recipe,
          unitId: ids.unit,
          label: 'ingredient 3',
          ordinal: 3,
          metricAmount: '200',
          usAmount: '8',
        },
      ],
    });

  });

  test("throws NotFoundError if recipe is not in database", async () => {
    try {
      await Recipe.get(ids.users[0], -1);
    } catch(err) {
      expect(err).toBeInstanceOf(NotFoundError);
    }
  });

  test("throws NotFoundError if username not in database", async () => {
    try {
      await Recipe.get(-1, ids.recipe);
    } catch(err) {
      expect(err).toBeInstanceOf(NotFoundError);
    }
  })
});

/************************************** create */
describe("create", () => {
 
  const recipeData = {
    title: 'Slow Cooker Honey Garlic Chicken',
    sourceUrl: 'https://www.wellplated.com/slow-cooker-honey-garlic-chicken/',
    sourceName: 'Well Plated',
    image: 'https://spoonacular.com/recipeImages/1084395-556x370.jpg',
    servings: 4,
    instructions: [
      'Place the chicken in the bottom of a 6-quart or larger slow cooker. In a medium mixing bowl or very large measuring cup, whisk together the soy sauce, honey, tomato paste, chili paste, garlic, and rice vinegar. Pour over the chicken. Cover and cook on LOW for 4 to 5 hours or HIGH for 2 to 3 hours, until the chicken reaches an internal temperature of 165 degrees F on an instant-read thermometer. If you are available, flip the chicken over once halfway through to coat both sides. (If not, dont stress; it will still be tasty.)',
      "Remove the chicken to a plate and let cool slightly. Whisk the cornstarch into the slow cooker cooking liquid. Cover and cook on HIGH for 15 minutes, until the sauce thickens slightly, stirring occasionally. If you'd like the sauce particularly thick, you can cook it for a full 30 minutes in the slow cooker OR follow the stovetop method below.",
      'For quicker sauce thickening, reduce the sauce on the stove: After whisking in the cornstarch, transfer the cooking liquid to a medium saucepan. Cook on the stovetop over medium heat, stirring often until the sauce thickens, 5 to 10 minutes. (If your slow cooker insert is stovetop safe, you can remove it from the slow cooker and place it directly on the burner, but do not do this unless you are POSITIVE your insert is stovetop safe or it may crack.)',
      'With two forks (or your fingers if the chicken is cool enough), shred the chicken and place it in the slow cooker. If you reduced the sauce on the stove, add it back to the slow cooker now. Stir to coat the chicken with the sauce. Serve over rice, sprinkled with green onions and sesame seeds.',
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

  test("adds the recipe created from the given url to the database and returns a recipe object", async () => {
    const recipe = await Recipe.create(ids.users[0], recipeData);
    
    expect(recipe).toEqual({
      id: expect.any(Number),
      username: ids.users[0],
      title: 'Slow Cooker Honey Garlic Chicken',
      url: 'https://www.wellplated.com/slow-cooker-honey-garlic-chicken/',
      sourceName: 'Well Plated',
      image: 'https://spoonacular.com/recipeImages/1084395-556x370.jpg',
      servings: 4,
      notes: null,
      isFavorite: false,
      editedAt: null,
      createdAt: expect.any(Date),
      instructions: [
        {
          id: expect.any(Number),
          recipeId: expect.any(Number),
          ordinal: 1,
          step: 'Place the chicken in the bottom of a 6-quart or larger slow cooker. In a medium mixing bowl or very large measuring cup, whisk together the soy sauce, honey, tomato paste, chili paste, garlic, and rice vinegar. Pour over the chicken. Cover and cook on LOW for 4 to 5 hours or HIGH for 2 to 3 hours, until the chicken reaches an internal temperature of 165 degrees F on an instant-read thermometer. If you are available, flip the chicken over once halfway through to coat both sides. (If not, dont stress; it will still be tasty.)',
        },
        {
          id: expect.any(Number),
          recipeId: expect.any(Number),
          ordinal: 2,
          step: "Remove the chicken to a plate and let cool slightly. Whisk the cornstarch into the slow cooker cooking liquid. Cover and cook on HIGH for 15 minutes, until the sauce thickens slightly, stirring occasionally. If you'd like the sauce particularly thick, you can cook it for a full 30 minutes in the slow cooker OR follow the stovetop method below.",
        },
        {
          id: expect.any(Number),
          recipeId: expect.any(Number),
          ordinal: 3,
          step: 'For quicker sauce thickening, reduce the sauce on the stove: After whisking in the cornstarch, transfer the cooking liquid to a medium saucepan. Cook on the stovetop over medium heat, stirring often until the sauce thickens, 5 to 10 minutes. (If your slow cooker insert is stovetop safe, you can remove it from the slow cooker and place it directly on the burner, but do not do this unless you are POSITIVE your insert is stovetop safe or it may crack.)',
        },
        {
          id: expect.any(Number),
          recipeId: expect.any(Number),
          ordinal: 4,
          step: 'With two forks (or your fingers if the chicken is cool enough), shred the chicken and place it in the slow cooker. If you reduced the sauce on the stove, add it back to the slow cooker now. Stir to coat the chicken with the sauce. Serve over rice, sprinkled with green onions and sesame seeds.',
        },
      ],
      ingredients: [
        {
          id: expect.any(Number),
          recipeId: expect.any(Number),
          unitId: expect.any(Number),
          ordinal: 1,
          label: 'chicken',
          usAmount: '1.5',
          metricAmount: '680.389',
        },
        {
          id: expect.any(Number),
          recipeId: expect.any(Number),
          unitId: expect.any(Number),
          ordinal: 2,
          label: 'sauce',
          usAmount: '0.333',
          metricAmount: '78.863',
        },
        {
          id: expect.any(Number),
          recipeId: expect.any(Number),
          unitId: expect.any(Number),
          ordinal: 3,
          label: 'honey',
          usAmount: '0.333',
          metricAmount: '78.863',
        },
      ],
    })
  })
})

/************************************** update */
describe("update", () => {
  
  test("updates the edited_at column and does not change the created_at column", async () => {
    const recipe = (await db.query(`
      SELECT edited_at, created_at FROM recipes
      WHERE id = ${ids.recipe}
    `)).rows[0];

    expect(recipe.edited_at).toBeNull(); // recipe has not been edited yet
    expect(recipe.created_at).toEqual(expect.any(Date));

    // update recipe
    const data = {
      title: 'new title',
    }
    const updatedRecipe = await Recipe.update(ids.users[0], ids.recipe, data);

    expect(updatedRecipe.editedAt).toEqual(expect.any(Date));
    expect(updatedRecipe.createdAt).toEqual(recipe.created_at); // check that created at remains unchanged
    expect(updatedRecipe.createdAt).not.toEqual(updatedRecipe.editedAt);

  });

  test(`updates title, url, image, servings, notes in the database and returns recipe obj with
        updated values`, async () => {
    const data = {
      title: 'new title',
      url: 'newurl.com',
      sourceName: 'new source name',
      image: 'newimage.jpeg',
      servings: 100, 
      notes: 'new recipe notes',
    };

    const updatedRecipe = await Recipe.update(ids.users[0], ids.recipe, data);
  
    expect(updatedRecipe).toEqual({
      id: ids.recipe,
      username: ids.users[0],
      title: 'new title',
      url: 'newurl.com',
      sourceName: 'new source name',
      image: 'newimage.jpeg',
      servings: 100, 
      notes: 'new recipe notes',
      isFavorite: false,
      editedAt: expect.any(Date),
      createdAt: expect.any(Date),
      ingredients: [
        {
          id: ids.ingredients[0],
          recipeId: ids.recipe,
          unitId: ids.unit,
          label: 'ingredient 1',
          ordinal: 1,
          metricAmount: '200',
          usAmount: '8',
        },
        {
          id: ids.ingredients[1],
          recipeId: ids.recipe,
          unitId: ids.unit,
          label: 'ingredient 2',
          ordinal: 2,
          metricAmount: '200',
          usAmount: '8',
        },
        {
          id: ids.ingredients[2],
          recipeId: ids.recipe,
          unitId: ids.unit,
          label: 'ingredient 3',
          ordinal: 3,
          metricAmount: '200',
          usAmount: '8',
        },
      ],
      instructions: [
        {
          id: ids.instructions[0],
          recipeId: ids.recipe,
          ordinal: 1,
          step: 'step 1',
        },
        {
          id: ids.instructions[1],
          recipeId: ids.recipe,
          ordinal: 2,
          step: 'step 2',
        },
        {
          id: ids.instructions[2],
          recipeId: ids.recipe,
          ordinal: 3,
          step: 'step 3',
        },
      ],
    });
  });

  test(`updates ingredients in the database and returns the recipe obj with
        updated values`, async () => {

    const data = {
      ingredients: [
        {
          id: ids.ingredients[0],
          metricAmount: 1.1,
          usAmount: 22.22, 
        },
        {
          id: ids.ingredients[1],
          metricAmount: 333.333,
          usAmount: 4444.4444,
        },
        {
          id: ids.ingredients[2],
          metricAmount: 55555.55555,
          usAmount: 666666.666666,
        },
      ],
    };

    const updatedRecipe = await Recipe.update(ids.users[0], ids.recipe, data);

    expect(updatedRecipe).toEqual({
      id: ids.recipe,
      username: ids.users[0],
      title: 'test recipe',
      url: 'recipe.com',
      sourceName: 'source name',
      image: 'recipe.jpeg',
      servings: 1, 
      notes: 'recipe notes',
      isFavorite: false,
      editedAt: expect.any(Date),
      createdAt: expect.any(Date),
      ingredients: [
        {
          id: ids.ingredients[0],
          recipeId: ids.recipe,
          unitId: ids.unit,
          label: 'ingredient 1',
          ordinal: 1,
          metricAmount: '1.1',
          usAmount: '22.22',
        },
        {
          id: ids.ingredients[1],
          recipeId: ids.recipe,
          unitId: ids.unit,
          label: 'ingredient 2',
          ordinal: 2,
          metricAmount: '333.333',
          usAmount: '4444.4444',
        },
        {
          id: ids.ingredients[2],
          recipeId: ids.recipe,
          unitId: ids.unit,
          label: 'ingredient 3',
          ordinal: 3,
          metricAmount: '55555.55555',
          usAmount: '666666.666666',
        },
      ],
      instructions: [
        {
          id: ids.instructions[0],
          recipeId: ids.recipe,
          ordinal: 1,
          step: 'step 1',
        },
        {
          id: ids.instructions[1],
          recipeId: ids.recipe,
          ordinal: 2,
          step: 'step 2',
        },
        {
          id: ids.instructions[2],
          recipeId: ids.recipe,
          ordinal: 3,
          step: 'step 3',
        },
      ],
    });

  });

  test(`updates instructions in the database and returns the recipe obj with
        updated values`, async () => {

    const data = {
      instructions: ['new step 1', 'new step 2']
    };

    const updatedRecipe = await Recipe.update(ids.users[0], ids.recipe, data);

    expect(updatedRecipe).toEqual({
      id: ids.recipe,
      username: ids.users[0],
      title: 'test recipe',
      url: 'recipe.com',
      sourceName: 'source name',
      image: 'recipe.jpeg',
      servings: 1, 
      notes: 'recipe notes',
      isFavorite: false,
      editedAt: expect.any(Date),
      createdAt: expect.any(Date),
      ingredients: [
        {
          id: expect.any(Number),
          recipeId: ids.recipe,
          unitId: ids.unit,
          label: 'ingredient 1',
          ordinal: 1,
          metricAmount: '200',
          usAmount: '8',
        },
        {
          id: expect.any(Number),
          recipeId: ids.recipe,
          unitId: ids.unit,
          label: 'ingredient 2',
          ordinal: 2,
          metricAmount: '200',
          usAmount: '8',
        },
        {
          id: expect.any(Number),
          recipeId: ids.recipe,
          unitId: ids.unit,
          label: 'ingredient 3',
          ordinal: 3,
          metricAmount: '200',
          usAmount: '8',
        },
      ],
      instructions: [
        {
          id: ids.instructions[0],
          recipeId: ids.recipe,
          ordinal: 1,
          step: 'new step 1',
        },
        {
          id: ids.instructions[1],
          recipeId: ids.recipe,
          ordinal: 2,
          step: 'new step 2',
        },
      ],
    });

  });

});

/************************************** remove */
describe("remove", () => {

  test("removes recipe from database given recipe id", async () => {

    const totalRecipesBeforeRemove = (await db.query(`
      SELECT * FROM recipes
    `)).rows.length;

    await Recipe.remove(ids.users[0], ids.recipe);

    const totalRecipesAfterRemove = (await db.query(`
      SELECT * FROM recipes
    `)).rows.length;
    
    expect(totalRecipesAfterRemove).toEqual(totalRecipesBeforeRemove - 1);
  });

  test("throws NotFoundError if recipe does not exist in database", async () => {
    try {
      await Recipe.remove(ids.users[0], -1);
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundError);

      // check that recipe with 'recipeId' is still in db
      const afterRemove = await db.query(`
      SELECT * FROM recipes
    `);
      expect(afterRemove.rows.length).toEqual(4);
    }
  })
});

/************************************** getAll */
describe("getAll", () => {
  test("returns the filtered recipes given a string (case-insensitive, partial match) ordered by title asc", async () => {

    const filterCriteria = {
      query: ':',
      orderBy: ['title'],
      isAsc: true,
    };

    const filteredRecipes = await Recipe.getAll(ids.users[0], filterCriteria);

    expect(filteredRecipes).toEqual([
      {
        id: recipeIds[0],
        title: 'a: test recipe',
        url: 'recipeA.com',
        source_name: 'sourceAB',
        image: 'rA.jpeg',
        servings: 1,
        created_at: expect.any(Date),
        edited_at: null,
      },
      {
        id: recipeIds[1],
        title: 'b: test recipe',
        url: 'recipeB.com',
        image: 'rB.jpeg',
        source_name: 'sourceAB',
        servings: 1,
        created_at: expect.any(Date),
        edited_at: null,
      },
      {
        id: recipeIds[2],
        title: 'z: test recipe',
        url: 'recipeZ.com',
        source_name: 'sourceZ',
        image: 'rZ.jpeg',
        servings: 1,
        created_at: expect.any(Date),
        edited_at: null,
      }
    ]);

  });

  test("returns the filtered recipes given a string (case-insensitive, partial match) ordered by title desc", async () => {

    const filterCriteria = {
      query: ':',
      orderBy: ['title'],
      isAsc: false,
    };

    const filteredRecipes = await Recipe.getAll(ids.users[0], filterCriteria);

    expect(filteredRecipes).toEqual([
      {
        id: recipeIds[2],
        title: 'z: test recipe',
        url: 'recipeZ.com',
        source_name: 'sourceZ',
        image: 'rZ.jpeg',
        servings: 1,
        created_at: expect.any(Date),
        edited_at: null,
      },
      {
        id: recipeIds[1],
        title: 'b: test recipe',
        url: 'recipeB.com',
        source_name: 'sourceAB',
        image: 'rB.jpeg',
        servings: 1,
        created_at: expect.any(Date),
        edited_at: null,
      },
      {
        id: recipeIds[0],
        title: 'a: test recipe',
        url: 'recipeA.com',
        source_name: 'sourceAB',
        image: 'rA.jpeg',
        servings: 1,
        created_at: expect.any(Date),
        edited_at: null,
      },
    ]);

  });

  test("returns all user recipes if no search query is provided", async () => {

    const recipes = await Recipe.getAll(ids.users[0]);

    expect(recipes).toHaveLength(4); 
  });

});

/************************************** toggleFavorite */
describe("toggleFavorite", () => {

  test("sets is_favorite: false => true", async () => {
    const isFavoriteBeforeToggle = (await db.query(`
      SELECT is_favorite FROM recipes
      WHERE id = ${ids.recipe}
    `)).rows[0].is_favorite;

    expect(isFavoriteBeforeToggle).toBe(false);

    await Recipe.toggleFavorite(ids.users[0], ids.recipe);

    const isFavoriteAfterToggle = (await db.query(`
      SELECT is_favorite FROM recipes
      WHERE id = ${ids.recipe}
    `)).rows[0].is_favorite;

    expect(isFavoriteAfterToggle).toBe(true);
  });

  test("sets is_favorite: true => false", async () => {

    // set is_favorite to true
    await db.query(`
      UPDATE recipes SET is_favorite = true
      WHERE id = ${ids.recipe};
    `);

    const isFavoriteBeforeToggle = (await db.query(`
      SELECT is_favorite FROM recipes
      WHERE id = ${ids.recipe}
    `)).rows[0].is_favorite;

    expect(isFavoriteBeforeToggle).toBe(true);

    await Recipe.toggleFavorite(ids.users[0], ids.recipe);

    const isFavoriteAfterToggle = (await db.query(`
      SELECT is_favorite FROM recipes
      WHERE id = ${ids.recipe}
    `)).rows[0].is_favorite;

    expect(isFavoriteAfterToggle).toBe(false);
  });

  test("throws NotFoundError if recipe not found", async () => {
    try {
      await Recipe.toggleFavorite(ids.users[0], -1);
    } catch (e) {
      expect(e).toBeInstanceOf(NotFoundError);
    }
  })
 
});