/**
 * Recipe model
 */

 "use strict";

 const db = require('../database/db');
 const _ = require('lodash');
 const { sqlForPartialUpdate, checkDuplicate, recordExists, sqlForFilterBy } = require('../helpers/sql');
 const { 
   NotFoundError,
   BadRequestError,
   UnauthorizedError,
 } = require('../expressError');
const Ingredient = require('./ingredient');
const Instruction = require('./instruction');
const Category = require('./category');
const Unit = require('./unit');

class Recipe {

  static get publicFields() {
    return `id, 
            username, 
            title, 
            url, 
            source_name AS "sourceName",
            image, 
            servings, 
            notes,
            edited_at AS "editedAt",
            created_at AS "createdAt",
            is_favorite AS "isFavorite"
            `;
  }

  // extract recipe info from api
  // const { 
  //   title,
  //   servings,
  //   sourceUrl,
  //   image,
  //   ingredients,
  //   instructions,
  //   cuisines,
  //   diets,
  //   courses,
  //   occasions
  // } = await extractRecipeInfo(url);

  /**
   * Create a recipe.
   * 
   * @param {*} username 
   * @param {Object} recipeData  
   * @returns {Promise<object>} { id, title, url, sourceName, image, servings, notes, editedAt, createdAt, isFavorite
   *                              instructions, ingredients }
   */
  static async create(username, { title, servings, sourceUrl, sourceName, image, ingredients,
  instructions, cuisines, diets, courses, occasions }) 
  {

    // create recipe 
    const recipe = (await db.query(`
      INSERT INTO recipes
      (title, url, source_name, image, servings, username)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING ${Recipe.publicFields}
    `, [title, sourceUrl, sourceName, image, servings, username])).rows[0];

    // create units if necessary
    const unitValues = ingredients.map(({ metricUnit, usUnit }) => ({ metricUnit, usUnit }));
    await Unit.createBatch(unitValues);
    
    // get array of unit ids
    const unitIds = await Unit.getIds(unitValues);

    // add 'unitId' prop to each ingredient obj
    const ingredientsWithUnitIds = ingredients.map(({ label, usAmount, metricAmount }, i) => {
      return { label, usAmount, metricAmount, unitId: unitIds[i] };
    });

    // create instructions 
    recipe.instructions = await Instruction.create(recipe.id, instructions);

    // create ingredients 
    recipe.ingredients = await Ingredient.create(recipe.id, ingredientsWithUnitIds);
   
    // get default category ids for user
    // must be in order: cuisines, diets, courses, occasions
    const [cuisinesId, dietsId, coursesId, occasionsId] = await Category.getDefaultCategoryIds(username);

    // create categories if necessary
    // and add to recipe
    await Promise.all([
      this._createAndAddCategories(recipe.id, username, cuisines, cuisinesId),
      this._createAndAddCategories(recipe.id, username, diets, dietsId),
      this._createAndAddCategories(recipe.id, username, courses, coursesId),
      this._createAndAddCategories(recipe.id, username, occasions, occasionsId),
    ]);
    
    return recipe;
  }

  static async _getInstructions(recipeId) {
    const instructions = await db.query(`
      SELECT id,
             recipe_id AS "recipeId", 
             ordinal, 
             step 
      FROM instructions
      WHERE recipe_id = $1
      ORDER BY ordinal
    `, [recipeId]);
    return instructions.rows;
  }

  static async _getIngredients(recipeId) {
    const ingredients = await db.query(`
      SELECT id,
            recipe_id AS "recipeId", 
            unit_id AS "unitId", 
            label, 
            ordinal, 
            metric_amount AS "metricAmount", 
            us_amount AS "usAmount"
      FROM ingredients
      WHERE recipe_id = $1
      ORDER BY ordinal
    `, [recipeId]);
    return ingredients.rows;
  }

  /**
   * Get a recipe from its id.
   * 
   * @param {Number} recipeId
   * @returns {Promise<object>} recipe - { id, title, url, image, 
   *                                       servings, notes, isFavorite
   *                                       editedAt, createdAt, ingredients,
   *                                       instructions } 
   * @throws {NotFoundError} Recipe must exist in the database.
   */
  static async get(username, recipeId) {

    const recipe = (await db.query(`
      SELECT ${Recipe.publicFields}
      FROM recipes
      WHERE id = $1 AND username = $2
    `, [recipeId, username])).rows[0];

    if (!recipe) throw new NotFoundError('Recipe not found.')

    recipe.instructions = await this._getInstructions(recipeId)
    recipe.ingredients = await this._getIngredients(recipeId);
    // recipe.categories = await this._getCategories(recipeId);

    return recipe;
  }

  /**
   * Retrieves all user recipes. If a query string is provided, retrieves recipes
   * whose title, category, source name, and/or ingredient match (partial, case-insensitive) 
   * the query.
   * 
   * @param {String} username 
   * 
   * @param {Object} filterCriteria - { query, orderBy, isAsc } 
   *                 query - search query
   *                 orderBy - array of columns to order results by (can be in snake or camel case)
   *                    possible columns: ['title', 'edited_at', 'created_at', 'source_name']
   *                 isAsc - if true order by asc, if false order by desc
   * 
   * @returns {Promise<object>} [{ id, title, url, source_name, image, servings, created_at, edited_at }, ...] 
   *                            Object properties are returned in snake case.
   * 
   * Example: 
   * filterCriteria = { query: 'string-to-match', orderBy: ['title', 'editedAt'], isAsc: false }
   * Returns results matching 'string-to-match' ordered by title, edited_at DESC
   */
  static async getAll(username, { query, orderBy, isAsc }={}) {

    // use r as recipes alias to facilitate table joins
    const fieldsToSelect = `r.id, 
                            r.title, 
                            r.url, 
                            r.source_name AS "source_name", 
                            r.image, 
                            r.servings, 
                            r.created_at AS "created_at", 
                            r.edited_at AS "edited_at"`;

    let selectStatement;
    const values = [username]; // values for where clause

    if (query) {
      selectStatement = Recipe._getSqlToFilter(fieldsToSelect);
      values.push('%' + query + '%'); // query must be 2nd value
    
    } else {  // no query string provided, retrieve all user recipes
      selectStatement = `SELECT ${fieldsToSelect} 
                         FROM recipes AS r
                         WHERE username = $1`;
    }

    // returns empty string if no args provided
    const orderByClause = Recipe._getOrderByClause(orderBy, isAsc);

    const userRecipes = await db.query(`
      ${selectStatement}
      ${orderByClause}
    `, [...values]);

    return userRecipes.rows;
  }

  /**
   * Returns sql to select recipes whose title, category, source name and/or ingredient match a string.
   * The match is partial and case-insensitive.
   * 
   * @pre Assumes the following values will be provided for the where clause in this order: [username, string-to-match]
   *  
   * @param {String} fieldsToSelect - The table columns to retrieve from the select statement.
   * 
   * @returns {String} The sql statement to select the matching recipes. 
   */
  static _getSqlToFilter(fieldsToSelect) {

    return `
      SELECT ${fieldsToSelect}
        FROM recipes AS r
        JOIN recipes_categories AS rc
        ON r.id = rc.recipe_id
        JOIN categories AS c
        ON rc.category_id = c.id
        WHERE c.label ILIKE $2 AND r.username = $1
      UNION 
      SELECT ${fieldsToSelect}
        FROM recipes AS r
        JOIN ingredients AS i
        ON r.id = i.recipe_id
        WHERE i.label ILIKE $2 AND r.username = $1
      UNION 
      SELECT ${fieldsToSelect}
        FROM recipes AS r
        WHERE (title ILIKE $2 OR source_name ILIKE $2) AND (username = $1)
    `

  }

  /**
   * Returns an ORDER BY clause to sort recipe results.
   * 
   * @param {Array<string>} orderBy Columns in recioes table to order results by.
   * @param {Boolean} isAsc - if true order by asc, if false order by desc
   * @returns {String}
   */
  static _getOrderByClause(orderBy=[], isAsc) {
    const validCols = ['title', 'edited_at', 'created_at', 'source_name'];
    
    const criteria = orderBy.map(col => _.snakeCase(col)) // convert col names to snake case 
                            .filter(col => validCols.includes(col)) // filter invalid cols

    return criteria.length ? 
      `ORDER BY ${criteria.join(', ')} ${isAsc ? 'ASC' : 'DESC'}` : '';
  }

  /**
   * Sets the is_favorite column for the recipe from: is_favorite => !is_favorite
   * 
   * @param {String} username 
   * @param {Number} recipeId 
   * @post is_favorite column is updated from: is_favorite => !is_favorite
   */ 
  static async toggleFavorite(username, recipeId) {
    

    const recipe = (await db.query(`
      SELECT id, is_favorite FROM recipes
      WHERE id = $1 AND username = $2
    `, [recipeId, username])).rows[0];

    if (!recipe) throw new NotFoundError(`Recipe id ${recipeId} could not be found for ${username}`);

    const isFavorite = recipe.is_favorite;

    await db.query(`
      UPDATE recipes 
      SET is_favorite = $1
    `, [!isFavorite]);
    
  }


  /**
   * Update the given recipe.
   * 
   * @param {Number} recipeId 
   * @param {Object} data - can include { title, url, sourceName, image, servings, notes, instructions, ingredients }
   *                        instructions: [step1, step2, ...]
   *                        ingredients: [{ id, usAmount, metricAmount }, ...]
   * @returns {Promise<object>} updatedRecipe - { id, username, title, url, sourceName, image, servings, notes, 
   *                                              editedAt, createdAt, isFavorite, ingredients, instructions }
   * @throws {BadRequestError} Data must be provided for update.
   */
  static async update(username, recipeId, data) {
    if (!Object.keys(data).length) throw new BadRequestError('No data was provided for recipe update.');

    // delete instructions and ingredients prop, so they aren't
    // included in the query to update the recipe record
    const { instructions, ingredients } = data;
    delete data.instructions;
    delete data.ingredients;

    // update recipe
    let recipeResult;
    if (Object.keys(data).length) { // update recipes table

      const jsToSql = { sourceName: 'source_name' };
      const { setCols, values } = sqlForPartialUpdate(data, jsToSql);
      const recipeIdx = '$' + (values.length + 1);
      const usernameIdx = '$' + (values.length + 2);

      recipeResult = await db.query(`
        UPDATE recipes
        SET ${setCols}
        WHERE id = ${recipeIdx} AND username = ${usernameIdx}
        RETURNING ${this.publicFields}
      `, [...values, recipeId, username]);

    } else { // only updating instructions and/or ingredients, update edited_at
      recipeResult = await db.query(`
        UPDATE recipes
        SET edited_at = (to_timestamp(${Date.now()} / 1000.0))
        WHERE id = $1 AND username = $2
        RETURNING ${this.publicFields}
      `, [recipeId, username]);
    }

    const recipe = recipeResult.rows[0];
    if (!recipe) throw new NotFoundError('Recipe not found.');

    // update instructions
    recipe.instructions = instructions && instructions.length ? 
     await Instruction.update(recipeId, instructions) :
     await this._getInstructions(recipeId);

    // update ingredients
    recipe.ingredients = ingredients && ingredients.length ?
      await Ingredient.updateAmounts(ingredients) :
      await this._getIngredients(recipeId);

    return recipe;
  }

  /**
   * Remove the given recipe from the database.
   * 
   * @param {String} username
   * @param {Number} recipeId
   * @throws {NotFoundError} Recipe must exist.
   */
  static async remove(username, recipeId) {

    const recipe = (await db.query(`
      DELETE
      FROM recipes
      WHERE id = $1 AND username = $2
      RETURNING id
    `, [recipeId, username])).rows[0];

    if (!recipe) throw new NotFoundError('Recipe not found.')
  }

  /**
   * Add categories to the given recipe from the list of category labels.
   * 
   * If a category already exists in the parent category,
   * the category will not be created. If the category
   * does not exist, it will be created under the given parent category. 
   * All categories will be added to the recipe.
   * 
   * @param {String} username
   * @param {Object} data - { categoryLabels: [l1, l2, ...], parentId }
   */
  static async _createAndAddCategories(recipeId, username, labels, parentId) {
    if (!labels.length) return [];

    // get list of categories in the parent category that match label in labels
    const preexistingCats = (await Promise.all(labels.map(label => {
      return db.query(`
        SELECT id FROM categories
        WHERE parent_id = $1 AND label = $2
      `, [parentId, label]);
    }))).map(dbRes => dbRes.rows[0]);

    // filter out undefined values and get array of category ids
    const preexistingCatIds = preexistingCats.filter(cat => cat).map(cat => cat.id)
    
    // get labels that returned undefined in preexistingCats (if undefined, the category has not been created)
    const labelsToCreateCats = labels.filter((label, i) => !preexistingCats[i]);
    
    // no new categories to create
    if (!labelsToCreateCats.length && preexistingCatIds.length) {
      // add preexisting categories to the recipe
      await this._addCategories(recipeId, preexistingCatIds);
      return;
    }

    // build param string: ($1, ${length + 1}, ${length + 2})), ...
    const length = labelsToCreateCats.length;
    const paramStr = Array.from({ length }, (v, i) => {
      return `($${i + 1}, $${length + 1}, $${length + 2})`
    }).join(', ');
   
    // create categories from labels that were not in the parent category
    const createdCategoryIds = (await db.query(`
      INSERT INTO categories (label, parent_id, username) 
      VALUES ${paramStr}
      RETURNING id
    `, [...labelsToCreateCats, parentId, username])).rows.map(cat => cat.id);

    // add preexisting categories and newly created categories to recipe
    await this._addCategories(recipeId, [...preexistingCatIds, ...createdCategoryIds]);
  }


  /**
   * Add a batch of categories to the given recipe.
   * 
   * @pre Recipe and catgories exist in the database.
   * @param {Number} recipeId 
   * @param {Array<number>} categoryIds - [catId1, catId2, ...]
   */
  static async _addCategories(recipeId, categoryIds) {
    if (!categoryIds.length) return [];

    // build param string: ($1, $(length + 1)), ($2, $(length + 1), ... 
    const length = categoryIds.length;
    const paramStr = Array.from({ length }, (v, i) => `($${i + 1}, $${length + 1})`).join(', ');

    // add categories to recipe
    await db.query(`
      INSERT INTO recipes_categories
      (category_id, recipe_id) VALUES ${paramStr}
    `, [...categoryIds, recipeId]);

  }
  


} // end Recipe class

module.exports = Recipe;