
// Validate annual salary
function validateSalary(salary) {
    if (!Number.isFinite(salary) || salary < 0) {
        throw new Error('Invalid salary');
    }
}

// Calculate monthly salary
function calculateMonthlySalary(annualSalary) {
    validateSalary(annualSalary);

    return Number((annualSalary / 12).toFixed(2));
}

// Calculate employee bonus
function calculateBonus(annualSalary, percentage) {
    validateSalary(annualSalary);

    if (
        !Number.isFinite(percentage) ||
        percentage < 0 ||
        percentage > 100
    ) {
        throw new Error('Invalid bonus percentage');
    }

    return Number(
        (annualSalary * percentage / 100).toFixed(2)
    );
}

// Normalize employee name
function normalizeName(name) {
    if (typeof name !== 'string' || !name.trim()) {
        throw new Error('Invalid employee name');
    }

    const cleanedName = name.trim().replace(/\s+/g, ' ');

    return cleanedName
        .split(' ')
        .map(word =>
            word.charAt(0).toUpperCase() +
            word.slice(1).toLowerCase()
        )
        .join(' ');
}

// Normalize and validate email
function normalizeEmail(email) {
    if (typeof email !== 'string') {
        throw new Error('Invalid email');
    }

    const cleanedEmail = email.trim().toLowerCase();

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(cleanedEmail)) {
        throw new Error('Invalid email');
    }

    return cleanedEmail;
}

// Transform and validate employee data
function normalizeEmployeeData(employee) {
    validateSalary(employee.salary);

    return {
        first_name: normalizeName(employee.first_name),
        last_name: normalizeName(employee.last_name),
        email: normalizeEmail(employee.email),
        department: typeof employee.department === 'string'
            ? employee.department.trim()
            : null,
        salary: employee.salary
    };
}

// Validate employee status transitions
function validateStatusTransition(currentStatus, newStatus) {

    const allowedTransitions = {
        ACTIVE: ['ON_LEAVE', 'INACTIVE'],
        ON_LEAVE: ['ACTIVE', 'INACTIVE'],
        INACTIVE: []
    };

    if (
        !Object.hasOwn(allowedTransitions, currentStatus) ||
        !Object.hasOwn(allowedTransitions, newStatus)
    ) {
        throw new Error('Invalid employment status');
    }

    if (
        !allowedTransitions[currentStatus].includes(newStatus)
    ) {
        throw new Error('Invalid status transition');
    }

    return newStatus;
}
module.exports = {
    validateSalary,
    calculateMonthlySalary,
    calculateBonus,
    normalizeName,
    normalizeEmail,
    normalizeEmployeeData,
    validateStatusTransition
};
