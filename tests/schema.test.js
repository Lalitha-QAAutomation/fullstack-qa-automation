
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../db/connection');

after(async () => {
    await pool.end();
});

// Verify required columns exist with correct types
test('DB_SCHEMA_001 - Verify employee table columns', async () => {

    const result = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'employees'
    `);

    const columns = Object.fromEntries(
        result.rows.map(row => [row.column_name, row])
    );

    assert.equal(columns.employee_id.data_type, 'integer');
    assert.equal(columns.first_name.data_type, 'character varying');
    assert.equal(columns.last_name.data_type, 'character varying');
    assert.equal(columns.email.data_type, 'character varying');
    assert.equal(columns.salary.data_type, 'numeric');

    assert.equal(columns.first_name.is_nullable, 'NO');
    assert.equal(columns.last_name.is_nullable, 'NO');
    assert.equal(columns.email.is_nullable, 'NO');
});

// Verify primary key exists
test('DB_SCHEMA_002 - Verify employee primary key', async () => {

    const result = await pool.query(`
        SELECT a.attname AS column_name
        FROM pg_constraint c
        JOIN pg_attribute a
          ON a.attrelid = c.conrelid
         AND a.attnum = ANY(c.conkey)
        WHERE c.conrelid = 'public.employees'::regclass
          AND c.contype = 'p'
    `);

    assert.equal(result.rowCount, 1);
    assert.equal(result.rows[0].column_name, 'employee_id');
});

// Verify email uniqueness constraint
test('DB_SCHEMA_003 - Verify unique email constraint', async () => {

    const result = await pool.query(`
        SELECT a.attname AS column_name
        FROM pg_constraint c
        JOIN pg_attribute a
          ON a.attrelid = c.conrelid
         AND a.attnum = ANY(c.conkey)
        WHERE c.conrelid = 'public.employees'::regclass
          AND c.contype = 'u'
    `);

    assert.ok(
        result.rows.some(row => row.column_name === 'email'),
        'Email must have a UNIQUE constraint'
    );
});

// Verify salary check constraint

test('DB_SCHEMA_004 - Verify salary check constraint', async () => {

    const result = await pool.query(`
        SELECT pg_get_constraintdef(oid) AS definition
        FROM pg_constraint
        WHERE conrelid = 'public.employees'::regclass
          AND contype = 'c'
    `);

    console.log('CHECK constraints:', result.rows);

    assert.ok(
        result.rows.some(row =>
            /salary\s*>=\s*\(?0/.test(row.definition)
        ),
        'Salary must have a non-negative CHECK constraint'
    );
});
