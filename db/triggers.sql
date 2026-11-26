
-- Create salary audit table
CREATE TABLE IF NOT EXISTS salary_audit (
    audit_id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL,
    old_salary DECIMAL(10,2),
    new_salary DECIMAL(10,2),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger function
CREATE OR REPLACE FUNCTION log_salary_change()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO salary_audit (
        employee_id,
        old_salary,
        new_salary
    )
    VALUES (
        OLD.employee_id,
        OLD.salary,
        NEW.salary
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remove existing trigger if present
DROP TRIGGER IF EXISTS salary_change_trigger
ON employees;

-- Create salary change trigger
CREATE TRIGGER salary_change_trigger
AFTER UPDATE OF salary ON employees
FOR EACH ROW
WHEN (OLD.salary IS DISTINCT FROM NEW.salary)
EXECUTE FUNCTION log_salary_change();
