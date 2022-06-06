const db = require('../database/db');
const bcrypt = require('bcrypt');
const { BCRYPT_WORK_FACTOR } = require('../config');

// store ids for users, recipe, unit, ingredients, instructions, categories
const ids = {};

async function commonBeforeAll() {
  
  // clear data in tables
  const tables = [
    'users', 
    'recipes', 
    'units',
    'ingredients', 
    'instructions', 
    'categories',
    'recipes_categories',
  ];
  await Promise.all(tables.map(t => db.query(`DELETE FROM ${t}`)));

  // add users
  ids.users = (await db.query(`
    INSERT INTO users(username,
                      password,
                      first_name,
                      last_name,
                      email)
    VALUES ('u1', $1, 'U1F', 'U1L', 'u1@email.com'),
            ('u2', $2, 'U2F', 'U2L', 'u2@email.com')
    RETURNING username`,
  [
    await bcrypt.hash("password1", BCRYPT_WORK_FACTOR),
    await bcrypt.hash("password2", BCRYPT_WORK_FACTOR),
  ])).rows.map(u => u.username);

  // add a recipe
  const recipe = await db.query(`
    INSERT INTO recipes
    (title, url, source_name, image, notes, username) 
    VALUES ('test recipe', 'recipe.com', 'source name', 'recipe.jpeg', 'recipe notes', $1)
    RETURNING id
  `, [ids.users[0]]);
  ids.recipe = recipe.rows[0].id;

  // add a unit for the ingredients
  const unit = await db.query(`
    INSERT INTO units
    (metric_unit, us_unit)
    VALUES ('g', 'oz')
    RETURNING id
  `);
  ids.unit = unit.rows[0].id;

   // add ingredients
  ids.ingredients = (await db.query(`
    INSERT INTO ingredients
    (recipe_id, unit_id, label, ordinal, metric_amount, us_amount)
    VALUES ($1, $2, 'ingredient 1', 1, 200, 8),
          ($1, $2, 'ingredient 2', 2, 200, 8),
          ($1, $2, 'ingredient 3', 3, 200, 8)
    RETURNING id
 `, [ids.recipe, ids.unit])).rows.map(i => i.id);

  // add instructions 
  ids.instructions = (await db.query(`
    INSERT INTO instructions
    (recipe_id, ordinal, step)
    VALUES ($1, 1, 'step 1'),
           ($1, 2, 'step 2'),
           ($1, 3, 'step 3')
    RETURNING id
  `, [ids.recipe])).rows.map(i => i.id);

  // // add parent categories
  // ids.parentCategories = (await db.query(`
  //   INSERT INTO categories (username, label, parent_id)
  //   VALUES ($1, 'cuisines', null), 
  //          ($1, 'diets', null), 
  //          ($1, 'courses', null), 
  //          ($1, 'occasions', null)
  //   RETURNING id
  // `, [ids.users[0]])).rows.map(c => c.id);
  // get parentCategories for users[0]
  ids.parentCategories = (await db.query(`
    SELECT id FROM categories
    WHERE username = $1 AND parent_id IS NULL
  `, [ids.users[0]])).rows.map(c => c.id);
  
  // add child categories
  ids.categories = (await db.query(`
    INSERT INTO categories (username, label, parent_id)
    VALUES ($1, 'italian', ${ids.parentCategories[0]}),
           ($1, 'vegan', ${ids.parentCategories[1]}),
           ($1, 'dinner', ${ids.parentCategories[2]}),
           ($1, 'thanksgiving', ${ids.parentCategories[3]})
    RETURNING id
  `, [ids.users[0]])).rows.map(c => c.id);

  // add cats to recipe
  await db.query(`
    INSERT INTO recipes_categories
    (recipe_id, category_id)
    VALUES ($1, ${ids.categories[0]}),
           ($1, ${ids.categories[1]}),
           ($1, ${ids.categories[2]}),
           ($1, ${ids.categories[3]})
  `, [ids.recipe]);

}

async function commonBeforeEach() {
  await db.query("BEGIN");
}

async function commonAfterEach() {
  await db.query("ROLLBACK");
}

async function commonAfterAll() {
  await db.end();
}


module.exports = {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  ids,
};