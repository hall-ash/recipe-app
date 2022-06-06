"use strict";

/** Routes for categories. */

const jsonschema = require("jsonschema");

const express = require("express");
const { ensureAuthUserOrAdmin } = require("../middleware/auth");
const { BadRequestError } = require("../expressError");
const Category = require("../models/category");
const categoryNewSchema = require("../jsonSchemas/categoryNew.json");
const categoryUpdateSchema = require("../jsonSchemas/categoryUpdate.json");

const router = express.Router({ mergeParams: true });

/** 
 * POST / { label, parentId } => { category }
 * 
 * Creates a category for the user.
 * Returns { id, username, label, parentId }
 *
 * Auth required: auth user or admin
 */
router.post("/", ensureAuthUserOrAdmin, async (req, res, next) => {
  try {
    const validator = jsonschema.validate(req.body, categoryNewSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const { username } = req.params;
    const category = await Category.create(username, req.body);
    return res.status(201).json({ category });
  } catch (e) {
    return next(e);
  }
});

/**
 * GET / => 
 * { categories: [{ id, username, label, parentId, children, recipes }, ...] }
 * 
 * Retrieves a list of root categories for the user.
 * 
 * Auth required: logged in
 */
router.get("/", ensureAuthUserOrAdmin, async (req, res, next) => {
  try {
    const { username } = req.params;
    const categories = await Category.getAllRoots(username);
    return res.json({ categories });
  } catch (e) {
    return next(e);
  }
});

/**
 * GET /[id] => { category }
 * 
 * Retrieves a category by id.
 * 
 * returns { id, username, label, parentId, children, recipes }
 */
 router.get("/:id", ensureAuthUserOrAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await Category.get(id);
    return res.json({ category });

  } catch (e) {
    return next(e);
  }
});

/** 
 * PATCH /[id]  { field1, ... } => { category }
 *
 * Updates a category by id.
 * Data can include: { label, parentId }
 *
 * Returns { id, label, username, parentId } 
 *
 * Authorization required: logged in
 */

 router.patch("/:id", ensureAuthUserOrAdmin, async (req, res, next) => {
  try {
    const validator = jsonschema.validate(req.body, categoryUpdateSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const { id } = req.params;
    const category = await Category.update(id, req.body);
    return res.json({ category });
  } catch (err) {
    return next(err);
  }
});

/** 
 * DELETE /[id]  =>  { deleted: id }
 * 
 * Deletes a category.
 * 
 * Auth required: logged in
 */

router.delete("/:id", ensureAuthUserOrAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    await Category.remove(id);
    return res.json({ deleted: +id });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /[categoryId]/recipe/[recipeId] => { added: recipeId }
 * 
 * Adds a recipe to a category.
 * 
 * Auth required: logged in
 */
router.post("/:categoryId/recipe/:recipeId", ensureAuthUserOrAdmin, async (req, res, next) => {
  try {
  
    const { categoryId, recipeId } = req.params;
    await Category.addRecipe(categoryId, recipeId);
    return res.json({ added: +recipeId });
  } catch (err) {
    return next(err);
  }
});


module.exports = router;