
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const pool = require('../db/connection');

after(async () => {
    await pool.end();
});

// Helper function to insert employee
async function insertEmployee(client, email, salary) {
    return client.query(
        `INSERT INTO employees
         (first_name, last_name, email, department, salary)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        ['Alice', 'Johnson', email, 'IT', salary]
    );
}

// Test 1: Atomicity
test('DB_ACID_001 - Verify failed transaction rolls back all operations', async () => {

    const client = await pool.connect();
    const email = `atomic-${randomUUID()}@example.com`;

    try {
        await client.query('BEGIN');

        // First operation succeeds
        await insertEmployee(client, email, 50000);

        // Second operation fails due to duplicate email
        await assert.rejects(
            () => insertEmployee(client, email, 60000),
            { code: '23505' }
        );

        await client.query('ROLLBACK');

        const result = await client.query(
            'SELECT * FROM employees WHERE email = $1',
            [email]
        );

        // Neither operation should be saved
        assert.equal(result.rowCount, 0);

    } finally {
        try {
            await client.query('ROLLBACK');
        } finally {
            client.release();
        }
    }
});

// Test 2: Consistency
test('DB_ACID_002 - Verify failed update preserves valid employee data', async () => {

    const client = await pool.connect();
    const email = `consistent-${randomUUID()}@example.com`;

    try {
        await client.query('BEGIN');

        const employee = await insertEmployee(
            client, email, 50000
        );

        const employeeId =
            employee.rows[0].employee_id;

        await client.query('SAVEPOINT before_update');

        // Attempt to violate salary constraint
        await assert.rejects(
            () => client.query(
                `UPDATE employees
                 SET salary = $1
                 WHERE employee_id = $2`,
                [-5000, employeeId]
            ),
            { code: '23514' }
        );

        await client.query(
            'ROLLBACK TO SAVEPOINT before_update'
        );

        const result = await client.query(
            `SELECT salary FROM employees
             WHERE employee_id = $1`,
            [employeeId]
        );

        assert.equal(
            Number(result.rows[0].salary),
            50000
        );

        // Failed update should not create an audit record
        const audit = await client.query(
            `SELECT * FROM salary_audit
             WHERE employee_id = $1`,
            [employeeId]
        );

        assert.equal(audit.rowCount, 0);

    } finally {
        try {
            await client.query('ROLLBACK');
        } finally {
            client.release();
        }
    }
});

// Test 3: Committed data persistence across connections
test('DB_ACID_003 - Verify committed data persists across database connections', async () => {

    const email = `persistence-${randomUUID()}@example.com`;
    const writer = await pool.connect();

    try {
        try {
            await writer.query('BEGIN');

            await insertEmployee(writer, email, 55000);

            await writer.query('COMMIT');

        } catch (error) {
            await writer.query('ROLLBACK');
            throw error;
        }

        // Read committed data using another connection
        const reader = await pool.connect();

        try {
            const result = await reader.query(
                'SELECT * FROM employees WHERE email = $1',
                [email]
            );

            assert.equal(result.rowCount, 1);
            assert.equal(
                Number(result.rows[0].salary),
                55000
            );

        } finally {
            reader.release();
        }

    } finally {
        try {
            await writer.query(
                'DELETE FROM employees WHERE email = $1',
                [email]
            );
        } finally {
            writer.release();
        }
    }
});
