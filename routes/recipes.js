"use strict";

/** Routes for recipes. */

const jsonschema = require("jsonschema");

const express = require("express");
const { ensureAuthUserOrAdmin } = require("../middleware/auth");
const { BadRequestError } = require("../expressError");
const Recipe = require("../models/recipe");
const recipeNewSchema = require("../jsonSchemas/recipeNew.json");
const recipeUpdateSchema = require("../jsonSchemas/recipeUpdate.json");

const router = express.Router({ mergeParams: true });

/**
 * POST / { title, servings, sourceUrl, sourceName, image, ingredients,
  instructions, cuisines, diets, courses, occasions } => { recipe }
 * 
 * Creates a new recipe for the logged-in user.
 * 
 * returns { title, url, sourceName, image, servings, notes, editedAt, 
 *           createdAt, isFavorite, instructions, ingredients, categories }
 * 
 * Auth required: logged in
 */
 router.post("/", ensureAuthUserOrAdmin, async (req, res, next) => {
  try {
    const validator = jsonschema.validate(req.body, recipeNewSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const { username } = req.params;
    const recipe = await Recipe.create(username, req.body);
    return res.status(201).json({ recipe });
  } catch (e) {
    return next(e);
  }
});

/**
 * GET / => 
 *  { recipes: [ { id, title, url, source_name, image, servings, notes, edited_at, 
 *           created_at, is_favorite, instructions, ingredients }, ...] }
 * 
 * Retrieves a list of recipes.
 * 
 * Can filter on provided search filters:
 * - query - string, will find case-insensitive, partial matches
 * - orderBy - array, can include ['title', 'edited_at', 'created_at', 'source_name']
 * - isAsc - boolean, if true order results ascending, else descending
 * 
 * Auth required: logged in
 */
router.get("/", ensureAuthUserOrAdmin, async (req, res, next) => {
  try {
    const { username } = req.params;
    const recipes = await Recipe.getAll(username, req.query);
    return res.json({ recipes });
  } catch (e) {
    return next(e);
  }
});

/**
 * GET /[id] => { recipe }
 * 
 * Returns { id, username, title, url, sourceName, image, 
 *           servings, notes, isFavorite,
 *           editedAt, createdAt, ingredients,
 *           instructions } 
 * 
 * Auth required: logged in
 */
router.get("/:id", ensureAuthUserOrAdmin, async (req, res, next) => {
  try {
    const { username, id } = req.params;
    const recipe = await Recipe.get(username, id);
    return res.json({ recipe });
  } catch (e) {
    return next(e);
  }
});

/**
 * PATCH /favorites/[id] => { favorite_toggled: id }
 * 
 * Favorites a recipe if unfavorited. Unfavorites a recipe if favorited.
 * 
 * Auth required: logged in
 */
router.patch("/favorites/:id", ensureAuthUserOrAdmin, async (req, res, next) => {
  try {
    const { username, id } = req.params;
    await Recipe.toggleFavorite(username, id);

    return res.json({ favoriteToggled: +id })
  } catch (e) {
    return next(e);
  }
});

/**
 * PATCH /[id] => { recipe }
 * 
 * Updates the recipe.
 * Returns { id, username, title, url, sourceName, image, servings, notes, 
 *           editedAt, createdAt, isFavorite, ingredients, instructions }
 * 
 * Auth required: logged in
 */
 router.patch("/:id", ensureAuthUserOrAdmin, async (req, res, next) => {
  try {
    const validator = jsonschema.validate(req.body, recipeUpdateSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const { username, id } = req.params;
    const recipe = await Recipe.update(username, id, req.body);
    return res.json({ recipe });
  } catch (e) {
    return next(e);
  }
});

/**
 * DELETE /[id] => { deleted: recipeId }
 * 
 * Deletes the recipe.
 * 
 * Auth required: logged in
 */
 router.delete("/:id", ensureAuthUserOrAdmin, async (req, res, next) => {
  try {
    const { username, id } = req.params;
    await Recipe.remove(username, id);
    return res.json({ deleted: +id });
  } catch (e) {
    return next(e);
  }
});

module.exports = router;