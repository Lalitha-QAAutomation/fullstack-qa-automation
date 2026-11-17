
const { test } = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../db/connection');

const BASE_URL = 'http://localhost:3000';

// API_NEG_001 - Reject duplicate employee email
test('API_NEG_001 - Reject duplicate employee email', async () => {

    const email = `duplicate${Date.now()}@example.com`;

    let employeeId;

    try {
        // Create first employee
        const firstResponse = await fetch(`${BASE_URL}/employees`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                first_name: 'Jane',
                last_name: 'Smith',
                email,
                department: 'HR',
                salary: 55000
            })
        });

        assert.equal(firstResponse.status, 201);

        const employee = await firstResponse.json();
        employeeId = employee.employee_id;

        // Attempt to create another employee with the same email
        const duplicateResponse = await fetch(`${BASE_URL}/employees`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                first_name: 'Another',
                last_name: 'Employee',
                email,
                department: 'IT',
                salary: 60000
            })
        });

        assert.equal(duplicateResponse.status, 409);

        const responseBody = await duplicateResponse.json();
        assert.equal(responseBody.error, 'Employee email already exists');

        // Confirm only one record exists in PostgreSQL
        const result = await pool.query(
            'SELECT COUNT(*)::int AS count FROM employees WHERE email = $1',
            [email]
        );

        assert.equal(result.rows[0].count, 1);

    } finally {
        // Clean up test data using its unique email
        await pool.query(
            'DELETE FROM employees WHERE email = $1',
            [email]
        );
    }
});


// API_NEG_002 - Reject negative salary
test('API_NEG_002 - Reject negative salary', async () => {

    const email = `negative${Date.now()}@example.com`;

    try {
        const response = await fetch(`${BASE_URL}/employees`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                first_name: 'Robert',
                last_name: 'Brown',
                email,
                department: 'Finance',
                salary: -5000
            })
        });

        assert.equal(response.status, 400);

        const body = await response.json();
        assert.equal(body.error, 'Invalid employee data');

        // Verify invalid employee was not saved
        const result = await pool.query(
            'SELECT COUNT(*)::int AS count FROM employees WHERE email = $1',
            [email]
        );

        assert.equal(result.rows[0].count, 0);

    } finally {
        await pool.query(
            'DELETE FROM employees WHERE email = $1',
            [email]
        );
    }
});


// API_NEG_003 - Reject missing required fields
test('API_NEG_003 - Reject missing required fields', async () => {

    const response = await fetch(`${BASE_URL}/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            first_name: '',
            last_name: 'Tester',
            email: '',
            department: 'QA',
            salary: 40000
        })
    });

    assert.equal(response.status, 400);

    const body = await response.json();
    assert.equal(body.error, 'Invalid employee data');
});
