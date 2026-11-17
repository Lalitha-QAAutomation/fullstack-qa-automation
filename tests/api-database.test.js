
const { test } = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../db/connection');

const BASE_URL = 'http://localhost:3000';

test('API_DB_001 - Create employee and verify database', async () => {

    // Generate a unique email for each test run
    const uniqueEmail = `qa${Date.now()}@example.com`;

    let employeeId;

    try {
        // Step 1: Create employee through the API
        const response = await fetch(`${BASE_URL}/employees`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                first_name: 'Alice',
                last_name: 'Johnson',
                email: uniqueEmail,
                department: 'QA',
                salary: 70000
            })
        });

        // Step 2: Verify API response
        assert.equal(response.status, 201);

        const employee = await response.json();
        employeeId = employee.employee_id;

        assert.equal(employee.first_name, 'Alice');
        assert.equal(employee.email, uniqueEmail);

        // Step 3: Query PostgreSQL directly
        const result = await pool.query(
            'SELECT * FROM employees WHERE employee_id = $1',
            [employeeId]
        );

        // Step 4: Verify database values
        assert.equal(result.rowCount, 1);
        assert.equal(result.rows[0].first_name, 'Alice');
        assert.equal(result.rows[0].last_name, 'Johnson');
        assert.equal(result.rows[0].email, uniqueEmail);
        assert.equal(result.rows[0].department, 'QA');
        assert.equal(Number(result.rows[0].salary), 70000);

    } finally {
        // Clean up the employee created by this test
        if (employeeId !== undefined) {
            await pool.query(
                'DELETE FROM employees WHERE employee_id = $1',
                [employeeId]
            );
        }

        await pool.end();
    }
});
