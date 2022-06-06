/**
 * Category model
 * 
 */

 "use strict";

const db = require('../database/db');
const _ = require('lodash');
const { sqlForPartialUpdate, checkDuplicate, recordExists } = require('../helpers/sql');
const { 
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
} = require('../expressError');

class Category {
  
  static get publicFields() {
    return `id, 
            username,
            label,
            parent_id AS "parentId"`
  }

  static get defaultCategories() {
    return [
      'cuisines',
      'diets',
      'courses',
      'occasions',
    ]
  }

  /**
   * Create a category within the given parent category.
   * To create a root category set parentId to null.
   * 
   * @param {String} username 
   * @param {Object} categoryData - { label, parentId } 
   * @returns {Promise<object>} category - { id, username, label, parentId }
   * @throws {NotFoundError} Thrown if parent category does not exist.
   * @throws {BadRequestError} Thrown if creating category with duplicate label under the same parent category.
   * @throws {UnauthorizedError} Thrown if category does not have same username as parent category.
   */
  static async create(username, { label, parentId }) {

    // check parent category exists 
    if (parentId) {
      const parentExists = (await db.query(`
        SELECT id, username FROM categories
        WHERE id = $1
      `, [parentId])).rows[0];
      if (!parentExists) throw new NotFoundError(`Parent category with id ${parentId} could not be found.`);
      
      // check that parentCategory.username === username
      if (parentExists.username !== username) return new UnauthorizedError('Cannot create category.')
    }

    // check duplicate
    const isDuplicate = (await db.query(`
      SELECT id FROM categories
      WHERE parent_id = $1 AND label = $2
    `,[parentId, label])).rows[0];
    if (isDuplicate) throw new BadRequestError(`Category already exists with name ${label}`)
  
    // insert category
    const category = (await db.query(`
      INSERT INTO categories (username, label, parent_id) 
      VALUES ($1, $2, $3)
      RETURNING ${Category.publicFields}
    `, [username, label, parentId])).rows[0];

    return category;
  }

  /**
   * Get the category given its id.
   * 
   * @param {String} username
   * @param {Number} id - category id
   * @returns {Promise<object>} category - { id, username, label, parentId, children, recipes } 
   *                            where children is an array of child category ids: [catId1, catId2, ...]
   *                            and recipes is an array of recipe ids: [recipeId1, recipeId2, ...]
   * @throws {NotFoundError} Thrown if category is not in database.
   */
  static async get(username, id) {
    
    const category = (await db.query(`
      SELECT ${Category.publicFields}
      FROM categories
      WHERE id = $1 AND username = $2
    `, [id, username])).rows[0];

    if (!category) throw new NotFoundError(`Id ${id} not found in categories`);

    // get array of recipe ids
    category.recipes = (await db.query(`
      SELECT recipe_id AS "id" 
      FROM recipes_categories
      WHERE category_id = $1
    `, [id])).rows.map(r => r.id);

    // get array of child category ids
    category.children = (await db.query(`
      SELECT id FROM categories
      WHERE parent_id = $1
    `, [id])).rows.map(c => c.id);

    return category; 
  }

  /**
   * Get all root category data for the user.
   * Returns an array of root category data.
   * 
   * @param {String} username 
   * @returns {Promise<array>} [{ id, username, label, parentId, children, recipes }, ...]
   */
  static async getAllRoots(username) {
    const rootIds = await this.getRootIds(username);

    const rootCategories = await Promise.all(rootIds.map(id => {
      return this.get(username, id);
    }));

    return rootCategories;
  }

  /**
   * Get all categories and subcategories for the given user.
   * 
   * @param {String} username 
   * @returns {Promise<array>} [ { id, label, username, parentId, children: [] }, ...]
   */
  static async getCategoryTrees(username) {

    const rootIds = await this.getRootIds(username);

    const categories = await Promise.all(rootIds.map(root => {
      return this.getCategorySubTree(username, root);
    }));
    return categories;
  }

  /**
   * Perform a recursive, preorder traversal to
   * retrieve subcategory data within the given parent category.
   * 
   * @param {String} username
   * @param {Number} id 
   * @returns {Object} { id, label, username, children }
   * @throws {NotFoundError} Thrown if category is not in database.
   * 
   * Example: 
   * root A with 2 children B, C =>
   * { 
   *    id: a, 
   *    label: A, 
   *    username: foo, 
   *    parentId: null,
   *    children: [
   *      {
   *        id: b,
   *        label: B,
   *        username: foo,
   *        parentId: a,
   *        children: []
   *      },
   *      { id: c,
   *        label: C,
   *        username: foo,
   *        parentId: a,
   *        children: []
   *      }
   *    ]
   * }
   */
  static async getCategorySubTree(username, id) {
    
    const category = await Category.get(username, id);
    const categorySubTree = { ...category, children: [] }
    const { children } = category;
    
    if (!children.length) return categorySubTree;
    
    for (let i = 0; i < children.length; i++ ){
      const child = await this.getCategorySubTree(username, children[i]);
      categorySubTree.children.push(child);
    }
   
    return categorySubTree;

  }

  /**
   * Returns a list of root category ids for the given user.
   * 
   * @param {String} username 
   * @returns {Promise<array>} [rootId1, rootId2, ...] 
   */
  static async getRootIds(username) {
    const rootIds = (await db.query(`
      SELECT id 
      FROM categories
      WHERE parent_id IS NULL AND username = $1
    `, [username])).rows.map(r => r.id);

    return rootIds;
  }

  static async getDefaultCategoryIds(username) {
    return (await Promise.all(
      this.defaultCategories.map(label => {
        return db.query(`SELECT id FROM categories
                         WHERE username = $1 AND label = $2 AND parent_id IS NULL
                        `, [username, label])
    }))).map(cat => cat.rows[0].id);
  }

  /**
   * Update the category given its id.
   * 
   * @param {String} username
   * @param {Number} id - category id
   * @param {Object} data - can include { label, parentId }
   * @returns {Promise<object>} category - { id, label, username, parentId } 
   * @throws {NotFoundError} Thrown if category is not in database.
   * 
   */
  static async update(username, id, data) {

    const { parentId, label } = data;

    const category = (await db.query(`
      SELECT parent_id AS "currParentId", label AS "currLabel"
      FROM categories
      WHERE id = $1 AND username = $2
    `, [id, username])).rows[0];

    if (!category) throw new NotFoundError(`Id ${id} not found in categories`);
    const { currLabel, currParentId } = category;
    
    if (this.defaultCategories.includes(currLabel) && currParentId === null) {
      throw new ForbiddenError(`Cannot update default category: ${currLabel}`);
    }

    // check that label won't be duplicate under parent category
    const labelToCheck = label ? label : currLabel;
    const parentIdToCheck = parentId ? parentId : currParentId;
    
    const isDuplicate = (await db.query(`
      SELECT id FROM categories
      WHERE label = $1 AND parent_id = $2
    `, [labelToCheck, parentIdToCheck])).rows[0];
    if (isDuplicate) throw new BadRequestError(`Parent category already contains category with name: ${label}`);
  
    const { setCols, values } = sqlForPartialUpdate(
      data,
      {
        parentId: "parent_id",
      }
    );
    const idIdx = "$" + (values.length + 1);

    const updatedCategory = (await db.query(`
      UPDATE categories
      SET ${setCols}
      WHERE id = ${idIdx}
      RETURNING ${Category.publicFields}
    `, [...values, id])).rows[0];

    return updatedCategory;
  }

  /**
   * Remove the category given its id. 
   * 
   * @param {Number} id - category id 
   * @throws {NotFoundError} Thrown if category is not in database.
   */
  static async remove(username, id) {

    // check that category is not default root
    const category = (await db.query(`
      SELECT label, parent_id AS "parentId"
      FROM categories
      WHERE id = $1 AND username = $2
    `, [id, username])).rows[0];

    if (!category) throw new NotFoundError(`Id ${id} not found in categories`);
    const { label, parentId } = category;

    if (this.defaultCategories.includes(label) && parentId === null) {
      throw new ForbiddenError(`Cannot update root category: ${label}`);
    }

    // delete category
    await db.query(`
      DELETE FROM categories
      WHERE id = $1
    `, [id])
  }

  /**
   * Add a recipe to a category. 
   * 
   * @param {String} username
   * @param {Number} categoryId
   * @param {Number} recipeId 
   * @throws {NotFoundError} Recipe and category must exist.
   * @throws {BadRequestError} Thrown if recipe was already 
   * added to category. 
   */
   static async addRecipe(username, categoryId, recipeId) {

    // check if recipe exists for user
    const recipeExists = (await db.query(`
      SELECT id FROM recipes
      WHERE id = $1 AND username = $2
    `, [recipeId, username])).rows[0]
    if (!recipeExists) throw new NotFoundError(`Recipe id ${recipeId} not found for user ${username}`);

    // check if category exists for user
    const categoryExists = (await db.query(`
      SELECT id FROM categories
      WHERE ID = $1 AND username = $2
    `, [categoryId, username])).rows[0]
    if (!categoryExists) throw new NotFoundError(`Category id ${categoryId} not found for user ${username}`);

    // check if category already added to recipe
    const isDuplicate = await db.query(`
      SELECT recipe_id
      FROM recipes_categories
      WHERE (recipe_id, category_id) = ($1, $2)
    `, [recipeId, categoryId]);
    if (isDuplicate.rows[0]) throw new BadRequestError('Category already added to recipe.');
    
    // add category to recipe
    await db.query(`
      INSERT INTO recipes_categories
      (recipe_id, category_id)
      VALUES ($1, $2)
    `, [recipeId, categoryId]);

  }


} // end Category class

module.exports = Category;