
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../db/connection');

// Close the database pool after all tests finish
after(async () => {
    await pool.end();
});

test('DB_TXN_001 - Verify transaction rollback', async () => {

    // Get one dedicated database connection
    const client = await pool.connect();

    const email = `rollback${Date.now()}@example.com`;

    let transactionStarted = false;

    try {
        // Step 1: Start a transaction
        await client.query('BEGIN');
        transactionStarted = true;

        // Step 2: Insert an employee
        await client.query(
            `INSERT INTO employees
             (first_name, last_name, email, department, salary)
             VALUES ($1, $2, $3, $4, $5)`,
            ['David', 'Wilson', email, 'IT', 75000]
        );

        // Step 3: Verify employee exists inside the transaction
        const insideTransaction = await client.query(
            'SELECT * FROM employees WHERE email = $1',
            [email]
        );

        assert.equal(insideTransaction.rowCount, 1);
        assert.equal(insideTransaction.rows[0].first_name, 'David');

        // Step 4: Roll back the transaction
        await client.query('ROLLBACK');
        transactionStarted = false;

        // Step 5: Verify employee was not permanently saved
        const afterRollback = await client.query(
            'SELECT * FROM employees WHERE email = $1',
            [email]
        );

        assert.equal(afterRollback.rowCount, 0);

    } finally {
        // Roll back if an earlier step failed
        if (transactionStarted) {
            await client.query('ROLLBACK');
        }

        // Release the connection back to the pool
        client.release();
    }
});

test('DB_TXN_002 - Verify transaction commit and isolation', async () => {

    const client1 = await pool.connect();
    let client2;
    const email = `commit${Date.now()}@example.com`;
    let transactionStarted = false;

    try {
        client2 = await pool.connect();

        // Step 1: Start transaction on connection 1
        await client1.query('BEGIN');
        transactionStarted = true;

        // Step 2: Insert employee but do not commit yet
        await client1.query(
            `INSERT INTO employees
             (first_name, last_name, email, department, salary)
             VALUES ($1, $2, $3, $4, $5)`,
            ['Emma', 'Taylor', email, 'Finance', 80000]
        );

        // Step 3: Connection 1 can see its own uncommitted data
        const insideTransaction = await client1.query(
            'SELECT * FROM employees WHERE email = $1',
            [email]
        );

        assert.equal(insideTransaction.rowCount, 1);

        // Step 4: Connection 2 cannot see uncommitted data
        const beforeCommit = await client2.query(
            'SELECT * FROM employees WHERE email = $1',
            [email]
        );

        assert.equal(beforeCommit.rowCount, 0);

        // Step 5: Commit the transaction
        await client1.query('COMMIT');
        transactionStarted = false;

        // Step 6: Connection 2 can now see the committed data
        const afterCommit = await client2.query(
            'SELECT * FROM employees WHERE email = $1',
            [email]
        );

        assert.equal(afterCommit.rowCount, 1);
        assert.equal(afterCommit.rows[0].first_name, 'Emma');

    } finally {
        // Undo an unfinished transaction if necessary
        if (transactionStarted) {
            await client1.query('ROLLBACK');
        }

        // Clean up the employee created by this test
        await pool.query(
            'DELETE FROM employees WHERE email = $1',
            [email]
        );

        client1.release();

        if (client2) {
            client2.release();
        }
    }
});
