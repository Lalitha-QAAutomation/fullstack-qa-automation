
const express = require('express');
const pool = require('../db/connection');

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
    try {
        const {
            first_name,
            last_name,
            email,
            department,
            salary
        } = req.body;

        if (!first_name || !last_name || !email ||
            salary == null || !Number.isFinite(salary) || salary < 0) {
            return res.status(400).json({
                error: 'Invalid employee data'
            });
        }

        const result = await pool.query(
            `INSERT INTO employees
             (first_name, last_name, email, department, salary)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [first_name, last_name, email, department, salary]
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

// Start the API server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Employee API running at http://localhost:${PORT}`);
});
