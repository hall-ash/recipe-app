/** Database setup */

"use strict";

const { Client } = require("pg");
const { getDatabaseUri } = require("../config");


const config = process.env.NODE_ENV === 'production' ?
  {
    connectionString: getDatabaseUri(),
    ssl : {
      rejectUnauthorized: false
    }
  } :
  { connectionString: getDatabaseUri() };

const db = new Client(config);

db.connect()

module.exports = db;