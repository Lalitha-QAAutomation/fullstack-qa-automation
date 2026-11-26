
-- Stored procedure to increase employee salary
CREATE OR REPLACE PROCEDURE increase_employee_salary(
    p_employee_id INTEGER,
    p_percentage NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN

    -- Validate percentage
    IF p_percentage IS NULL
       OR p_percentage <= 0
       OR p_percentage > 100 THEN

        RAISE EXCEPTION 'Invalid salary increase percentage'
            USING ERRCODE = '22023';

    END IF;

    -- Update employee salary
    UPDATE employees
    SET salary = ROUND(
        salary + (salary * p_percentage / 100), 2
    )
    WHERE employee_id = p_employee_id
      AND salary IS NOT NULL;

    -- Validate employee and salary availability
    IF NOT FOUND THEN

        RAISE EXCEPTION 'Employee not found or salary unavailable'
            USING ERRCODE = 'P0002';

    END IF;

END;
$$;
