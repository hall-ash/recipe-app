class RecipeExtra {
   /**
   * Add a batch of categories to the given recipe.
   * 
   * @param {Number} recipeId 
   * @param {Array<string>} categoryLabels - [label1, label2, ...]
   * @returns {Promise<array>} categoryIds - [id1, id2, ...]
   */
    static async addcategoriesByLabel(recipeId, categoryLabels) {
      if (!categoryLabels.length) return [];
          
      // check if recipe exists
      const recipeExists = await recordExists('recipes', 'id', recipeId);
      if (!recipeExists) throw NotFoundError('Recipe not found.');
  
      // get categories already added to recipe
      const alreadyAdded = (await db.query(`
        SELECT s.label
        FROM categories AS s
        INNER JOIN recipes_categories AS rc
        ON s.id = rc.category_id
        WHERE rc.recipe_id = $1
      `, [recipeId])).rows.map(s => s.label);
  
      // remove duplicate categories & filter categories that have already been added to recipe
      const categoriesToAdd = _.difference(_.uniq(categoryLabels), alreadyAdded);
      if (!categoriesToAdd.length) return [];
      
      // get category ids
      const categoryIds = (await Promise.all(categoriesToAdd.map(label=> {
        return db.query(`
          SELECT id FROM categories
          WHERE label= $1
        `, [label]);
      }))).map(s => s.rows[0].id);
  
      // build param string: ($1, $(length + 1)), ($2, $(length + 1), ... 
      const length = categoriesToAdd.length;
      const paramStr = Array.from({ length }, (v, i) => `($${i + 1}, $${length + 1})`).join(', ');
  
      // add categories to recipe
      const addedSubcatIds = (await db.query(`
        INSERT INTO recipes_categories
        (category_id, recipe_id) VALUES ${paramStr}
        RETURNING category_id AS "id"
      `, [...categoryIds, recipeId])).rows.map(s => s.id);
  
      return addedSubcatIds;
    }

    /**
   * Filter recipes by category. 
   * 
   * @param {String} username 
   * @param {Object} { categoryLabel, orderByCol }
   * @returns {Promise<object>} recipeData - [{ id, title, url, image, servings }, ...]
   */
  static async _filterByCategory(username, categoryLabel) {
    
    const recipes = await db.query(`
      SELECT r.id, r.title, r.url, r.image, r.servings
      FROM recipes AS r
      JOIN recipes_categories AS rc
      ON r.id = rc.recipe_id
      JOIN categories AS c
      ON rc.category_id = c.id
      WHERE c.label = $1 AND r.username = $2
      ORDER BY r.title
    `, [categoryLabel, username]);
    return recipes.rows;
  }

  static async filterByIngredient(username, ingredientName) {
    const recipes = await db.query(`
      SELECT r.id, r.title, r.url, r.image, r.servings
      FROM recipes AS r
      JOIN ingredients AS i
      ON r.id = i.recipe_id
      WHERE i.label ILIKE $1 AND r.username = $2
      ORDER BY r.title
    `, [`%${ingredientName}%`, username]);
    return recipes.rows;
  }

   /** 
  * Get all categories for the given recipe. 
  * 
  * @pre Recipe must exist in the database.
  * @param {Number} recipeId 
  * @returns {Promise<object>} categories - { 'supercategory': ['cat1', 'cat2', ...], ... }
  */
  static async _getCategories(recipeId) {

    const categories = (await db.query(`
      SELECT c.label, c.supercategory
      FROM categories AS c
      INNER JOIN recipes_categories AS rc
      ON c.id = rc.category_id
      WHERE rc.recipe_id = $1
      ORDER BY c.supercategory, c.label
    `, [recipeId])).rows;

    return categories.reduce((acc, { supercategory, category }) => {
      if (!acc[supercategory]) acc[supercategory] = [];
      acc[supercategory].push(category);
     
      return acc;
    }, {});

  }
}