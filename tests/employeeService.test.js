
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
    calculateMonthlySalary,
    calculateBonus,
    normalizeName,
    normalizeEmail,
    normalizeEmployeeData,
    validateStatusTransition
} = require('../app/services/employeeService');
// Monthly salary calculation tests

test('BL_001 - Verify monthly salary calculation', () => {

    const result = calculateMonthlySalary(60000);

    assert.equal(result, 5000);
});

test('BL_002 - Verify monthly salary rounding', () => {

    const result = calculateMonthlySalary(50000);

    assert.equal(result, 4166.67);
});

test('BL_003 - Verify zero annual salary', () => {

    const result = calculateMonthlySalary(0);

    assert.equal(result, 0);
});

test('BL_004 - Reject negative annual salary', () => {

    assert.throws(
        () => calculateMonthlySalary(-50000),
        { message: 'Invalid salary' }
    );
});

test('BL_005 - Reject non-numeric salary', () => {

    assert.throws(
        () => calculateMonthlySalary('60000'),
        { message: 'Invalid salary' }
    );
});

// Bonus calculation tests

test('BL_006 - Verify valid bonus calculation', () => {

    const result = calculateBonus(60000, 10);

    assert.equal(result, 6000);
});

test('BL_007 - Verify zero bonus percentage', () => {

    const result = calculateBonus(60000, 0);

    assert.equal(result, 0);
});

test('BL_008 - Verify maximum bonus percentage', () => {

    const result = calculateBonus(60000, 100);

    assert.equal(result, 60000);
});

test('BL_009 - Reject negative bonus percentage', () => {

    assert.throws(
        () => calculateBonus(60000, -10),
        { message: 'Invalid bonus percentage' }
    );
});

test('BL_010 - Reject bonus percentage above 100', () => {

    assert.throws(
        () => calculateBonus(60000, 101),
        { message: 'Invalid bonus percentage' }
    );
});

// Data transformation and validation tests

test('BL_011 - Verify whitespace removal from employee name', () => {

    const result = normalizeName('   Alice   ');

    assert.equal(result, 'Alice');
});

test('BL_012 - Verify mixed-case name normalization', () => {

    const result = normalizeName('aLiCe');

    assert.equal(result, 'Alice');
});

test('BL_013 - Verify multiple-word name normalization', () => {

    const result = normalizeName('  mary   jane  ');

    assert.equal(result, 'Mary Jane');
});

test('BL_014 - Reject empty employee name', () => {

    assert.throws(
        () => normalizeName('   '),
        { message: 'Invalid employee name' }
    );
});

test('BL_015 - Verify email normalization', () => {

    const result = normalizeEmail(
        '  ALICE@EXAMPLE.COM  '
    );

    assert.equal(result, 'alice@example.com');
});

test('BL_016 - Reject invalid email format', () => {

    assert.throws(
        () => normalizeEmail('alice-example.com'),
        { message: 'Invalid email' }
    );
});

test('BL_017 - Verify complete employee data transformation', () => {

    const input = {
        first_name: '  aLICE  ',
        last_name: 'jOHNSON',
        email: ' ALICE@EXAMPLE.COM ',
        department: '  Finance  ',
        salary: 60000
    };

    const expected = {
        first_name: 'Alice',
        last_name: 'Johnson',
        email: 'alice@example.com',
        department: 'Finance',
        salary: 60000
    };

    const result = normalizeEmployeeData(input);

    assert.deepEqual(result, expected);
});

test('BL_018 - Reject employee data with invalid salary', () => {

    const input = {
        first_name: 'Alice',
        last_name: 'Johnson',
        email: 'alice@example.com',
        department: 'Finance',
        salary: -5000
    };

    assert.throws(
        () => normalizeEmployeeData(input),
        { message: 'Invalid salary' }
    );
});

// Employee state transition tests

test('BL_019 - Allow ACTIVE to ON_LEAVE transition', () => {

    const result = validateStatusTransition(
        'ACTIVE', 'ON_LEAVE'
    );

    assert.equal(result, 'ON_LEAVE');
});

test('BL_020 - Allow ON_LEAVE to ACTIVE transition', () => {

    const result = validateStatusTransition(
        'ON_LEAVE', 'ACTIVE'
    );

    assert.equal(result, 'ACTIVE');
});

test('BL_021 - Allow ACTIVE to INACTIVE transition', () => {

    const result = validateStatusTransition(
        'ACTIVE', 'INACTIVE'
    );

    assert.equal(result, 'INACTIVE');
});

test('BL_022 - Allow ON_LEAVE to INACTIVE transition', () => {

    const result = validateStatusTransition(
        'ON_LEAVE', 'INACTIVE'
    );

    assert.equal(result, 'INACTIVE');
});

test('BL_023 - Reject INACTIVE to ACTIVE transition', () => {

    assert.throws(
        () => validateStatusTransition(
            'INACTIVE', 'ACTIVE'
        ),
        { message: 'Invalid status transition' }
    );
});

test('BL_024 - Reject INACTIVE to ON_LEAVE transition', () => {

    assert.throws(
        () => validateStatusTransition(
            'INACTIVE', 'ON_LEAVE'
        ),
        { message: 'Invalid status transition' }
    );
});

test('BL_025 - Reject same-state transitions', () => {

    const statuses = [
        'ACTIVE',
        'ON_LEAVE',
        'INACTIVE'
    ];

    for (const status of statuses) {

        assert.throws(
            () => validateStatusTransition(
                status, status
            ),
            { message: 'Invalid status transition' }
        );
    }
});

test('BL_026 - Reject unknown employment status', () => {

    assert.throws(
        () => validateStatusTransition(
            'ACTIVE', 'UNKNOWN'
        ),
        { message: 'Invalid employment status' }
    );

    assert.throws(
        () => validateStatusTransition(
            'UNKNOWN', 'ACTIVE'
        ),
        { message: 'Invalid employment status' }
    );
});


