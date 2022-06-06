class IngredientExtras {


/**
 * Get all ingredients in database.
 * 
 * @returns {Array} An array of ingredients. 
 */
static async findAll() {
  const ingredients = await db.query(`
    SELECT id,
            recipe_id AS "recipeId",
            unit_id AS "unitId",
            name,
            order,
            metric_amount AS "metricAmount",
            us_amount AS "usAmount"
    FROM ingredients
    ORDER BY name
  `);

  return ingredients.rows;
}

/**
 * Get an ingredient, given its id. 
 * 
 * @param {Number} id - ingredient's id
 * @returns {Object} { id, recipeId, unitId, name, order, metricAmount, usAmount }
 * @throws {NotFoundError} Thrown if ingredient is not in database.
 */
  static async get(id) {
  const ingredientRes = await db.query(`
    SELECT id, 
            recipe_id AS "recipeId",
            unit_id AS "unitId",
            name,
            order,
            metric_amount AS "metricAmount",
            us_amount AS "usAmount",
    FROM ingredients
    WHERE id = $1
  `, [id])

  const ingredient = ingredientRes.rows[0];

  if (!ingredient) throw new NotFoundError(`Ingredient not found.`);

  return ingredient;
}

/**
* Get all ingredients in recipe.
* 
* @param {Number} recipeId 
* @returns {Promise<array>} ingredients - [{id, recipeId, unitId, name, order, metricAmount, usAmount}, ...]
*/
static async getAllByRecipe(recipeId) {
  const ingredients = await db.query(`
    SELECT id, 
            recipe_id AS "recipeId",
            unit_id AS "unitId", 
            name, 
            order,
            metric_amount AS "metricAmount",
            us_amount AS "usAmount"
    FROM ingredients
    WHERE recipe_id = $1
  `, [recipeId]);

  return ingredients.rows;
}


/**
 * Filter ingredients by name.
 * 
 * @param {String} name 
 * @returns {Array} Array of ingredients matching the given name. If
 * no ingredients match, returns empty array.
 */
static async filterBy(name) {

const ingredients = await db.query(`
  SELECT id,
          recipe_id AS "recipeId",
          unit_id AS "unitId",
          name,
          order,
          metric_amount AS "metricAmount",
          us_amount AS "usAmount"
  FROM ingredients
  WHERE name ILIKE $1
  ORDER BY name
`, ['%' + name + '%']);

return ingredients.rows;
}

/**
 * Update an ingredient's name. 
 * 
 * @param {Number} id - ingredient's id
 * @param {String} name - ingredient's name
 * @throws {NotFoundError} Thrown if ingredient is not in database.
 */
static async updateName(id, name) {
const ingredientRes = await db.query(`
  UPDATE ingredients
  SET name = $1
  WHERE id = $2
`, [name, id]);

const ingredient = ingredientRes.rows[0];

if (!ingredient) throw new NotFoundError('Ingredient not found');
}

/**
 * Update the ingredient's order in the recipe.
 * 
 * @param {Number} id 
 * @param {Number} newOrder 
 * @throws {NotFoundError} Thrown if ingredient is not in database.
 */
static async updateOrder(id, newOrder) {
const ingredientRes = await db.query(`
  SELECT order, recipe_id AS "recipeId"
  FROM ingredients
  WHERE id = $1
`, [id]);

if (!ingredientRes.rows[0]) throw new NotFoundError('Ingredient not found');

const { order: oldOrder, recipeId } = ingredientRes.rows[0];

// do nothing if order not changed
if (newOrder === oldOrder) return;

if (newOrder > oldOrder ) { // moving this ingredient down
  
  // move other ingredients up
  await db.query(`
  UPDATE ingredients
  SET order = order - 1
  WHERE recipe_id = $1 AND 
  order > $2
  `, [recipeId, oldOrder]);
} else { // moving this ingredient up
  
  await db.query(`
    UPDATE ingredients
    SET order = order + 1
    WHERE recipe_id = $1 AND
    order < $2
  `, [recipeId, oldOrder]);
}

// place this ingredient in correct order
await db.query(`
  UPDATE ingredients
  SET ORDER = $1
  WHERE id = $2
`, [newOrder, id]);

}

/**
 * Update an ingredient's order or name.
 * 
 * @param {Number} id - ingredient's id
 * @param {Object} data - can include { order, name }
 * @returns {Object} { id, recipeId, measureId, name, order, metricAmount, usAmount }
 */
static async update(id, data) {

  const { name, order: newOrder } = data;
  if (name) this.updateName(id, name);
  if (order) this.updateOrder(id, newOrder);

  return this.get(id);
}

/**
 * Scale the ingredient amount to match the number of servings.
 * 
 * @param {Number} id 
 * @param {Number} originalServings - the original number of servings in recipe
 * @param {Number} newServings - the new number of servings
 */
  static async scaleAmount(id, originalServings, newServings) {
  if (originalServings === newServings) return;

  // set newServings to 0 if negative value
  if (newServings < 0) newServings = 0;
  
  const ingredientRes = await db.query(`
    SELECT metric_amount, us_amount
    FROM ingredients
    WHERE id = $1
  `, [id]);

  const ingredient = ingredientRes.rows[0];
  if (!ingredient) throw new NotFoundError('Ingredient not found');

  const { metric_amount, us_amount } = ingredient;
  
  const metricAmount = (+metric_amount / originalServings) * newServings;
  const usAmount = (+us_amount / originalServings) * newServings;

  const { setCols, values } = sqlForPartialUpdate(
    { metricAmount, usAmount },
    {
      metricAmount: "metric_amount",
      usAmount: "us_amount",
    });

  const idVarIdx = "$" + (values.length + 1);

  const newIngredientRes = await db.query(`
    UPDATE ingredients
    SET ${setCols}
    WHERE id = ${idVarIdx}
    RETURNING id,
              recipe_id AS 'recipeId',
              measure_id AS 'measureId',
              name,
              order,
              metric_amount AS 'metricAmount',
              us_amount AS 'usAmount'
  `, [...values, id]);

  return newIngredientRes.rows[0];
}

static async incrementAmount(id, originalServings) {
  return this.scale(id, originalServings, originalServings + 1);
};

static async decrementAmount(id, originalServings) {
  return this.scale(id, originalServings, originalServings - 1);
}

} // end class IngredientExtras