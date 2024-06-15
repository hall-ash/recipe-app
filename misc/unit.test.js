"use strict";

const Unit = require('./unit');
const db = require('../database/db');
const { BadRequestError } = require("../expressError");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  ids,
} = require("../models/_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

beforeAll(async () => {
  // remove unit from db
  await db.query(`DELETE FROM units`);
})

/************************************** create */

describe("create", () => {
  const newUnit = {
    unit: 'ml',
    unitTypeId: ids.metric,
  }

  test("creates a new unit in the database and returns the unit object", async () => {
    
    const unit = await Unit.create(newUnit);

    // test returns the unit object
    expect(unit).toEqual({
      id: expect.any(Number),
      unit: 'ml',
      unitTypeId: ids.metric
    });

    const unitResult = await db.query(`
      SELECT id, unit, unit_type_id AS "unitTypeId"
      FROM units 
      WHERE unit = 'ml' 
    `);

    // test creates the unit object in the db
    expect(unitResult.rows[0]).toEqual({
      id: expect.any(Number),
      unit: 'ml',
      unitIdType: ids.metric
    });

  });

  test("throws BadRequestError if attempting to create duplicate unit", async () => {
    
    try {
      await Unit.create(newUnit);
      await Unit.create(newUnit);
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestError);
    }

  });

});

/************************************** createBatch */
describe("createBatch", () => {
  // beforeEach(async () => {
  //   await db.query(`
  //     INSERT INTO units (unit, unit_type_id)
  //     VALUES ('ml', $1), ('cups', $2) 
  //   `, [ids.metric, ids.us]);
  // });

  test("creates and returns units given an array of metric and us value pairs", async () => {
    const unitsToCreate = [
      { unit: 'dl', unitTypeId: ids.metric },
      { unit: 'lb', unitTypeId: ids.us },
    ];

    const createdUnits = await Unit.createBatch(unitsToCreate);

    expect(createdUnits).toEqual([
      {
        id: expect.any(Number),
        unit: 'dl',
        unitTypeId: ids.metric
      },
      {
        id: expect.any(Number),
        unit: 'lb',
        unitTypeId: ids.us
      },
    ]);

    const dbResult = await db.query(`
      SELECT * FROM units
    `);

    expect(dbResult.rows.length).toEqual(4);
  });

  test("does not create units that are already in the database", async () => {
    const unitsToCreate = [
      { unit: 'dl', unitTypeId: ids.metric },
      { unit: 'lb', unitTypeId: ids.us },
      { unit: 'g', unitTypeId: ids.metric }, // in database, should ignore
      { unit: 'oz', unitTypeId: ids.us }, // in database, should ignore
    ];

    const createdUnits = await Unit.createBatch(unitsToCreate);

    expect(createdUnits).toEqual([
      {
        id: expect.any(Number),
        unit: 'dl',
        unitTypeId: ids.metric
      },
      {
        id: expect.any(Number),
        unit: 'lb',
        unitTypeId: ids.us
      },
    ]);

    const dbResult = await db.query(`
      SELECT * FROM units
    `);

    expect(dbResult.rows.length).toEqual(4);
  });

  test("ignores duplicate value pairs in the given array", async () => {
    const unitsToCreate = [
      { unit: 'dl', unitTypeId: ids.metric },
      { unit: 'lb', unitTypeId: ids.us },
      { unit: 'dl', unitTypeId: ids.metric }, // dupe, should ignore
    ];

    const createdUnits = await Unit.createBatch(unitsToCreate);

    expect(createdUnits).toEqual([
      {
        id: expect.any(Number),
        unit: 'dl',
        unitTypeId: ids.metric
      },
      {
        id: expect.any(Number),
        unit: 'lb',
        unitTypeId: ids.us
      },
    ]);

    const dbResult = await db.query(`
      SELECT * FROM units
    `);

    expect(dbResult.rows.length).toEqual(4);
  });

});

/************************************** _filterPreExisting */
describe("_filterPreExisting", () => {
  beforeEach(async () => {
    await db.query(`
      INSERT INTO units (metric_unit, us_unit)
      VALUES ('g', 'oz'), ('ml', 'cups')
    `);
  });

  test("filters out units that exist in the database", async () => {
    const units = [
      { metricUnit: 'g', usUnit: 'lb'},
      { metricUnit: 'g', usUnit: 'oz'},
      { metricUnit: 'ml', usUnit: 'cups'},
    ];

    const filtered = await Unit._filterPreExisting(units);

    expect(filtered).toEqual([{ metricUnit: 'g', usUnit: 'lb'}]);
  });

  test("filters out duplicate units", async () => {
    const units = [
      { metricUnit: 'g', usUnit: 'lb'},
      { metricUnit: 'g', usUnit: 'oz'},
      { metricUnit: 'ml', usUnit: 'cups'},
      { metricUnit: 'g', usUnit: 'lb'},
    ];

    const filtered = await Unit._filterPreExisting(units);

    expect(filtered).toEqual([{ metricUnit: 'g', usUnit: 'lb'}]);
  })
});

/************************************** getIds */
describe("getIds", () => {
  let ids;
  beforeEach(async () => {
    ids = (await db.query(`
      INSERT INTO units (metric_unit, us_unit)
      VALUES ('g', 'oz'), ('ml', 'cups')
      RETURNING id
    `)).rows.map(u => u.id);
  });

  test("returns the unit ids given an array of metric and us value pairs", async () => {
    const values = [
      { metricUnit: 'g', usUnit: 'oz'},
      { metricUnit: 'ml', usUnit: 'cups'},
    ];
    
    const unitIds = await Unit.getIds(values);

    expect(unitIds).toEqual(ids);
  });
})


/************************************** getId */

// describe("getIds", () => {
//   const newUnit = {
//     metricUnit: 'ml',
//     usUnit: 'cups'
//   }
//   let unit;

//   beforeAll(async () => unit = await Unit.create(newUnit));

//   test("returns the correct id given a unit's metric and us units", async () => {
//     const id = await Unit.getId(newUnit);
//     expect(id).toEqual(unit.id);
//   });

//   test("returns the id and creates the unit if it doesn't exist in the database", async () => {
    
//     // check that unit is not in db
//     expect((await db.query(`
//       SELECT id FROM units
//       WHERE metric_unit = 'g' AND us_unit = 'oz'
//     `)).rows[0]).toBeUndefined();
    
//     const unitToAdd = {
//       metricUnit: 'g',
//       usUnit: 'oz'
//     }
  
//     // check that it returns id
//     const id = await Unit.getId(unitToAdd);
//     expect(id).toEqual(expect.any(Number));

//     const unitResult = await db.query(`
//       SELECT id, metric_unit, us_unit
//       FROM units 
//       WHERE metric_unit = 'g' AND us_unit = 'oz'
//     `);

//     // check that unit is created in db
//     expect(unitResult.rows[0]).toEqual({
//       id: expect.any(Number),
//       metric_unit: 'g',
//       us_unit: 'oz'
//     });
//   });

//   test("returns list of unit ids", async () => {
//     const units = [
//       { metricUnit: 'g', usUnit: 'oz' }, 
//       { metricUnit: 'ml', usUnit: 'cups' }, 
//       {metricUnit: 'g', usUnit: 'oz'},
//     ];

//     // const ids = await Promise.all(units.map(u => Unit.getId(u)));
//     const ids = await Promise.all(units.map(async(u) => await Unit.getId(u)));
    
//     expect(ids).toEqual([expect.any(Number), expect.any(Number), expect.any(Number)]);
//   });
// })