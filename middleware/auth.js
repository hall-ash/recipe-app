/** Convenience middleware to handle common auth cases in routes. */

"use strict";

const jwt = require('jsonwebtoken');
const { SECRET_KEY } = require('../config');
const { UnauthorizedError } = require('../expressError');

/** Middleware: Authenticate user.
 *
 * If a token was provided, verify it, and, if valid, store the token payload
 * on res.locals (this will include the username and isAdmin field.)
 *
 * It's not an error if no token was provided or if the token is not valid.
 */
const authenticateJWT = (req, res, next) => {
  try {
    const authHeader = req.headers && req.headers.authorization; 
    if (authHeader) { // get JWT from req header
      const token = authHeader.replace(/^[Bb]earer /, "").trim();
      res.locals.user = jwt.verify(token, SECRET_KEY);
    }
    return next();
  } catch (err) {
    return next(); // if no token or invalid token, go to next handler
  }
}

/** Middleware to use when they must be logged in.
 *
 * If not, raises Unauthorized.
 */

const ensureLoggedIn = (req, res, next) => {
  try {
    if (!res.locals.user) {
      throw new UnauthorizedError();
    }
    return next();
  } catch (err) {
    return next(err);
  }
}

/** Middleware to use when they must be logged in as an admin user.
 *
 *  If not, raises Unauthorized.
 */

const ensureAdmin = (req, res, next) => {
  try {
    if (!res.locals.user || !res.locals.user.isAdmin) {
      throw new UnauthorizedError();
    }
    return next();
  } catch (err) {
    return next(err);
  }
}

/** Middleware to use when they must provide a valid token & be user matching
 *  username provided as route param.
 *
 *  If not, raises Unauthorized.
 */

const ensureAuthUserOrAdmin = (req, res, next) => {
  try {
    const { username } = req.params;
    const { user } = res.locals;
    if (user && (user.username === username || user.isAdmin)) {
      return next();
    }
    throw new UnauthorizedError();

  } catch (err) {
    return next(err);
  }
}

module.exports = {
  authenticateJWT,
  ensureAdmin,
  ensureAuthUserOrAdmin,
  ensureLoggedIn
}