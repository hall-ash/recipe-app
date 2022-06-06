const { BadRequestError } = require("../expressError");
const db = require("../database/db");

/**
 * Helper for making selective update queries.
 *
 * The calling function can use it to make the SET clause of an SQL UPDATE
 * statement.
 *
 * @param dataToUpdate {Object} {field1: newVal, field2: newVal, ...}
 * @param jsToSql {Object} maps js-style data fields to database column names,
 *   like { firstName: "first_name", age: "age" }
 *
 * @returns {Object} {sqlSetCols, dataToUpdate}
 *
 * @example {firstName: 'Aliya', age: 32} =>
 *   { setCols: '"first_name"=$1, "age"=$2',
 *     values: ['Aliya', 32] }
 */

function sqlForPartialUpdate(dataToUpdate, jsToSql={}) {
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map((colName, idx) =>
      `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

/**
 * Returns an object containing the sql conditions and values
 * for a WHERE clause.
 * 
 * @param {Object} criteria The criteria to filter records by. 
 * @param {Object} criteriaToSql The mapping of a criterion to its sql statement. 
 * @returns {Object} {whereClause, values}
 * @throws BadRequestError if no criteria are valid.
 */
 const sqlForFilterBy = (criteria, criteriaToSql) => {

  // get a list of all valid criteria by checking if criterion is in 'criteriaToSql'
  const validCriteria = Object.keys(criteria).filter(c => c in criteriaToSql);
  // if no valid criteria are provided throw err
  if (validCriteria.length === 0) throw new BadRequestError('Could not filter by criteria provided');
  
  const values = []; // values for the where clause
  
  let paramNum = 1; //params are 1-indexed
  const sqlConditions = validCriteria.filter(c => criteria[c] !== false && criteria[c] !== 'false') // ignore criteria set to false
    .map(c => {
      const sql = criteriaToSql[c];
      if (criteria[c] === true || criteria[c] === 'true') return sql;
        
      // for non-boolean values push to 'values' list and increment paramNum
      values.push(criteria[c]); 
      return sql.includes('ILIKE') ? `${sql} CONCAT('%', $${paramNum++}::text, '%')` : `${sql} $${paramNum++}`; // if matching string add '%'s
  });

  // concatenate sql conditions into string separated by AND
  const whereClause = sqlConditions.length ? 'WHERE ' + sqlConditions.join(' AND ') : '';

  return {
    whereClause,
    values
  };
};

/**
 * Checks if the record to be added to the database
 * is a duplicate.
 * 
 * @param {*} table  The table the record is being added to.
 * @param {*} pkName The column name of the primary key.
 * @param {*} pkToCheck The value of the primary key to check for.
 * @throws BadRequestError if tring to add a duplicate. 
 */
const checkDuplicate = async (table, pkName, pkToCheck ) => {

  const duplicateCheck = await db.query(`
    SELECT ${pkName}
    FROM ${table}
    WHERE ${pkName} = $1
  `, [pkToCheck]);

  if (duplicateCheck.rows[0])
    throw new BadRequestError(`Duplicate: ${pkToCheck} already exists in ${table}`);
};

/**
 * Check if a record already exists in the database.
 * 
 * @async
 * @param {String} table - The table name in the database.
 * @param {String} colName - The column name in table.
 * @param {*} colValue - The value of the column to check.
 * @returns {Promise<boolean>} true if the record already exists in the database,
 * false otherwise
 */
const recordExists = async (table, colName, colValue ) => {
  const record = await db.query(`
    SELECT COUNT(*)
    FROM ${table}
    WHERE ${colName} = $1
  `, [colValue]);
  const count = +record.rows[0].count;

  return Boolean(count);
};

module.exports = {
  sqlForFilterBy,
  sqlForPartialUpdate,
  checkDuplicate,
  recordExists,
}
