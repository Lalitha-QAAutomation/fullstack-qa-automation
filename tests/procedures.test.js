
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const pool = require('../db/connection');

// Close database pool after all tests
after(async () => {
    await pool.end();
});

// Helper function to create test employee
async function createEmployee(client) {
    const email = `procedure-${randomUUID()}@example.com`;

    const result = await client.query(
        `INSERT INTO employees
         (first_name, last_name, email, department, salary)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING employee_id`,
        ['Alice', 'Johnson', email, 'IT', 50000]
    );

    return result.rows[0].employee_id;
}

// Helper function for test isolation and cleanup
async function withTestEmployee(callback) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const employeeId = await createEmployee(client);

        await callback(client, employeeId);

    } finally {
        try {
            await client.query('ROLLBACK');
        } finally {
            client.release();
        }
    }
}

// Helper function to retrieve employee salary
async function getSalary(client, employeeId) {
    const result = await client.query(
        'SELECT salary FROM employees WHERE employee_id = $1',
        [employeeId]
    );

    return Number(result.rows[0].salary);
}

// Helper function to verify rejected procedure calls
async function verifyRejectedCall(
    client, employeeId, percentage, errorCode
) {
    await client.query('SAVEPOINT before_procedure');

    await assert.rejects(
        () => client.query(
            'CALL increase_employee_salary($1, $2)',
            [employeeId, percentage]
        ),
        { code: errorCode }
    );

    await client.query(
        'ROLLBACK TO SAVEPOINT before_procedure'
    );
}

// Test 1: Valid salary increase
test('DB_PROC_001 - Verify valid salary increase', async () => {

    await withTestEmployee(async (client, employeeId) => {

        await client.query(
            'CALL increase_employee_salary($1, $2)',
            [employeeId, 10]
        );

        const salary = await getSalary(client, employeeId);

        assert.equal(salary, 55000);
    });
});

// Test 2: Negative percentage
test('DB_PROC_002 - Reject negative percentage', async () => {

    await withTestEmployee(async (client, employeeId) => {

        await verifyRejectedCall(
            client, employeeId, -10, '22023'
        );

        assert.equal(
            await getSalary(client, employeeId),
            50000
        );
    });
});

// Test 3: Zero percentage
test('DB_PROC_003 - Reject zero percentage', async () => {

    await withTestEmployee(async (client, employeeId) => {

        await verifyRejectedCall(
            client, employeeId, 0, '22023'
        );

        assert.equal(
            await getSalary(client, employeeId),
            50000
        );
    });
});

// Test 4: Percentage above maximum
test('DB_PROC_004 - Reject percentage above 100', async () => {

    await withTestEmployee(async (client, employeeId) => {

        await verifyRejectedCall(
            client, employeeId, 101, '22023'
        );

        assert.equal(
            await getSalary(client, employeeId),
            50000
        );
    });
});

// Test 5: Nonexistent employee
test('DB_PROC_005 - Reject nonexistent employee', async () => {

    await withTestEmployee(async (client, employeeId) => {

        // Delete the test employee to ensure the ID does not exist
        await client.query(
            'DELETE FROM employees WHERE employee_id = $1',
            [employeeId]
        );

        await verifyRejectedCall(
            client, employeeId, 10, 'P0002'
        );
    });
});

// Test 6: Stored procedure and trigger integration
test('DB_PROC_006 - Verify procedure and trigger integration', async () => {

    await withTestEmployee(async (client, employeeId) => {

        await client.query(
            'CALL increase_employee_salary($1, $2)',
            [employeeId, 20]
        );

        const salary = await getSalary(client, employeeId);

        assert.equal(salary, 60000);

        const audit = await client.query(
            `SELECT * FROM salary_audit
             WHERE employee_id = $1`,
            [employeeId]
        );

        assert.equal(audit.rowCount, 1);
        assert.equal(Number(audit.rows[0].old_salary), 50000);
        assert.equal(Number(audit.rows[0].new_salary), 60000);
        assert.equal(audit.rows[0].employee_id, employeeId);
    });
});
