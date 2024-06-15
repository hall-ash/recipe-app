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


// beforeAll(async () => {
//   // remove instructions from recipe
//   await db.query(`DELETE FROM instructions WHERE recipe_id = ${ids.recipe}`);
// })

/************************************** _getCount */
describe("_getCount", () => {

  test("returns 0 if a recipe has no instructions", async () => {
    // remove instructions from recipe
    await db.query(`DELETE FROM instructions WHERE recipe_id = ${ids.recipe}`);

    const count = await Instruction._getCount(ids.recipe);
    expect(count).toEqual(0);
  });

  test("returns the number of instructions for a recipe", async () => {

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
      WHERE recipe_id = ${ids.recipe} AND id = $1
    `, [instruction.id]);

    expect(dbResult.rows[0]).toEqual(instruction);
 
  });

  test("if there are no instructions for a recipe, adds the new instruction as step 1", async () => {
    // remove instructions from recipe
    await db.query(`DELETE FROM instructions WHERE recipe_id = ${ids.recipe}`);

    await Instruction.create(ids.recipe, 'instruction text');

    const dbResult = await db.query(`
      SELECT ordinal
      FROM instructions
      WHERE recipe_id = ${ids.recipe}
    `);

    expect(dbResult.rows[0].ordinal).toEqual(1);

  });

  test("appends the new instruction to the end of a recipe's instructions", async () => {

    const instr = await Instruction.create(ids.recipe, 'step 4');

    const dbResult = await db.query(`
      SELECT ordinal
      FROM instructions
      WHERE recipe_id = ${ids.recipe} AND id = ${instr.id}
    `);

    expect(dbResult.rows[0].ordinal).toEqual(4);
    
  });

  test(`creates multiple instructions for the 
        given recipe when passed an array of instruction data
        and returns an array of the new instructions`, async () => {

    // remove instructions from recipe
    await db.query(`DELETE FROM instructions WHERE recipe_id = ${ids.recipe}`);

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

  test(`creates multiple instructions and appends them to the end of
        the recipe's instructions`, async () => {

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

/************************************** getAll */

describe("getAll", () => {
  test("gets all instructions for recipe", async () => {
    const instructions = await Instruction.getAll(ids.recipe);

    expect(instructions).toEqual([
      {
        id: ids.instructions[0],
        recipeId: ids.recipe,
        ordinal: 1,
        step: 'step 1',
      },
      {
        id: ids.instructions[1],
        recipeId: ids.recipe,
        ordinal: 2,
        step: 'step 2',
      },
      {
        id: ids.instructions[2],
        recipeId: ids.recipe,
        ordinal: 3,
        step: 'step 3',
      },
    ]);

  });

  test("returns empty array if recipe not found", async () => {
    const instructions = await Instruction.getAll(-1);
    expect(instructions).toEqual([])
  })


});

/************************************** update */

describe("update", () => {

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

  test('updates a single instruction', async () => {
    const data = {
      ordinal: 10,
      step: 'updated step'
    }

    const instruction = await Instruction.update(ids.instructions[0], data);

    expect(instruction).toEqual({
      id: ids.instructions[0],
      recipeId: ids.recipe,
      ordinal: 10,
      step: 'updated step',
    });

    const dbResult = await db.query(`
      SELECT id, ordinal, step, recipe_id AS "recipeId" FROM instructions
      WHERE id = $1
    `, [ids.instructions[0]]);

    expect(dbResult.rows[0]).toEqual(instruction);
  });

  test("if updating single instruction, throws NotFoundError if instruction not found", async () => {
    const data = {
      ordinal: 10,
      step: 'updated step'
    }

    try {
      await Instruction.update(-1, data)
    } catch (e) {
      expect(e).toBeInstanceOf(NotFoundError);
    }
  })

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

    const numInstructionsBeforeRemove = (await db.query(`
      SELECT * FROM instructions
    `)).rows.length;
   
    // remove instruction
    await Instruction.remove(instructionId);

    
    const numInstructionsAfterRemove = (await db.query(`
      SELECT * FROM instructions
    `)).rows.length;
    
    // check that there is 1 less instruction in db
    expect(numInstructionsAfterRemove).toEqual(numInstructionsBeforeRemove - 1);

  });

  test("throws NotFoundError if instruction is not in database", async () => {
    try {
      await Instruction.remove(-1);
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundError);
    }
  });
});


