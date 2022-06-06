class InstructionExtras {

/**
 * Get instruction from its id.
 * 
 * @param {Number} id - instruction id
 * @returns {Promise<object>} instruction - { id, recipeId, order, step } 
 * @throws {NotFoundError} Throw if instruction not found.
 */
static async get(id) {
  const instructionResult = await db.query(`
    SELECT id, recipe_id AS "recipeId", order, step
    FROM instructions
    WHERE id = $1
  `, [id]);

  const instruction = instructionResult.rows[0];

  if (!instruction) throw new NotFoundError('Instruction not found.');

  return instruction;
}

/**
 * Get all instructions for a recipe.
 * 
 * @async
 * @param {Number} recipeId 
 * @returns {Promise<array>} instructions - array of instruction objects where
 *                                 instruction: { id, recipeId, order, step }
 * @throws {NotFoundError} Recipe must exist.
 */
static async getAll(recipeId) {

const exists = await recordExists('recipes', 'id', recipeId);
if (!exists) throw NotFoundError('Recipe not found.');

const instructions = await db.query(`
  SELECT id, recipe_id AS "recipeId", order, step
  FROM instructions
  WHERE recipe_id = $1
  ORDER BY order
`, [recipeId]);

return instructions.rows;
}

/**
 * Update an instruction step's text. 
 * 
 * @param {Number} id - instruction id
 * @param {String} step - instruction text
 * @throws {NotFoundError} Thrown if instruction is not in database.
 */
static async updateStep(id, step) {

const exists = await recordExists('instruction', 'id', id);
if (!exists) throw new NotFoundError('Instruction not found.')

await db.query(`
  UPDATE instructions
  SET step = $1
  WHERE id = $2
  RETURNING id, recipe_id AS "recipeId", order, step
`, [step, id]);
}

/**
 * Update the instruction step's order.
 * 
 * @param {Number} id - instruction id
 * @param {Number} newOrder - instruction's new order
 * @throws {NotFoundError} Thrown if instruction is not in database.
 */
static async updateOrder(id, newOrder) {

  const instructionRes = await db.query(`
    SELECT order, recipe_id AS "recipeId"
    FROM instructions
    WHERE id = $1
  `, [id]);

  if (!instructionRes.rows[0]) throw new NotFoundError('Instruction not found');
  
  const { order: oldOrder, recipeId } = instructionRes.rows[0];
  
  // do nothing if order not changed
  if (newOrder === oldOrder) return;

  if (newOrder > oldOrder ) { // moving this instruction down
    
    // move other instructions up
    await db.query(`
    UPDATE instruction
    SET order = order - 1
    WHERE recipe_id = $1 AND 
    order > $2
    `, [recipeId, oldOrder]);
  } else { // moving this instruction up
    
    await db.query(`
      UPDATE instructions
      SET order = order + 1
      WHERE recipe_id = $1 AND
      order < $2
    `, [recipeId, oldOrder]);
  }
  
  // place this instruction in correct order
  await db.query(`
    UPDATE instructions
    SET ORDER = $1
    WHERE id = $2
  `, [newOrder, id]);
}

/**
 * Update an instruction's order or name.
 * 
 * @param {Number} id - instruction id
 * @param {Object} data - can include { order, name }
 * @returns {Object} { id, recipeId, order, step }
 */
static async update(id, data) {

  const { name, order: newOrder } = data;
  if (name) await this.updateName(id, name);
  if (order) await this.updateOrder(id, newOrder);

  const instruction = await this.get(id);
  return instruction;
}

} // end instruction-extra class