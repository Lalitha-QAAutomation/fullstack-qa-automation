
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../db/connection');

// Close database connections after all tests
after(async () => {
    await pool.end();
});

test('DB_001 - Verify employee record exists', async () => {

    const email = `dbtest${Date.now()}@example.com`;

    try {
        // Arrange: Create test data
        await pool.query(
            `INSERT INTO employees
             (first_name, last_name, email, department, salary)
             VALUES ($1, $2, $3, $4, $5)`,
            ['John', 'Smith', email, 'IT', 65000]
        );

        // Act: Retrieve employee from database
        const result = await pool.query(
            'SELECT * FROM employees WHERE email = $1',
            [email]
        );

        // Assert: Verify stored employee details
        assert.equal(result.rowCount, 1);
        assert.equal(result.rows[0].first_name, 'John');
        assert.equal(result.rows[0].last_name, 'Smith');
        assert.equal(result.rows[0].department, 'IT');
        assert.equal(Number(result.rows[0].salary), 65000);

    } finally {
        // Cleanup: Remove test data
        await pool.query(
            'DELETE FROM employees WHERE email = $1',
            [email]
        );
    }
});



test('DB_002 - Reject duplicate employee email', async () => {

    const email = `duplicate${Date.now()}@example.com`;

    try {
        // Insert the first employee
        await pool.query(
            `INSERT INTO employees
             (first_name, last_name, email, department, salary)
             VALUES ($1, $2, $3, $4, $5)`,
            ['John', 'Smith', email, 'IT', 65000]
        );

        // Attempt to insert another employee with the same email
        await assert.rejects(
            async () => {
                await pool.query(
                    `INSERT INTO employees
                     (first_name, last_name, email, department, salary)
                     VALUES ($1, $2, $3, $4, $5)`,
                    ['Jane', 'Smith', email, 'HR', 55000]
                );
            },
            (error) => {
                assert.equal(error.code, '23505');
                return true;
            }
        );

        // Verify only one employee exists with that email
        const result = await pool.query(
            'SELECT COUNT(*)::int AS count FROM employees WHERE email = $1',
            [email]
        );

        assert.equal(result.rows[0].count, 1);

    } finally {
        await pool.query(
            'DELETE FROM employees WHERE email = $1',
            [email]
        );
    }
});


test('DB_003 - Reject negative employee salary', async () => {

    const invalidEmail = `negative${Date.now()}@example.com`;

    await assert.rejects(
        async () => {
            await pool.query(
                `INSERT INTO employees
                 (first_name, last_name, email, department, salary)
                 VALUES ($1, $2, $3, $4, $5)`,
                ['Robert', 'Brown', invalidEmail, 'Finance', -5000]
            );
        },
        (error) => {
            // PostgreSQL check constraint violation
            assert.equal(error.code, '23514');
            return true;
        }
    );

    // Verify invalid employee was not inserted
    const result = await pool.query(
        'SELECT * FROM employees WHERE email = $1',
        [invalidEmail]
    );

    assert.equal(result.rowCount, 0);
});
