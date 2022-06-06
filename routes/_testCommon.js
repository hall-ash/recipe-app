"use strict";

const db = require("../database/db.js");
const _ = require('lodash');

const User = require("../models/user");
const Recipe = require("../models/recipe");
const Category = require("../models/category");
const Unit = require("../models/unit");
const Ingredient = require("../models/ingredient");
const Instruction = require("../models/instruction");

const { createToken } = require("../helpers/tokens");

// store ids for users, recipe, unit, ingredients, instructions, categories
const ids = {};

async function commonBeforeAll() {

  // clear data in tables
  const tables = [
    'users', 
    'recipes', 
    'units',
    'ingredients', 
    'instructions', 
    'categories',
    'recipes_categories',
  ];
  await Promise.all(tables.map(t => db.query(`DELETE FROM ${t}`)));

  // create test users and recipes
  const numToCreate = 3;
  await Promise.all(_.range(1, numToCreate + 1).reduce((acc, n) => {
    acc.push(User.register({
      username: `u${n}`,
      firstName: `U${n}F`,
      lastName: `U${n}L`,
      email: `user${n}@user.com`,
      password: `password${n}`,
      isAdmin: n % 2 === 0 ? true : false,
    }));

    return acc;
  }, []));

  const recipeData = {
    title: 'r1 title',
    sourceUrl: 'r1.com',
    sourceName: 'r1 source',
    image: 'r1.jpg',
    servings: 4,
    instructions: [
     'instruction 1',
     'instruction 2',
     'instruction 3'
    ],
    ingredients: [
      {
        label: 'chicken',
        usAmount: 1.5,
        usUnit: 'lb',
        metricAmount: 680.389,
        metricUnit: 'g'
      },
      {
        label: 'sauce',
        usAmount: 0.333,
        usUnit: 'cups',
        metricAmount: 78.863,
        metricUnit: 'ml'
      },
      {
        label: 'honey',
        usAmount: 0.333,
        usUnit: 'cups',
        metricAmount: 78.863,
        metricUnit: 'ml'
      },
    ],
    cuisines: [],
    diets: [],
    courses: ['dinner', 'main course'],
    occasions: [],
  }

  ids.recipe = (await Recipe.create('u1', recipeData)).id;

  ids.defaultCategories = await Category.getRootIds('u1');

  ids.category = (await Category.create('u1', { label: 'cat0', parentId: ids.defaultCategories[0] })).id;

}

async function commonBeforeEach() {
  await db.query("BEGIN");
}

async function commonAfterEach() {
  await db.query("ROLLBACK");
}

async function commonAfterAll() {
  await db.end();
}


const u1Token = createToken({ username: "u1", isAdmin: false });
const adminToken = createToken({ username: "u2", isAdmin: true });


module.exports = {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  adminToken,
  ids
};
