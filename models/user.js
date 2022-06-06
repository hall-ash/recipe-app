/**
 * User model
 */

"use strict";

const db = require('../database/db');
const { sqlForPartialUpdate, checkDuplicate, recordExists } = require('../helpers/sql');
const { 
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
} = require('../expressError');
const bcrypt = require('bcrypt');
const { BCRYPT_WORK_FACTOR } = require('../config');

class User {
  /** 
   * Authenticate user with username, password.
   * 
   * @param {String} username - user's username
   * @param {String} password - user's password (unhashed)
   * @returns {Promise<object>} { username, first_name, last_name, email, is_admin }
   * @throws {UnauthorizedError} Thrown if user is not found or wrong password.
   **/

  static async authenticate(username, password) {
    // find the user
    const result = await db.query(
          `SELECT username,
                  password,
                  first_name AS "firstName",
                  last_name AS "lastName",
                  email,
                  is_admin AS "isAdmin"
           FROM users
           WHERE username = $1`,
        [username],
    );

    const user = result.rows[0];

    if (user) {
      // compare hashed password to a new hash from password
      const isValid = await bcrypt.compare(password, user.password);
      if (isValid === true) {
        delete user.password;
        return user;
      }
    }

    throw new UnauthorizedError("Invalid username/password");
  }

  /** 
   * Register user with data.
   * 
   * @param {Object} { username, password, firstName, lastName, email, isAdmin }
   * @returns {Promise<object>} { username, firstName, lastName, email, isAdmin }
   * @throws {BadRequestError} Thrown if attempt to create a duplicate user.
   **/

  static async register(
      { username, password, firstName, lastName, email, isAdmin }) {
    
    await checkDuplicate('users', 'username', username);

    const hashedPassword = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);

    const result = await db.query(
          `INSERT INTO users
           (username,
            password,
            first_name,
            last_name,
            email,
            is_admin)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING username, first_name AS "firstName", last_name AS "lastName", email, is_admin AS "isAdmin"`,
        [
          username,
          hashedPassword,
          firstName,
          lastName,
          email,
          isAdmin,
        ],
    );

    const user = result.rows[0];

    return user;
  }

  /** 
   * Find all users.
   *
   * @returns {Promise<array>} [{ username, first_name, last_name, email, isAdmin }, ...]
   **/

  static async findAll() {
    const result = await db.query(
          `SELECT username,
                  first_name AS "firstName",
                  last_name AS "lastName",
                  email,
                  is_admin AS "isAdmin"
           FROM users
           ORDER BY username`,
    );

    return result.rows;
  }

  /** 
   * Given a username, return data about user.
   *
   * @returns {Promise<object>} { username, firstName, lastName, isAdmin, email, recipes }
   *   where recipes is [recipe1_id, recipe2_id, ...]
   * @throws {NotFoundError} Thrown if user not found.
   **/

  static async get(username) {
    const userRes = await db.query(
          `SELECT username,
                  first_name AS "firstName",
                  last_name AS "lastName",
                  email,
                  is_admin AS "isAdmin"
           FROM users
           WHERE username = $1`,
        [username],
    );

    const user = userRes.rows[0];

    if (!user) throw new NotFoundError(`No user: ${username}`);

    const recipeResults = await db.query(
          `SELECT id 
           FROM recipes
           WHERE username = $1`, [username]);

    user.recipes = recipeResults.rows.map(recipe => recipe.id);
    return user;
  }

  /** 
   * Update user data.
   *
   * This is a "partial update" --- it's fine if data doesn't contain
   * all the fields; this only changes provided ones.
   * 
   * @param {Object} data - can include:  { firstName, lastName, password, email, isAdmin }
   * @returns {Promise<object>} { username, firstName, lastName, email, isAdmin }
   * @throws {NotFoundError} Thrown if user not found.
   *
   * WARNING: this function can set a new password or make a user an admin.
   * Callers of this function must be certain they have validated inputs to this
   * or a serious security risks are opened.
   */

  static async update(username, data) {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, BCRYPT_WORK_FACTOR);
    }

    const { setCols, values } = sqlForPartialUpdate(
        data,
        {
          firstName: "first_name",
          lastName: "last_name",
          isAdmin: "is_admin",
        });
    const usernameVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE users 
                      SET ${setCols} 
                      WHERE username = ${usernameVarIdx} 
                      RETURNING username,
                                first_name AS "firstName",
                                last_name AS "lastName",
                                email,
                                is_admin AS "isAdmin"`;
    const result = await db.query(querySql, [...values, username]);
    const user = result.rows[0];

    if (!user) throw new NotFoundError(`No user: ${username}`);

    delete user.password;
    return user;
  }

  /** 
   * Delete given user from database.
   * 
   * @param {String} username
   */

  static async remove(username) {
    let result = await db.query(
          `DELETE
           FROM users
           WHERE username = $1
           RETURNING username`,
        [username],
    );
    const user = result.rows[0];

    if (!user) throw new NotFoundError(`No user: ${username}`);
  }

}

module.exports = User;