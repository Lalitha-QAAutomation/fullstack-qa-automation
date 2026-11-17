
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5432),
    database: process.env.PGDATABASE || 'employee_qa_db',
    user: process.env.PGUSER || process.env.USER,
    password: process.env.PGPASSWORD || undefined
});

module.exports = pool;

