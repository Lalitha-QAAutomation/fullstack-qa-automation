
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const pool = require('../db/connection');

// Read original database schema
const schemaSQL = fs.readFileSync(
    path.join(__dirname, '../db/schema.sql'),
    'utf8'
);

// Read migration SQL
const migrationSQL = fs.readFileSync(
    path.join(
        __dirname,
        '../db/migrations/001_add_employment_status.sql'
    ),
    'utf8'
);

// Close database connection pool
after(async () => {
    await pool.end();
});

// Create isolated migration test environment
async function withMigrationEnvironment(callback) {

    const client = await pool.connect();

    const schemaName =
        'migration_' + randomUUID().replace(/-/g, '');

    try {
        await client.query(`CREATE SCHEMA ${schemaName}`);

        await client.query(
            `SET search_path TO ${schemaName}`
        );

        // Create original employees table
        await client.query(schemaSQL);

        // Insert employee before migration
        const result = await client.query(
            `INSERT INTO employees
             (first_name, last_name, email, department, salary)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [
                'Alice',
                'Johnson',
                'migration@example.com',
                'IT',
                50000
            ]
        );

        const originalEmployee = result.rows[0];

        await callback(
            client,
            schemaName,
            originalEmployee
        );

    } finally {
        try {
            await client.query('ROLLBACK');
            await client.query('RESET search_path');

            await client.query(
                `DROP SCHEMA IF EXISTS ${schemaName} CASCADE`
            );
        } finally {
            client.release();
        }
    }
}

// Test 1: Verify new column is created
test('DB_MIG_001 - Verify migration adds employment status column', async () => {

    await withMigrationEnvironment(async (client, schemaName) => {

        const query = `
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_schema = $1
            AND table_name = 'employees'
            AND column_name = 'employment_status'
        `;

        const before = await client.query(
            query, [schemaName]
        );

        assert.equal(before.rowCount, 0);

        await client.query(migrationSQL);

        const after = await client.query(
            query, [schemaName]
        );

        assert.equal(after.rowCount, 1);
        assert.equal(
            after.rows[0].data_type,
            'character varying'
        );
        assert.equal(after.rows[0].is_nullable, 'NO');
    });
});

// Test 2: Verify existing employee data is preserved
test('DB_MIG_002 - Verify existing employee data is preserved', async () => {

    await withMigrationEnvironment(async (
        client, schemaName, originalEmployee
    ) => {

        await client.query(migrationSQL);

        const result = await client.query(
            'SELECT * FROM employees WHERE employee_id = $1',
            [originalEmployee.employee_id]
        );

        assert.equal(result.rowCount, 1);

        const {
            employment_status,
            ...existingData
        } = result.rows[0];

        assert.deepEqual(existingData, originalEmployee);
        assert.equal(employment_status, 'ACTIVE');
    });
});

// Test 3: Verify default employment status
test('DB_MIG_003 - Verify default employment status', async () => {

    await withMigrationEnvironment(async (client) => {

        await client.query(migrationSQL);

        const result = await client.query(
            `INSERT INTO employees
             (first_name, last_name, email, department, salary)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING employment_status`,
            [
                'John',
                'Smith',
                'default@example.com',
                'Finance',
                60000
            ]
        );

        assert.equal(
            result.rows[0].employment_status,
            'ACTIVE'
        );
    });
});

// Test 4: Verify all valid employment statuses
test('DB_MIG_004 - Verify valid employment statuses', async () => {

    await withMigrationEnvironment(async (
        client, schemaName, originalEmployee
    ) => {

        await client.query(migrationSQL);

        const validStatuses = [
            'ACTIVE',
            'INACTIVE',
            'ON_LEAVE'
        ];

        for (const status of validStatuses) {

            const result = await client.query(
                `UPDATE employees
                 SET employment_status = $1
                 WHERE employee_id = $2
                 RETURNING employment_status`,
                [status, originalEmployee.employee_id]
            );

            assert.equal(
                result.rows[0].employment_status,
                status
            );
        }
    });
});

// Test 5: Reject invalid employment status
test('DB_MIG_005 - Reject invalid employment status', async () => {

    await withMigrationEnvironment(async (
        client, schemaName, originalEmployee
    ) => {

        await client.query(migrationSQL);

        await assert.rejects(
            () => client.query(
                `UPDATE employees
                 SET employment_status = $1
                 WHERE employee_id = $2`,
                ['UNKNOWN', originalEmployee.employee_id]
            ),
            { code: '23514' }
        );

        const result = await client.query(
            `SELECT employment_status FROM employees
             WHERE employee_id = $1`,
            [originalEmployee.employee_id]
        );

        assert.equal(
            result.rows[0].employment_status,
            'ACTIVE'
        );
    });
});

// Test 6: Verify migration can be re-executed
test('DB_MIG_006 - Verify migration is safely re-executable', async () => {

    await withMigrationEnvironment(async (
        client, schemaName, originalEmployee
    ) => {

        await client.query(migrationSQL);

        await client.query(
            `UPDATE employees
             SET employment_status = $1
             WHERE employee_id = $2`,
            ['ON_LEAVE', originalEmployee.employee_id]
        );

        const before = await client.query(
            'SELECT * FROM employees ORDER BY employee_id'
        );

        // Execute the same migration again
        await client.query(migrationSQL);

        const after = await client.query(
            'SELECT * FROM employees ORDER BY employee_id'
        );

        assert.deepEqual(after.rows, before.rows);

        const columns = await client.query(
            `SELECT column_name
             FROM information_schema.columns
             WHERE table_schema = $1
             AND table_name = 'employees'
             AND column_name = 'employment_status'`,
            [schemaName]
        );

        assert.equal(columns.rowCount, 1);
    });
});
