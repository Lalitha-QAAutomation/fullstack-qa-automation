# Fullstack QA Automation Framework

A backend API and database automation framework built using **Node.js, Express.js, PostgreSQL, and GitHub Actions**.

This project demonstrates automated REST API testing, database validation, API-to-database integration testing, negative testing, and continuous integration.

## Technologies Used

- **JavaScript (Node.js 22)** — Test automation and backend development
- **Express.js** — REST API development
- **PostgreSQL 17** — Relational database
- **node-postgres (`pg`)** — PostgreSQL connectivity
- **Node.js Test Runner (`node:test`)** — Automated test execution
- **Node.js Assert** — Test assertions
- **GitHub Actions** — Continuous integration
- **Git and GitHub** — Version control

## Project Structure

```text
fullstack-qa-automation/
├── .github/
│   └── workflows/
│       └── main.yml
├── app/
│   └── server.js
├── db/
│   ├── connection.js
│   └── schema.sql
├── tests/
│   ├── database.test.js
│   ├── api-database.test.js
│   └── api-negative.test.js
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

## Test Coverage

The framework contains **7 automated tests**.

| Test ID | Test Scenario | Expected Result |
|---|---|---|
| DB_001 | Verify employee record exists | Employee data matches database values |
| DB_002 | Reject duplicate employee email | PostgreSQL returns unique constraint violation |
| DB_003 | Reject negative salary | PostgreSQL returns check constraint violation |
| API_DB_001 | Create employee through API and verify database | HTTP 201 and matching PostgreSQL record |
| API_NEG_001 | Reject duplicate email through API | HTTP 409 and no duplicate record |
| API_NEG_002 | Reject negative salary through API | HTTP 400 and no invalid record |
| API_NEG_003 | Reject missing required fields | HTTP 400 |

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Check API server health |
| GET | `/employees` | Retrieve employees |
| POST | `/employees` | Create a new employee |

## How to Run Locally

### Prerequisites

- Node.js 22
- PostgreSQL 17
- npm

### 1. Clone the repository

```bash
git clone https://github.com/Lalitha-QAAutomation/fullstack-qa-automation.git
cd fullstack-qa-automation
```

### 2. Install dependencies

```bash
npm ci
```

### 3. Create and initialize the database

Create a PostgreSQL database named `employee_qa_db`.

```bash
createdb employee_qa_db
psql -d employee_qa_db -f db/schema.sql
```

Configure PostgreSQL connection variables (`PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, and `PGPASSWORD`) as needed for your environment.

### 4. Start the Express API

```bash
npm start
```

The API starts at:

`http://localhost:3000`

### 5. Run automated tests

Open another terminal while the API is running.

Run all tests:

```bash
npm test
```

Run database tests only:

```bash
npm run test:db
```

Run API tests only:

```bash
npm run test:api
```

## CI/CD — GitHub Actions

The project uses GitHub Actions to execute automated tests on pushes and pull requests.

The CI pipeline:

1. Checks out the repository.
2. Configures Node.js 22.
3. Installs npm dependencies.
4. Starts a temporary PostgreSQL 17 database.
5. Initializes the database schema.
6. Starts the Express API.
7. Checks API health.
8. Executes the automated test suite.
9. Uploads server logs if the workflow fails.

**Current CI result: 7 tests passed, 0 failed.**

[View GitHub Actions workflow](https://github.com/Lalitha-QAAutomation/fullstack-qa-automation/actions)

## Automation Concepts Demonstrated

- REST API testing
- Positive and negative testing
- Database integrity and constraint validation
- SQL assertions
- API-to-database integration testing
- Automated test data setup and cleanup
- Environment-based database configuration
- Continuous integration with GitHub Actions

## Future Enhancements

- Automated HTML/JUnit test reports
- Employee management frontend
- Playwright end-to-end UI testing
- Additional API endpoints and test scenarios

## Author

**Lalitha-QAAutomation**

[GitHub Profile](https://github.com/Lalitha-QAAutomation)
