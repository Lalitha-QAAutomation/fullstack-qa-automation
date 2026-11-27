
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const pool = require('../db/connection');

const BASE_URL = `http://localhost:${process.env.PORT || 3000}`;

// Generate unique employee test data
function createTestData() {
    return {
        first_name: 'Alice',
        last_name: 'Johnson',
        email: `component_${randomUUID()}@example.com`,
        department: 'Finance',
        salary: 60000
    };
}

// Create employee through API
async function createEmployee(data) {
    return fetch(`${BASE_URL}/employees`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
}

// Update employee status through API
async function updateStatus(employeeId, status) {
    return fetch(
        `${BASE_URL}/employees/${employeeId}/status`,
        {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                employment_status: status
            })
        }
    );
}

// Clean up test employee
async function cleanupEmployee(email) {
    await pool.query(
        'DELETE FROM employees WHERE email = $1',
        [email]
    );
}

// COMP_001
test('COMP_001 - Verify normalized employee data is stored in database', async () => {

    const data = createTestData();

    try {
        const response = await createEmployee({
            ...data,
            first_name: '  aLICE  ',
            last_name: 'jOHNSON',
            email: `  ${data.email.toUpperCase()}  `,
            department: '  Finance  '
        });

        assert.equal(response.status, 201);

        const body = await response.json();

        assert.equal(body.first_name, 'Alice');
        assert.equal(body.last_name, 'Johnson');
        assert.equal(body.email, data.email);
        assert.equal(body.department, 'Finance');

        const result = await pool.query(
            'SELECT * FROM employees WHERE email = $1',
            [data.email]
        );

        assert.equal(result.rowCount, 1);

        const employee = result.rows[0];

        assert.equal(employee.first_name, 'Alice');
        assert.equal(employee.last_name, 'Johnson');
        assert.equal(employee.email, data.email);
        assert.equal(employee.department, 'Finance');
        assert.equal(Number(employee.salary), 60000);
        assert.equal(employee.employment_status, 'ACTIVE');

    } finally {
        await cleanupEmployee(data.email);
    }
});

// COMP_002
test('COMP_002 - Reject employee with invalid email format', async () => {

    const data = createTestData();
    data.email = `invalid_${randomUUID()}`;

    try {
        const response = await createEmployee(data);

        assert.equal(response.status, 400);

        const body = await response.json();

        assert.equal(body.error, 'Invalid employee data');

        const result = await pool.query(
            'SELECT * FROM employees WHERE email = $1',
            [data.email]
        );

        assert.equal(result.rowCount, 0);

    } finally {
        await cleanupEmployee(data.email);
    }
});

// COMP_003
test('COMP_003 - Prevent duplicate normalized email records', async () => {

    const data = createTestData();

    try {
        const firstResponse = await createEmployee(data);

        assert.equal(firstResponse.status, 201);

        const duplicateResponse = await createEmployee({
            ...data,
            email: `  ${data.email.toUpperCase()}  `
        });

        assert.equal(duplicateResponse.status, 409);

        const body = await duplicateResponse.json();

        assert.equal(
            body.error,
            'Employee email already exists'
        );

        const result = await pool.query(
            'SELECT * FROM employees WHERE email = $1',
            [data.email]
        );

        assert.equal(result.rowCount, 1);

    } finally {
        await cleanupEmployee(data.email);
    }
});

// COMP_004
test('COMP_004 - Verify valid status transition is persisted in database', async () => {

    const data = createTestData();

    try {
        const createResponse = await createEmployee(data);

        assert.equal(createResponse.status, 201);

        const employee = await createResponse.json();

        assert.equal(employee.employment_status, 'ACTIVE');

        const response = await updateStatus(
            employee.employee_id,
            'ON_LEAVE'
        );

        assert.equal(response.status, 200);

        const body = await response.json();

        assert.equal(body.employment_status, 'ON_LEAVE');

        const result = await pool.query(
            `SELECT employment_status
             FROM employees
             WHERE employee_id = $1`,
            [employee.employee_id]
        );

        assert.equal(result.rowCount, 1);
        assert.equal(
            result.rows[0].employment_status,
            'ON_LEAVE'
        );

    } finally {
        await cleanupEmployee(data.email);
    }
});

// COMP_005
test('COMP_005 - Reject invalid status transition and preserve database state', async () => {

    const data = createTestData();

    try {
        const createResponse = await createEmployee(data);

        assert.equal(createResponse.status, 201);

        const employee = await createResponse.json();

        const inactiveResponse = await updateStatus(
            employee.employee_id,
            'INACTIVE'
        );

        assert.equal(inactiveResponse.status, 200);

        const response = await updateStatus(
            employee.employee_id,
            'ACTIVE'
        );

        assert.equal(response.status, 400);

        const body = await response.json();

        assert.equal(
            body.error,
            'Invalid status transition'
        );

        const result = await pool.query(
            `SELECT employment_status
             FROM employees
             WHERE employee_id = $1`,
            [employee.employee_id]
        );

        assert.equal(result.rowCount, 1);
        assert.equal(
            result.rows[0].employment_status,
            'INACTIVE'
        );

    } finally {
        await cleanupEmployee(data.email);
    }
});

// COMP_006
test('COMP_006 - Return 404 for nonexistent employee status update', async () => {

    const data = createTestData();

    try {
        const createResponse = await createEmployee(data);

        assert.equal(createResponse.status, 201);

        const employee = await createResponse.json();

        // Delete employee to guarantee missing record
        await cleanupEmployee(data.email);

        const response = await updateStatus(
            employee.employee_id,
            'ON_LEAVE'
        );

        assert.equal(response.status, 404);

        const body = await response.json();

        assert.equal(body.error, 'Employee not found');

    } finally {
        await cleanupEmployee(data.email);
    }
});

// Close database connection pool
after(async () => {
    await pool.end();
});
