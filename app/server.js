
const express = require('express');
const pool = require('../db/connection');
const {
    normalizeEmployeeData,
    validateStatusTransition
} = require('./services/employeeService');

const app = express();

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'Employee API is running'
    });
});

// Get all employees
app.get('/employees', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM employees ORDER BY employee_id'
        );

        res.status(200).json(result.rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

// Create a new employee

app.post('/employees', async (req, res) => {

    let employee;

    // Validate and transform employee data
    try {
        employee = normalizeEmployeeData(req.body);
    } catch (error) {
        return res.status(400).json({
            error: 'Invalid employee data'
        });
    }

    try {
        const result = await pool.query(
            `INSERT INTO employees
             (first_name, last_name, email, department, salary)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [
                employee.first_name,
                employee.last_name,
                employee.email,
                employee.department,
                employee.salary
            ]
        );

        res.status(201).json(result.rows[0]);

    } catch (error) {

        if (error.code === '23505') {
            return res.status(409).json({
                error: 'Employee email already exists'
            });
        }

        console.error(error);

        res.status(500).json({
            error: 'Internal server error'
        });
    }
});


// Update employee employment status
app.patch('/employees/:id/status', async (req, res) => {

    const employeeId = Number(req.params.id);
    const newStatus = req.body?.employment_status;

    if (
        !Number.isInteger(employeeId) ||
        employeeId <= 0 ||
        employeeId > 2147483647
    ) {
        return res.status(400).json({
            error: 'Invalid employee ID'
        });
    }

    let client;

    try {
        client = await pool.connect();

        await client.query('BEGIN');

        const employee = await client.query(
            `SELECT employment_status
             FROM employees
             WHERE employee_id = $1
             FOR UPDATE`,
            [employeeId]
        );

        if (employee.rowCount === 0) {

            await client.query('ROLLBACK');

            return res.status(404).json({
                error: 'Employee not found'
            });
        }

        const currentStatus =
            employee.rows[0].employment_status;

        try {
            validateStatusTransition(
                currentStatus,
                newStatus
            );
        } catch (error) {

            await client.query('ROLLBACK');

            return res.status(400).json({
                error: error.message
            });
        }

        const result = await client.query(
            `UPDATE employees
             SET employment_status = $1
             WHERE employee_id = $2
             RETURNING *`,
            [newStatus, employeeId]
        );

        await client.query('COMMIT');

        res.status(200).json(result.rows[0]);

    } catch (error) {

        if (client) {
            await client.query('ROLLBACK');
        }

        console.error(error);

        res.status(500).json({
            error: 'Internal server error'
        });

    } finally {

        if (client) {
            client.release();
        }
    }
});


// Start the API server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Employee API running at http://localhost:${PORT}`);
});


