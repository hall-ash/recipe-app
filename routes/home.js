"use strict";

/** Routes for home */

const express = require('express');
const { extractRecipeInfo } = require('../spoonacularApi/spoonacular-api');

const router = express.Router();

/**
 * GET / => { recipeData }
 * 
 * Extract recipe data given a url.
 * 
 * Returns { title, servings, sourceUrl, sourceName, image, instructions,
 *           ingredients, cuisines, courses, diets, occasions }
 * 
 * Auth required: none
 */
router.get("/", async (req, res, next) => {
  try {
    const recipeData = await extractRecipeInfo(req.query);
    return res.json({ recipeData });
  } catch (e) {
    return next(e);
  }
});

module.exports = router;