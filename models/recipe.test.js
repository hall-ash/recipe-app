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


/************************************** get */

describe("get", () => {
  test("returns the recipe object given its id", async () => {

    const recipe = await Recipe.get(ids.recipe);

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
            },
          },
        },
        {
          id: expect.any(Number),
          recipeId: ids.recipe,
          label: 'ingredient 2',
          baseFood: null,
          ordinal: 2,
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
            },
          },
        },
        {
          id: expect.any(Number),
          recipeId: ids.recipe,
          label: 'ingredient 3',
          baseFood: null,
          ordinal: 3,
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
            },
          },
        },
      ],
    });

  });

  test("throws NotFoundError if recipe is not in database", async () => {
    try {
      await Recipe.get(-1);
    } catch(err) {
      expect(err).toBeInstanceOf(NotFoundError);
    }
  });

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
        baseFood: 'chicken',
        measures: [
          {
            amount: 1.5,
            unit: 'lb',
            unitType: 'us',
          },
          {
            amount: 680.389,
            unit: 'g',
            unitType: 'metric',
          },
        ]
      },
      {
        label: 'sauce',
        baseFood: 'sauce',
        measures: [
          {
            amount: 0.333,
            unit: 'cups',
            unitType: 'us',
          },
          {
            amount: 78.863,
            unit: 'ml',
            unitType: 'metric',
          },
        ]
      },
      {
        label: 'honey',
        baseFood: 'honey',
        measures: [
          {
            amount: 0.333,
            unit: 'cups',
            unitType: 'us',
          },
          {
            amount: 78.863,
            unit: 'ml',
            unitType: 'metric',
          },
        ]
      },
    ],
    cuisines: [],
    diets: [],
    courses: ['dinner', 'main course'],
    occasions: [],
  }

  test("creates a recipe and returns a recipe object", async () => {
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
          ordinal: 1,
          label: 'chicken',
          baseFood: 'chicken',
          measures: {
            us: {
              ingredientId: expect.any(Number),
              amount: '1.5',
              unit: 'lb',
              unitType: 'us',
            },
            metric: {
              ingredientId: expect.any(Number),
              amount: '680.389',
              unit: 'g',
              unitType: 'metric',
            },
          }
        },
        {
          id: expect.any(Number),
          recipeId: expect.any(Number),
          ordinal: 2,
          label: 'sauce',
          baseFood: 'sauce',
          measures: {
            us: {
              ingredientId: expect.any(Number),
              amount:'0.333',
              unit: 'cups',
              unitType: 'us',
            },
            metric: {
              ingredientId: expect.any(Number),
              amount: '78.863',
              unit: 'ml',
              unitType: 'metric',
            },
          },
        },
        {
          id: expect.any(Number),
          recipeId: expect.any(Number),
          ordinal: 3,
          label: 'honey',
          baseFood: 'honey',
          measures: {
            us: {
              ingredientId: expect.any(Number),
              amount:'0.333',
              unit: 'cups',
              unitType: 'us',
            },
            metric: {
              ingredientId: expect.any(Number),
              amount: '78.863',
              unit: 'ml',
              unitType: 'metric',
            },
          },
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
    const updatedRecipe = await Recipe.update(ids.recipe, data);

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

    const updatedRecipe = await Recipe.update(ids.recipe, data);
  
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
          label: 'ingredient 1',
          baseFood: null,
          ordinal: 1,
          measures: {
            us: {
              ingredientId: ids.ingredients[0],
              amount: '8',
              unit: 'oz',
              unitType: 'us',
            },
            metric: {
              ingredientId: ids.ingredients[0],
              amount: '200',
              unit: 'g',
              unitType: 'metric',
            },
          },
        },
        {
          id: ids.ingredients[1],
          recipeId: ids.recipe,
          label: 'ingredient 2',
          baseFood: null,
          ordinal: 2,
          measures: {
            us: {
              ingredientId: ids.ingredients[1],
              amount: '8',
              unit: 'oz',
              unitType: 'us',
            },
            metric: {
              ingredientId: ids.ingredients[1],
              amount: '200',
              unit: 'g',
              unitType: 'metric',
            },
          },
        },
        {
          id: ids.ingredients[2],
          recipeId: ids.recipe,
          label: 'ingredient 3',
          baseFood: null,
          ordinal: 3,
          measures: {
            us: {
              ingredientId: ids.ingredients[2],
              amount: '8',
              unit: 'oz',
              unitType: 'us',
            },
            metric: {
              ingredientId: ids.ingredients[2],
              amount: '200',
              unit: 'g',
              unitType: 'metric',
            },
          },
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
          data: {
            label: 'updated label',
            ordinal: 500,
            measure: {
              unitType: 'metric',
              measureData: {
                amount: 500,
                unit: 'kg'
              }
            }
          }
        },
        {
          id: ids.ingredients[1],
          data: {
            label: 'updated label',
            ordinal: 999,
          }
        },
        {
          id: ids.ingredients[2],
          data: {
            measure: {
              unitType: 'us',
              measureData: {
                amount: 11.11,
                unit: 'gallons'
              }
            }
          }
        },
      ],
    };

    const updatedRecipe = await Recipe.update(ids.recipe, data);

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
          label: 'updated label',
          baseFood: null,
          ordinal: 500,
          measures: {
            metric: {
              ingredientId: ids.ingredients[0],
              amount: '500',
              unit: 'kg',
              unitType: 'metric'
            },
            us: {
              ingredientId: ids.ingredients[0],
              amount: '8',
              unit: 'oz',
              unitType: 'us'
            }
          }
        },
        {
          id: ids.ingredients[1],
          recipeId: ids.recipe,
          label: 'updated label',
          baseFood: null,
          ordinal: 999,
          measures: {
            metric: {
              ingredientId: ids.ingredients[1],
              amount: '200',
              unit: 'g',
              unitType: 'metric'
            },
            us: {
              ingredientId: ids.ingredients[1],
              amount: '8',
              unit: 'oz',
              unitType: 'us'
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
              unitType: 'metric'
            },
            us: {
              ingredientId: ids.ingredients[2],
              amount: '11.11',
              unit: 'gallons',
              unitType: 'us'
            }
          },
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

    const updatedRecipe = await Recipe.update(ids.recipe, data);

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
          label: 'ingredient 1',
          baseFood: null,
          measures: {
            metric: {
              amount: '200',
              ingredientId: expect.any(Number),
              unit: 'g',
              unitType: 'metric'
            },
            us: {
              amount: '8',
              ingredientId: expect.any(Number),
              unit: 'oz',
              unitType: 'us'
            }
          },
          ordinal: 1,
        },
        {
          id: expect.any(Number),
          recipeId: ids.recipe,
          label: 'ingredient 2',
          baseFood: null,
          measures: {
            metric: {
              amount: '200',
              ingredientId: expect.any(Number),
              unit: 'g',
              unitType: 'metric'
            },
            us: {
              amount: '8',
              ingredientId: expect.any(Number),
              unit: 'oz',
              unitType: 'us'
            }
          },
          ordinal: 2,
        },
        {
          id: expect.any(Number),
          recipeId: ids.recipe,
          label: 'ingredient 3',
          baseFood: null,
          measures: {
            metric: {
              amount: '200',
              ingredientId: expect.any(Number),
              unit: 'g',
              unitType: 'metric'
            },
            us: {
              amount: '8',
              ingredientId: expect.any(Number),
              unit: 'oz',
              unitType: 'us'
            }
          },
          ordinal: 3,
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

    await Recipe.remove(ids.recipe);

    const totalRecipesAfterRemove = (await db.query(`
      SELECT * FROM recipes
    `)).rows.length;
    
    expect(totalRecipesAfterRemove).toEqual(totalRecipesBeforeRemove - 1);
  });

  test("throws NotFoundError if recipe does not exist in database", async () => {
    try {
      await Recipe.remove(-1);
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

    await Recipe.toggleFavorite(ids.recipe);

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

    await Recipe.toggleFavorite(ids.recipe);

    const isFavoriteAfterToggle = (await db.query(`
      SELECT is_favorite FROM recipes
      WHERE id = ${ids.recipe}
    `)).rows[0].is_favorite;

    expect(isFavoriteAfterToggle).toBe(false);
  });

  test("throws NotFoundError if recipe not found", async () => {
    try {
      await Recipe.toggleFavorite(-1);
    } catch (e) {
      expect(e).toBeInstanceOf(NotFoundError);
    }
  })
 
});