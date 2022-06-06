/**
 * Unit model
 */

 "use strict";

const db = require('../database/db');
const _ = require('lodash');
const { sqlForPartialUpdate, checkDuplicate, recordExists } = require('../helpers/sql');
const { 
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
} = require('../expressError');

class Unit {

  /**
   * Create a unit.
   * 
   * @param {Object} { metricUnit, usUnit }
   * @returns {Promise<Number>} unit - { id, metricUnit, usUnit }
   * @throws {BadRequestError} Thrown if attempting to create duplicate.
   */
  static async create({ metricUnit, usUnit }) {

    const unitExists = await db.query(`
      SELECT * FROM units
      WHERE metric_unit = $1 
      AND us_unit = $2
    `, [metricUnit, usUnit]);
    if (unitExists.rows[0]) throw new BadRequestError('Unit already exists in database.');

    const unit = (await db.query(`
      INSERT INTO units
      (metric_unit, us_unit) VALUES ($1, $2)
      RETURNING id, metric_unit AS "metricUnit", us_unit AS "usUnit"
    `, [metricUnit, usUnit])).rows[0];

    return unit; // return unit 
  }

  /**
   * Create units from an array. Ignores any units that are already in the database.
   * 
   * @param {Array<object>} unitValues - [{ metricUnit, usUnit }, ...]
   * @returns {Promise<array>} units - [{ id, metricUnit, usUnit }, ...] 
   */
    static async createBatch(unitValues) {
    // filter out duplicate units and units that already exist in db
    const unitsToCreate = await this._filterPreExisting(unitValues);

    if (!unitsToCreate.length) return [];

    // get array of metric and us values
    const values = unitsToCreate.reduce((acc, u) => {
      acc.push(u.metricUnit);
      acc.push(u.usUnit);
      return acc;
    }, []);

    // create param str $(1, 2), $(3, 4), ...
    const length = unitsToCreate.length;
    const paramStr = Array.from({ length }, (v, i) => {
      const n = i * 2;
      return `($${n + 1}, $${n + 2})`
    }).join(', ');

    const createdUnits = await db.query(`
      INSERT INTO units (metric_unit, us_unit)
      VALUES ${paramStr}
      RETURNING id, metric_unit AS "metricUnit", us_unit AS "usUnit"
    `, [...values]);

    return createdUnits.rows;
  }

  /**
   * Filters out units that already exist in the database and duplicate units.
   * Returns a string of unique unit objects that do not exist in the database.
   * 
   * @param {Array<object>} units - [{ metricUnit, usUnit }, ...]
   * @returns {Promise<object>} filteredUnits - [{ metricUnit, usUnit }, ...]
   */
   static async _filterPreExisting(units) {
    // filter out duplicate units
    const uniqueUnits = _.uniqWith(units, _.isEqual);

     // get all unit ids in db
     const unitsInDb = (await db.query(`SELECT metric_unit AS "metricUnit", us_unit AS "usUnit"
                                        FROM units`)).rows;
     
     // filter out units already in database
     return _.differenceWith(uniqueUnits, unitsInDb, _.isEqual);
  }
  

  /**
   * Get the unit id from its metric and us units.
   * If unit does not exist, create unit and return id.
   * 
   * @param {String} metricUnit 
   * @param {String} usUnit 
   * @returns {Promise<number>} the unit id
   */
   static async getId({ metricUnit, usUnit }) {

    const sqlToSelect = `SELECT id FROM units
                         WHERE metric_unit = $1 AND us_unit = $2`;
    const sqlToCreate = `INSERT INTO units
                         (metric_unit, us_unit) VALUES ($1, $2)
                         RETURNING id`;
    
    // get unit 
    const unit = (await db.query(sqlToSelect, [metricUnit, usUnit])).rows[0] ||
               (await db.query(sqlToCreate, [metricUnit, usUnit])).rows[0];
               console.log(unit)
    return unit.id;
  }

  /**
   * Get ids given an array of units where unit: { metricUnit, usUnit }
   * 
   * @pre Units exist in the database.
   * @param {Array<object>} units - [{ metricUnit, usUnit }, ...]
   * @returns {Promise<array>} unitIds - [id1, id2, id3] where id is integer
   */
  static async getIds(units) {
    if (!units.length) return [];
    
    const unitResults = await Promise.all(units.map(({ metricUnit, usUnit }) => {
      return db.query(`SELECT id FROM units 
                       WHERE metric_unit = $1 AND us_unit = $2`
                       , [metricUnit, usUnit]);
    }));
    return unitResults.map(u => u.rows[0].id);
  }


  

}

module.exports = Unit;