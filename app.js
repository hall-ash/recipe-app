/**
 * Express app for recipe application.
 */

const express = require('express');
const cors = require('cors');
const { NotFoundError } = require('./expressError');
const { authenticateJWT } = require('./middleware/auth');
const morgan = require('morgan');

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('tiny'));
app.use(authenticateJWT);


const ROUTES_DIR = './routes';
const homeRoute = require(`${ROUTES_DIR}/home`);
app.use('/', homeRoute);

const routes = ['users', 'auth', 'recipes', 'categories'];
routes.forEach(routeName => {
  const route = require(`${ROUTES_DIR}/${routeName}`);
  (routeName === 'recipes' || routeName === 'categories') ?
    app.use(`/users/:username/${routeName}`, route) :
    app.use(`/${routeName}`, route);
});


/** Handle 404 errors -- matches everything */
app.use((req, res, next) => {
  return next(new NotFoundError());
});

/** Generic error handler; anything unhandled goes here. */
app.use((err, req, res, next) => {
  if (process.env.NODE_ENV !== "test") console.error(err.stack);
  const status = err.status || 500;
  const message = err.message;

  return res.status(status).json({
    error: { message, status },
  });
});

module.exports = app;
