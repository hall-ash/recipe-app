"use strict";

const Instruction = require('./instruction');
const db = require('../database/db');
const { BadRequestError, NotFoundError } = require("../expressError");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  ids,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);


beforeAll(async () => {
  // remove instructions from recipe
  await db.query(`DELETE FROM instructions WHERE recipe_id = ${ids.recipe}`);
})

/************************************** _getCount */
describe("_getCount", () => {

  test("returns 0 if a recipe has no instructions", async () => {
    const count = await Instruction._getCount(ids.recipe);
    expect(count).toEqual(0);
  });

  test("returns the number of instructions for a recipe", async () => {
    // add instructions
    await db.query(`
      INSERT INTO instructions
      (recipe_id, ordinal, step)
      VALUES (${ids.recipe}, 1, 'step 1'),
             (${ids.recipe}, 2, 'step 2'),
             (${ids.recipe}, 3, 'step 3')
    `);

    const count = await Instruction._getCount(ids.recipe);
    expect(count).toEqual(3);
  });

});

/************************************** create */
describe("create", () => {

  test("creates a new instruction in the database and returns the instruction", async () => {
    
    const instruction = await Instruction.create(ids.recipe, 'instruction text');

    const dbResult = await db.query(`
      SELECT id, recipe_id AS "recipeId", ordinal, step
      FROM instructions
      WHERE recipe_id = ${ids.recipe}
    `);

    expect(dbResult.rows[0]).toEqual(instruction);
 
  });

  test("if there are no instructions for a recipe, adds the new instruction as step 1", async () => {

    await Instruction.create(ids.recipe, 'instruction text');

    const dbResult = await db.query(`
      SELECT ordinal
      FROM instructions
      WHERE recipe_id = ${ids.recipe}
    `);

    expect(dbResult.rows[0].ordinal).toEqual(1);

  });

  test("appends the new instruction to the end of a recipe's instructions", async () => {

    // add instructions
    await db.query(`
      INSERT INTO instructions
      (recipe_id, ordinal, step)
      VALUES (${ids.recipe}, 1, 'step 1'),
             (${ids.recipe}, 2, 'step 2'),
             (${ids.recipe}, 3, 'step 3')
    `);

    const instr = await Instruction.create(ids.recipe, 'step 4');

    const dbResult = await db.query(`
      SELECT ordinal
      FROM instructions
      WHERE recipe_id = ${ids.recipe} AND id = ${instr.id}
    `);

    expect(dbResult.rows[0].ordinal).toEqual(4);
    
  });

  test(`creates multiple instructions for the 
        given recipe when passed an array of instructions
        and returns an array of the instructions`, async () => {
    const steps = ['step1', 'step2', 'step3'];

    const instructions = await Instruction.create(ids.recipe, steps);

    const dbResult = await db.query(`
      SELECT id,
             recipe_id AS "recipeId",
             ordinal,
             step
      FROM instructions
      WHERE recipe_id = ${ids.recipe}
    `);

    expect(dbResult.rows).toEqual(instructions);
  });

  test(`creates a new instruction for the given recipe when passed
        an array of length 1 and returns an array of that instruction`, async () => {
    const instructions = await Instruction.create(ids.recipe, 'step 1');

    const dbResult = await db.query(`
      SELECT id,
              recipe_id AS "recipeId",
              ordinal,
              step
      FROM instructions
      WHERE recipe_id = ${ids.recipe}
    `);

    expect(dbResult.rows).toEqual([instructions]);
  });

  test(`creates multiple instructions and appends them to the end of
        the recipe's instructions`, async () => {
    // add first set instructions
    await db.query(`
      INSERT INTO instructions
      (recipe_id, ordinal, step)
      VALUES (${ids.recipe}, 1, 'step 1'),
            (${ids.recipe}, 2, 'step 2'),
            (${ids.recipe}, 3, 'step 3')
    `);

    // add 2nd set instructions
    const instructions = await Instruction.create(ids.recipe, ['step 4', 'step 5']);

    const dbResult = await db.query(`
      SELECT * FROM instructions
      WHERE recipe_id = ${ids.recipe}
    `);
    expect(dbResult.rows.length).toEqual(5); 

    expect(instructions).toEqual([
      {
        id: expect.any(Number),
        recipeId: ids.recipe,
        ordinal: 4,
        step: 'step 4',
      }, 
      {
        id: expect.any(Number),
        recipeId: ids.recipe,
        ordinal: 5,
        step: 'step 5',
      }
    ])
  });

});

/************************************** update */

describe("update", () => {

  beforeEach(async () => {
    // add instructions to recipe
    await db.query(`
    INSERT INTO instructions
    (recipe_id, ordinal, step)
    VALUES (${ids.recipe}, 1, 'step 1'),
          (${ids.recipe}, 2, 'step 2'),
          (${ids.recipe}, 3, 'step 3')
    `);
  });

  test(`updates instructions in the database and returns 
        an array of all instruction objects for that recipe`, async () => {

    const toUpdate = ['new step 1', 'new step 2', 'new step 3'];
    const updated = await Instruction.update(ids.recipe, toUpdate);

    const dbResult = await db.query(`
      SELECT id, ordinal, step, recipe_id AS "recipeId"
      FROM instructions
      WHERE recipe_id = ${ids.recipe}
    `);

    expect(dbResult.rows).toEqual(updated);
  });

  test(`updates instructions in the database and creates instructions
        if length of instructions to update > length of current instructions`, async () => {

    // check that 3 instructions are in recipe
    expect((await db.query(`
      SELECT * FROM instructions
      WHERE recipe_id = ${ids.recipe}
    `)).rows.length).toEqual(3);

    const toUpdate = ['new step 1', 'new step 2', 'new step 3', 'new step 4'];
    
    const updated = await Instruction.update(ids.recipe, toUpdate);

    const dbResult = await db.query(`
      SELECT id, ordinal, step, recipe_id AS "recipeId"
      FROM instructions
      WHERE recipe_id = ${ids.recipe}
    `);

    // use Set: order of elements doesn't matter
    expect(new Set(dbResult.rows)).toEqual(new Set(updated));
  });

  test(`updates instructions in the database and deletes instructions
        if length of instructions to update < length of current instructions`, async () => {

    // check that 3 instructions are in recipe
    expect((await db.query(`
      SELECT * FROM instructions
      WHERE recipe_id = ${ids.recipe}
    `)).rows.length).toEqual(3);

    const toUpdate = ['new step 1', 'new step 2'];
    
    const updated = await Instruction.update(ids.recipe, toUpdate);

    const dbResult = await db.query(`
      SELECT id, ordinal, step, recipe_id AS "recipeId"
      FROM instructions
      WHERE recipe_id = ${ids.recipe}
    `);

    // use Set: order of elements doesn't matter
    expect(new Set(dbResult.rows)).toEqual(new Set(updated));
    expect(dbResult.rows.length).toEqual(2);
  });

});

/************************************** remove */

describe("remove", () => {

  let instructionId;
  beforeEach(async () => {
    // add instruction to recipe
    instructionId = (await db.query(`
      INSERT INTO instructions
      (recipe_id, ordinal, step)
      VALUES (${ids.recipe}, 1, 'step 1')
      RETURNING id
    `)).rows[0].id;
  });

  test("removes the instruction from the database", async () => {

    // check that db has 1 instruction
    expect((await db.query(`
      SELECT * FROM instructions
    `)).rows.length).toEqual(1);

    // remove instruction
    await Instruction.remove(instructionId);

    // check that there are 0 instructions in database
    expect((await db.query(`
      SELECT * FROM instructions
    `)).rows.length).toEqual(0);

  });

  test("throws NotFoundError if instruction is not in database", async () => {
    try {
      await Instruction.remove(-1);
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundError);
    }
  });
});


