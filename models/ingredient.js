/**
 * Ingredient model
 * 
 * Methods should be called from the Recipe class. 
 */

 "use strict";

 const db = require('../database/db');
 const { sqlForPartialUpdate, checkDuplicate, recordExists } = require('../helpers/sql');
 const { 
   NotFoundError,
   BadRequestError,
   UnauthorizedError,
 } = require('../expressError');

class Ingredient {

  static get publicFields() {
    return `id, 
            recipe_id AS "recipeId", 
            unit_id AS "unitId", 
            label, 
            ordinal, 
            metric_amount AS "metricAmount", 
            us_amount AS "usAmount"`
  }

  /**
   * Create a new ingredient(s) and add to the
   * end of the given recipe's ingredient list.
   * 
   * @pre Recipe must exist in database.
   * @param {Number} recipeId 
   * @param {Array<object>} ingredientData - [{ label, usAmount, metricAmount, unitId }, ...]
   * @returns {Promise<array>} ingredients - [{ id, recipeId, unitId, label, order, metricAmount, usAmount }, ...]
   */
  static async create(recipeId, ingredientData) {

    // ingredient to add will start at current ingredient count + 1
    const startingOrder = (await this._getCount(recipeId)) + 1;

    const ingredients = await Promise.all(ingredientData.map(({ label, usAmount, metricAmount, unitId } , i) => {
      return db.query(`
        INSERT INTO ingredients
        (recipe_id, unit_id, label, ordinal, metric_amount, us_amount) 
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING ${this.publicFields}
      `, [recipeId, unitId, label, startingOrder + i, metricAmount, usAmount]);
    }));

    return ingredients.map(i => i.rows[0]);
  }

  static async get(id) {
    const ingredient = (await db.query(`
      SELECT ${this.publicFields}
      WHERE id = $1
    `, [id])).rows[0];

    if (!ingredient) throw new NotFoundError(`Ingredient with id ${id} could not be found.`);

    return ingredient;
  }

  static async getAll(recipeId) {
    const ingredients = (await db.query(`
      SELECT ${this.publicFields}
      WHERE recipe_id = $1
    `, [recipeId])).rows;

    return ingredients;
  }

  /**
   * Helper method for Ingredient.create
   * Get the number of ingredients in a recipe.
   * 
   * @async
   * @param {Number} recipeId 
   * @returns {Promise<number>} ingredient count
   * @throws {NotFoundError} Recipe must exist.
   */
    static async _getCount(recipeId) {
  
      const ingredients = await db.query(`
        SELECT COUNT(*) FROM ingredients
        WHERE recipe_id = $1
      `, [recipeId]);
  
      return +ingredients.rows[0].count;
    }

  /**
   * Updates the metric and us amounts for each ingredient.
   * 
   * @pre Ingredients must exist in the database.
   * @param {Array<object>} ingredients - [{ id, usAmount, metricAmount }, ...]
   * @returns {Promise<array>} updatedIngredients - [{ id, recipeId, unitId, label, order, metricAmount, usAmount }, ...]
   */
  static async updateAmounts(ingredients) {
   
    const values = ingredients.reduce((acc, { id, usAmount, metricAmount }) => {
      acc.push(id, usAmount, metricAmount);
      return acc;
    }, []);

    // build param string: ($1, $2, $3), ($4, $5, $6), ...
    const length = ingredients.length;
    const paramStr = Array.from({ length }, (v, i) => {
      const n = i * 3;
      return `($${n + 1}::integer, $${n + 2}::numeric, $${n + 3}::numeric)`
    }).join(', ');

    const updated = await db.query(`
      UPDATE ingredients AS i
      SET
        us_amount = c.us_amount,
        metric_amount = c.metric_amount
      FROM (VALUES ${paramStr})
      AS c (id, us_amount, metric_amount)
      WHERE c.id = i.id
      RETURNING i.id, 
                i.recipe_id AS "recipeId",
                i.unit_id AS "unitId",
                i.label,
                i.ordinal,
                i.metric_amount AS "metricAmount",
                i.us_amount AS "usAmount"
    `, [...values])

    return updated.rows;
  }

  /**
   * Remove the given ingredient from the database.
   * 
   * @param id 
   * @throws {NotFoundError} Thrown if ingredient is not in database.
   */
  static async remove(id) {
    const ingredientRes = await db.query(`
      DELETE FROM ingredients
      WHERE id = $1
      RETURNING id
    `, [id]);

    if (!ingredientRes.rows[0]) throw new NotFoundError('Ingredient not found');
  }

} // end Ingredient class

module.exports = Ingredient;