
-- Migration 001: Add employment status

BEGIN;

ALTER TABLE employees
ADD COLUMN IF NOT EXISTS employment_status VARCHAR(20)
NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE employees
DROP CONSTRAINT IF EXISTS employees_status_check;

ALTER TABLE employees
ADD CONSTRAINT employees_status_check
CHECK (
    employment_status IN (
        'ACTIVE',
        'INACTIVE',
        'ON_LEAVE'
    )
);

COMMIT;
