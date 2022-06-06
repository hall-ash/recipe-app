/**
 * Instruction model 
 * Methods are called via the Recipe class. 
 */

 "use strict";

 const db = require('../database/db');
 const { sqlForPartialUpdate, checkDuplicate, recordExists } = require('../helpers/sql');
 const { 
   NotFoundError,
   BadRequestError,
   UnauthorizedError,
 } = require('../expressError');

class Instruction {

  /**
   * Create a new instruction(s) and 
   * add to the end of the given recipe's instructions.
   * 
   * @pre Recipe exists in the database.
   * @param {Number} recipeId
   * @param {*} data - To add a single instruction pass in a string of
   *                   the instruction's text. To add multiple instructions
   *                   pass in an array of strings.
   * @returns {Promise<object>} { id, recipeId, ordinal, step }
   */
  static async create(recipeId, data) {

    // instruction to add will start at current instruction count + 1
    const startingOrder = (await this._getCount(recipeId)) + 1;

    if (typeof data === 'string')
      return this._createSingle(recipeId, data, startingOrder);
    else 
      return this._createMultiple(recipeId, data, startingOrder);

  }

  /**
   * Helper method for Instruction.create
   * Creates a single instruction.
   * 
   * @pre Recipe exists in the database.
   * @param {Number} recipeId 
   * @param {String} step - step's text 
   * @param {Number} order - instruction order in recipe
   * @returns {Promise<object>} instruction - { id, recipeId, ordinal, step }
   */
  static async _createSingle(recipeId, step, order) {
    
    const result = await db.query(`
      INSERT INTO instructions
      (recipe_id, ordinal, step) 
      VALUES ($1, $2, $3)
      RETURNING id,
                recipe_id AS "recipeId", 
                ordinal, 
                step 
    `, [recipeId, order, step]);

    const instruction = result.rows[0];

    return instruction;
  }

  /**
   * Helper method for Instruction.create
   * Creates multiple instructions.
   * 
   * @pre Recipe must exist.
   * @param {Number} recipeId 
   * @param {Array<string>} steps 
   * @param {Number} startingOrder - the number at which to start adding the instructions 
   * @returns {Promise<array>} instructions - [{ id, ordinal, step, recipeId }, ...]
   */
  static async _createMultiple(recipeId, steps, startingOrder) {
    
    const instructions = await Promise.all(steps.map(( text , i) => {
      return db.query(`
        INSERT INTO instructions
        (step, ordinal, recipe_id) 
        VALUES ($1, $2, $3)
        RETURNING id, ordinal, step, recipe_id AS "recipeId"
      `, [text, i + startingOrder, recipeId]);
    }));

    return instructions.map(i => i.rows[0]);
  }


  /**
   * Helper method for Instruction.create
   * Get the number of instructions in a recipe.
   * 
   * @pre Recipe exists in the database.
   * @param {Number} recipeId 
   * @returns {Promise<number>} instruction count
   * @throws {NotFoundError} Recipe must exist.
   */
   static async _getCount(recipeId) {
  
    const instructions = await db.query(`
      SELECT COUNT(*) FROM instructions
      WHERE recipe_id = $1
    `, [recipeId]);

    return +instructions.rows[0].count;
  }

  /**
   * Update instructions for the given recipe.
   * 
   * @pre Recipe exists in the database.
   * @param {Number} recipeId 
   * @param {Array<string>} instructions - [step1, step2, ...] 
   * @return {Promise<array>} instructions - [{ id, recipeId, ordinal, step }, ...]
   */
  static async update(recipeId, instructions) {
    
    const { 
      createdInstructions, 
      instructionsToUpdate 
    } = await this._removeOrCreate(recipeId, instructions);

    const updatedInstructions = (await Promise.all(instructionsToUpdate.map((step, i) => {
      return db.query(`
        UPDATE instructions
        SET step = $1 
        WHERE recipe_id = $3 AND ordinal = $2
        RETURNING id, recipe_id AS "recipeId", ordinal, step
      `, [step, i + 1, recipeId])
    }))).map(i => i.rows[0]);

    // return all recipe instructions
    return [...updatedInstructions, ...createdInstructions];
  }

  /**
   * Helper method for Ingredient.update
   * Removes or creates instructions in the database as needed.
   * 
   * @pre Recipe exists in the database.
   * @param {Number} recipeId 
   * @param {Array<string>} instructions 
   * @returns {Promise<object>} { createdInstructions, instructionsToUpdate }
   */
  static async _removeOrCreate(recipeId, instructions) {
     
    // get list of old instructions
    const oldInstructions = (await db.query(`
      SELECT id FROM instructions
      WHERE recipe_id = $1
      ORDER BY ordinal
    `, [recipeId])).rows.map(i => i.id);

    // if delta negative, delete old instructions
    // if positive, create new instructions
    // if 0, no creation or deletion
    const delta = instructions.length - oldInstructions.length; 

    let instructionsToUpdate = instructions;
    let createdInstructions = [];

    if (delta > 0) { // create new instructions
      instructionsToUpdate = instructions.slice(0, -delta);

      // create new instructions
      createdInstructions = await this.create(recipeId, instructions.slice(-delta));
    } 
    if (delta < 0) { // delete old instructions
      const instructionsToDelete = oldInstructions.slice(delta);

      // remove old instructions
      await Promise.all(instructionsToDelete.map(id => this.remove(id)));
    } 

    return { instructionsToUpdate, createdInstructions };
  }

  /**
   * Remove the given instruction from the database.
   * 
   * @param {Number} id - instruction id 
   * @throws {NotFoundError} Thrown if instruction is not in database.
   */
  static async remove(id) {
    const instructionRes = await db.query(`
      DELETE FROM instructions
      WHERE id = $1
      RETURNING id
    `, [id]);

    if (!instructionRes.rows[0]) throw new NotFoundError('Instruction not found');
  }

  


} // end Instruction class

module.exports = Instruction;