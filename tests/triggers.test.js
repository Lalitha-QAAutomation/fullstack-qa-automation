
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
    const email = `trigger-${randomUUID()}@example.com`;

    const result = await client.query(
        `INSERT INTO employees
         (first_name, last_name, email, department, salary)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING employee_id`,
        ['John', 'Smith', email, 'IT', 50000]
    );

    return result.rows[0].employee_id;
}

// Helper function to retrieve audit records
async function getAuditRecords(client, employeeId) {
    const result = await client.query(
        `SELECT * FROM salary_audit
         WHERE employee_id = $1`,
        [employeeId]
    );

    return result.rows;
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

// Test 1: Verify audit record creation
test('DB_TRG_001 - Verify salary update creates audit record', async () => {

    await withTestEmployee(async (client, employeeId) => {

        await client.query(
            'UPDATE employees SET salary = $1 WHERE employee_id = $2',
            [60000, employeeId]
        );

        const records = await getAuditRecords(client, employeeId);

        assert.equal(records.length, 1);
    });
});

// Test 2: Verify audit record values
test('DB_TRG_002 - Verify old and new salary values', async () => {

    await withTestEmployee(async (client, employeeId) => {

        await client.query(
            'UPDATE employees SET salary = $1 WHERE employee_id = $2',
            [65000, employeeId]
        );

        const records = await getAuditRecords(client, employeeId);

        assert.equal(records.length, 1);
        assert.equal(Number(records[0].old_salary), 50000);
        assert.equal(Number(records[0].new_salary), 65000);
        assert.equal(records[0].employee_id, employeeId);
        assert.ok(records[0].changed_at);
    });
});

// Test 3: Verify unchanged salary
test('DB_TRG_003 - Verify unchanged salary creates no audit record', async () => {

    await withTestEmployee(async (client, employeeId) => {

        await client.query(
            'UPDATE employees SET salary = $1 WHERE employee_id = $2',
            [50000, employeeId]
        );

        const records = await getAuditRecords(client, employeeId);

        assert.equal(records.length, 0);
    });
});

// Test 4: Verify rollback behavior
test('DB_TRG_004 - Verify rollback removes salary audit record', async () => {

    await withTestEmployee(async (client, employeeId) => {

        await client.query('SAVEPOINT before_salary_update');

        await client.query(
            'UPDATE employees SET salary = $1 WHERE employee_id = $2',
            [70000, employeeId]
        );

        const beforeRollback = await getAuditRecords(client, employeeId);

        assert.equal(beforeRollback.length, 1);

        await client.query(
            'ROLLBACK TO SAVEPOINT before_salary_update'
        );

        const afterRollback = await getAuditRecords(client, employeeId);

        assert.equal(afterRollback.length, 0);

        const employee = await client.query(
            'SELECT salary FROM employees WHERE employee_id = $1',
            [employeeId]
        );

        assert.equal(Number(employee.rows[0].salary), 50000);
    });
});

// Test 5: Verify unrelated field update
test('DB_TRG_005 - Verify department update creates no salary audit record', async () => {

    await withTestEmployee(async (client, employeeId) => {

        await client.query(
            'UPDATE employees SET department = $1 WHERE employee_id = $2',
            ['Finance', employeeId]
        );

        const records = await getAuditRecords(client, employeeId);

        assert.equal(records.length, 0);
    });
});
