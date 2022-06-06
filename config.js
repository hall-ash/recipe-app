/**
 * Shared config for app
 */

"use strict";

require("dotenv").config();
require("colors");

const SECRET_KEY = process.env.SECRET_KEY || "secret-dev";

// put api key in request params 
const API_KEY = process.env.SPOONACULAR_API_KEY;
const BASE_API_URL = 'https://api.spoonacular.com/recipes';

const PORT = +process.env.PORT || 3001;

const getDatabaseUri = () => {
  return (process.env.NODE_ENV === "test")
      ? "recipe_app_test"
      : process.env.DATABASE_URL || "recipe_app";
}
  
const BCRYPT_WORK_FACTOR = process.env.NODE_ENV === 'test' ? 1 : 12;

console.log("Recipe App Config:".green);
console.log("SECRET_KEY:".yellow, SECRET_KEY);
console.log("API_KEY is present:".yellow, Boolean(API_KEY));
console.log('BASE_API_URL'.yellow, BASE_API_URL)
console.log("PORT:".yellow, PORT.toString());
console.log("BCRYPT_WORK_FACTOR".yellow, BCRYPT_WORK_FACTOR);
console.log("Database:".yellow, getDatabaseUri());
console.log("---");

module.exports = {
  SECRET_KEY,
  PORT,
  BCRYPT_WORK_FACTOR,
  getDatabaseUri,
};