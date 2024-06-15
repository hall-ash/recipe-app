/**
 * Ingredient model
 * 
 * Methods should be called from the Recipe class. 
 */

 "use strict";

 const _ = require('lodash');
 const db = require('../database/db');
 const { sqlForPartialUpdate, checkDuplicate, recordExists } = require('../helpers/sql');
 const { 
   NotFoundError,
   BadRequestError,
   UnauthorizedError,
 } = require('../expressError');
const { _updateSingle } = require('./instruction');
const { getConversion } = require('../spoonacularApi/spoonacular-api');

class Ingredient {


  static ING_PUBLIC_FIELDS = `
    id,
    recipe_id AS "recipeId",
    label,
    base_food AS "baseFood",
    ordinal
  `

  static MEASURE_PUBLIC_FIELDS = `
    ingredient_id AS "ingredientId",
    amount,
    unit,
    unit_type AS "unitType"
  `


  /**
   * Create a new ingredient(s) and add to the
   * end of the given recipe's ingredient list.
   * 
   * @pre Recipe must exist in database.
   * @param {Number} recipeId 
   * @param {Array<object>} ingredientData - [{ label, baseFood, measures }, ...]
   *                                         where measures is [{ amount, unit, unitType }, ...]
   * @returns {Promise<array>} ingredients - [{ id, recipeId, label, baseFood, ordinal, measures }, ...]
   *                                         where measures is { metric: { ingredientId, amount, unit, unitType }, us: {...} }
   */
  static async create(recipeId, ingredientData) {

    // ingredient to add will start at current ingredient count + 1
    const startingOrder = (await this._getCount(recipeId)) + 1;

    const ingredients = (await Promise.all(ingredientData.map(({ label, baseFood } , i) => {

      // if no baseFood is given insert null
      const food = baseFood ? baseFood : null;

      return db.query(`
        INSERT INTO ingredients
        (recipe_id, label, base_food, ordinal) 
        VALUES ($1, $2, $3, $4)
        RETURNING ${this.ING_PUBLIC_FIELDS}
      `, [recipeId, label, food, startingOrder + i]);
    }))).map(res => res.rows[0]);

    const createdMeasures = await this._createMeasures(ingredientData, ingredients);

    ingredients.forEach((ingredient, i) => {

      ingredient.measures = {};

      const metricMeasure = _.find(createdMeasures[i], { unitType: 'metric'} );
      const usMeasure = _.find(createdMeasures[i], { unitType: 'us'} );

      // if metricMeasure or usMeasure is undefined, set to empty object
      ingredient.measures.metric = metricMeasure ? metricMeasure : {};
      ingredient.measures.us = usMeasure ? usMeasure : {};
    });

    return ingredients;
  };


  static async _createMeasures(ingredientData, ingredients) {

    const allMeasures = (await Promise.all(ingredientData.map(({ measures }, i) => {
    
      if (!measures || !measures.length) {
        const res = { rows: {} };
        return new Promise(resolve => resolve(res)); 
      }
      
      const values = measures.reduce((acc, { amount, unit, unitType }) => {
        acc.push(amount, unit, unitType);
        return acc;
      }, []);

      const length = measures.length;
      // build param string: ($1, $2, $3, $(values.length + 1)), ($4, $5, $6, $(values.length + 1))
      const paramStr = Array.from({ length }, (v, i) => {
        const n = i * 3;
        return `($${n + 1}, $${n + 2}, $${n + 3}, $${values.length + 1})`
      }).join(', ');

      return db.query(`
        INSERT INTO ingredient_measures
        (amount, unit, unit_type, ingredient_id)
        VALUES ${paramStr}
        RETURNING ${this.MEASURE_PUBLIC_FIELDS}
      `, [...values, ingredients[i].id]);
    }))).map(res => res.rows);

    return allMeasures;

  }

  /**
   * Returns the ingredient given its id.
   * 
   * @param {Number} id 
   * @returns {Promise<object>} ingredient - { id, recipeId, label, baseFood, ordinal, measures }
   *                                          measures: [{ id, ingredientId, amount, unit, unitType }, ...]
   * 
   * @throws {NotFoundError} Thrown if ingredient not found.
   */
  static async get(id) {
    const ingredient = (await db.query(`
      SELECT ${this.ING_PUBLIC_FIELDS}
      FROM ingredients 
      WHERE id = $1
    `, [id])).rows[0];

    if (!ingredient) throw new NotFoundError(`Ingredient with id ${id} could not be found.`);

    const sqlToSelectMeasure = `
      SELECT ${this.MEASURE_PUBLIC_FIELDS}
      FROM ingredient_measures
      WHERE ingredient_id = $1 AND unit_type = $2
    `
    ingredient.measures = {};
    ingredient.measures.metric = (await db.query(sqlToSelectMeasure, [id, 'metric'])).rows[0];
    ingredient.measures.us = (await db.query(sqlToSelectMeasure, [id, 'us'])).rows[0];
    
    return ingredient;
  }

  /**
   * Returns all ingredients for a recipe. If the recipe is not found or has no ingredients, returns 
   * emptry array.
   * 
   * @param {Number} recipeId 
   * @returns {Promise<array>} ingredients - [{ id, recipeId, label, baseFood, ordinal, measures }, ...]
   *                                          measures: { 
   *                                            metric: { ingredientId, amount, unit, unitType },
   *                                            us: { ingredientId, amount, unit, unitType }
   *                                          }
   */
  static async getAll(recipeId) {
    const ingredients = (await db.query(`
      SELECT ${this.ING_PUBLIC_FIELDS}
      FROM ingredients
      WHERE recipe_id = $1
      ORDER BY ordinal
    `, [recipeId])).rows;

    const sqlToSelectMeasure = `
      SELECT ${this.MEASURE_PUBLIC_FIELDS}
      FROM ingredient_measures
      WHERE ingredient_id = $1 AND unit_type = $2
    `
    const measureObjs = await Promise.all(ingredients.map(async ({ id }) => {
      return {
        metric: (await db.query(sqlToSelectMeasure, [id, 'metric'])).rows[0],
        us: (await db.query(sqlToSelectMeasure, [id, 'us'])).rows[0]
      }
  
    }));

    ingredients.forEach((ingredient, i) => {
      ingredient.measures = measureObjs[i];
    })


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

    // REMOVE UPDATEAMOUNTS
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

    await db.query(`
      UPDATE ingredients AS i
      SET
        us_amount = c.us_amount,
        metric_amount = c.metric_amount
      FROM (VALUES ${paramStr})
      AS c (id, us_amount, metric_amount)
      WHERE c.id = i.id 
    `, [...values])

    const updated = await db.query(`
      SELECT i.id, 
             i.recipe_id AS "recipeId",
             u.us_unit AS "usUnit",
             u.metric_unit AS "metricUnit",
             i.label,
             i.ordinal,
             i.metric_amount AS "metricAmount",
             i.us_amount AS "usAmount"
      FROM ingredients AS i
      JOIN units AS u
      ON u.id = i.unit_id
    `)

    return updated.rows;
  }

  /**
   * Update one or more ingredients.
   * 
   * @param {*} data - an object or array of ingredient data
   * @param {*} id - ingredient id, leave undefined if updating multiple ingredients
   * @returns {Promise} ingredient or ingredients
   */
  static async update(data, id) {
    if (Array.isArray(data))
      return this._updateMultiple(data);

    return this._updateSingle(data, id);
  }

  /**
   * Update a single ingredient.
   * 
   * @param id - ingredient id
   * @param data - can include { label, baseFood, ordinal, measure } 
   *                           measure: { unitType, measureData: { amount, unit } }
   * @returns {Promise<object>} updatedIngredient - { id, recipeId, label, baseFood, ordinal, measure }
   *                            measure: { ingredientId, amount, unit, unitType } 
   *             
   * @throws {NotFoundError} Thrown if ingredient or ingredient measure not found.
   * @throws {BadRequestError} Thrown if unitType not provided.
   */
  static async _updateSingle(data, id) {

    const { measure } = data;
    delete data.measure;

    let ingredient;
    if (Object.keys(data).length) {
      const { setCols, values } = sqlForPartialUpdate(data, { baseFood: "base_food" });
      const idIdx = '$' + (values.length + 1);
      
      ingredient = (await db.query(`
        UPDATE ingredients
        SET ${setCols}
        WHERE id = ${idIdx}
        RETURNING ${this.ING_PUBLIC_FIELDS}
      `, [...values, id])).rows[0];
    } else {
      ingredient = (await db.query(`
        SELECT ${this.ING_PUBLIC_FIELDS}
        FROM ingredients
        WHERE id = $1
      `, [id])).rows[0];
    }

    if (!ingredient) throw new NotFoundError(`No ingredient with id ${id}`);

    ingredient.measures = await this._getUpdatedMeasures(measure, ingredient);

    return ingredient;
  }

  static async _getUpdatedMeasures(measure, ingredient) {

    const measures = {};
    
    if (measure) {
      const { unitType: unitType1, measureData } = measure;

      if (!unitType1) throw new BadRequestError(`No unit type provided.`);
 
      const { setCols, values } = sqlForPartialUpdate(measureData, {});
      const unitType1Idx = '$' + (values.length + 1);
      const ingredientIdIdx = '$' + (values.length + 2);

      const updatedMeasure1 = (await db.query(`
        UPDATE ingredient_measures
        SET ${setCols}
        WHERE unit_type = ${unitType1Idx} AND ingredient_id = ${ingredientIdIdx}
        RETURNING ${this.MEASURE_PUBLIC_FIELDS}
      `, [...values, unitType1, ingredient.id])).rows[0];

      if (!updatedMeasure1) throw new NotFoundError(`No ${unitType1} measure for ingredient id ${ingredient.id}`);

      // if updating metric amount, update us amount
      // if updating us amount, update metric amount
      // ingredient needs to have a base food to perform conversion
      const updatedMeasure2 = ingredient.baseFood 
        ? await this._getUpdatedTargetFromSourceMeasure(ingredient.baseFood, ingredient.id, unitType1, updatedMeasure1.amount, updatedMeasure1.unit) 
        : null;

      if (unitType1 === 'metric') {
        measures.metric = updatedMeasure1;
        measures.us = updatedMeasure2;
      }
      else if (unitType1 === 'us') {
        measures.us = updatedMeasure1;
        measures.metric = updatedMeasure2;
      }
    }

    const sqlToSelectMeasure = `
      SELECT ${this.MEASURE_PUBLIC_FIELDS}
      FROM ingredient_measures
      WHERE ingredient_id = $1 AND unit_type = $2
    `
    
    if (!measures.metric) {
      measures.metric = (await db.query(sqlToSelectMeasure, [ingredient.id, 'metric'])).rows[0];
    }
    if (!measures.us) {
      measures.us = (await db.query(sqlToSelectMeasure, [ingredient.id, 'us'])).rows[0];
    }

    return measures;
  }


  static async _getUpdatedTargetFromSourceMeasure(baseFood, ingredientId, sourceUnitType, sourceAmount, sourceUnit) {

    const targetUnitType = sourceUnitType === 'metric' ? 'us' : 'metric';

    const { targetUnit } = (await db.query(`
      SELECT unit AS "targetUnit"
      FROM ingredient_measures
      WHERE ingredient_id = $1 AND unit_type = $2
    `, [ingredientId, targetUnitType])).rows[0];

    const targetAmount = await getConversion(baseFood, sourceAmount, sourceUnit, targetUnit);

    // update target measure with target amount
    const targetMeasure = (await db.query(`
      UPDATE ingredient_measures
      SET amount = $1
      WHERE ingredient_id = $2 AND unit_type = $3
      RETURNING ${this.MEASURE_PUBLIC_FIELDS}
    `, [targetAmount, ingredientId, targetUnitType])).rows[0];

    return targetMeasure;
  }


  /**
   * 
   * @param {Array} data - [{ id, data }, ...]
   *                    data: { label, baseFood, ordinal, measure }
   *                    measure: { unitType, measureData: { amount, unit } }
   */
  static async _updateMultiple(data) {
    const updatedIngredients = await Promise.all(data.map(({ id, data }) => {
      return this._updateSingle(data, id);
    }));

    return updatedIngredients;
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