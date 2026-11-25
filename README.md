# Sweety — Blood Glucose Tracker

Recruitment assessment project for Kenpath Technologies. Sweety is planned as a personal tracker for blood glucose readings and simple date-based summaries. It is a demonstration project, not a medical device.

## Technology stack

- Client: React, Vite, JavaScript, React Router, Axios, ESLint
- API: Node.js, Express 5, JavaScript ES modules, dotenv, CORS
- Planned authentication: bcrypt and jsonwebtoken (installed in the backend, not implemented)
- Database: PostgreSQL 19; Prisma is planned for Stage 2
- Testing: backend tests are planned with Vitest and Supertest

PostgreSQL is the selected database; MongoDB is not used.

## Architecture and current structure

The repository is a modular monolith with separate client and server applications. Express configuration is exported from `server/src/app.js`; `server/src/index.js` loads environment variables and starts the HTTP listener. Feature code will live under module/feature folders as it is implemented.

```text
client/
  src/api/                    HTTP client and API utilities (planned)
  src/components/common/      reusable UI (planned)
  src/components/layout/      layout UI (planned)
  src/features/auth/          authentication screens/logic (planned)
  src/features/readings/      reading management UI (planned)
  src/features/reports/       reports UI (planned)
  src/hooks/                  shared hooks (planned)
  src/styles/                 shared styling (planned)
  .env.example
server/
  prisma/                     schema and migrations (planned)
  src/app.js                  Express configuration (implemented)
  src/index.js                server startup (implemented)
  src/config/                 configuration (reserved)
  src/middleware/             shared request middleware (reserved)
  src/modules/auth/           authentication (planned)
  src/modules/readings/       reading operations (planned)
  src/modules/reports/        report calculations (planned)
  src/utils/                  shared utilities (reserved)
  tests/                      automated tests (planned)
  .env.example
```

## Required features (planned)

- Register and log in; hash passwords with bcrypt; restrict data to its owner.
- Create, view, edit, and delete readings with date, slot, and whole-number mg/dL value (40–600). Slots: `MORNING_FASTING`, `AFTER_BREAKFAST`, `AFTER_LUNCH`, `AFTER_DINNER`. One per slot per date, maximum four per date, and no future dates.
- Daily, month-to-date, and previous-month reports with highest, lowest, one-decimal average, and count. Daily also lists readings and slots. Previous month is relative to the selected date.

No feature above is implemented yet. The current API provides only a health check and 404 handling.

## Planned database model

Prisma schema and migrations are not yet present. The planned models are `User` (id, name, unique email, password hash, timestamps) and `Reading` (id, user relation, date-only reading date, slot enum, integer glucose value, timestamps). A uniqueness constraint on user/date/slot will enforce one reading per slot per day; the four-slot enum also caps the daily count at four.

## Planned REST API

All reading and report endpoints will require authentication and scope queries to the authenticated user.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Register |
| POST | `/api/auth/login` | Log in |
| GET / POST | `/api/readings` | List / create own readings |
| PUT / DELETE | `/api/readings/:id` | Update / delete own reading |
| GET | `/api/reports/daily?date=YYYY-MM-DD` | Daily summary and entries |
| GET | `/api/reports/month-to-date?date=YYYY-MM-DD` | Month start through selected date |
| GET | `/api/reports/previous-month?date=YYYY-MM-DD` | Full preceding calendar month |

## Environment configuration

Copy the example files only when creating local configuration. Preserve any existing `.env` files. Replace placeholders locally; never commit credentials.

Backend `server/.env.example`:

```env
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@127.0.0.1:5432/sweety_db
JWT_SECRET=REPLACE_WITH_SECURE_SECRET
JWT_EXPIRES_IN=1d
```

Frontend `client/.env.example`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

## Prerequisites and setup

Prerequisites: Node.js/npm and PostgreSQL 19. The development database is `sweety_db` at `127.0.0.1:5432`; database integration is Stage 2 and no connection or migration is required for the current health endpoint.

Install dependencies in each existing application directory:

```powershell
cd server
npm install
cd ..\client
npm install
```

Create `server/.env` from its example and set local values before starting the API. The current frontend starter does not require an environment file to run. Commands below reflect package scripts; mark them verified only after running successfully.

## Development and checks

```powershell
# terminal 1, from server/
npm run dev

# terminal 2, from client/
npm run dev
npm run lint
npm run build
```

Backend has `npm start` and `npm run dev`; there is not yet a test script. Planned tests use Vitest and Supertest for validation, access isolation, report boundaries/rounding, and empty reports. Tests are not implemented.

## Current implementation status

- Implemented: existing React/Vite starter; Express JSON parsing, configurable CORS, `GET /api/health`, unknown-route JSON 404, and separated application/startup modules; environment templates.
- Currently being completed: Stage 1 structure and documentation.
- Planned: authentication, readings, reports, Prisma schema/migrations, seed data, and automated tests.

## Assumptions and technical decisions

- Reading dates are calendar dates (`YYYY-MM-DD`) rather than timestamps to avoid timezone shifts.
- Glucose values are integer mg/dL and this app provides no medical advice.
- The previous-month period is based on the selected date, not today's date.
- User identity will come from the authenticated session/token, never a client-supplied user id.
- Seed data, when added, will be fictional.

## Future scope

After the required features and tests work: pagination, historical charts, Docker Compose, frontend tests, report caching, reminders, and explicitly assigned clinician accounts. Any real medical deployment would also require privacy, security, audit, backup, and clinical review.

## Submission checklist

- [ ] Required features run end to end
- [ ] Backend tests pass
- [ ] Setup and run commands verified and documented
- [ ] Example environment files present; no credentials committed
- [ ] Seed script and fictional sample data
- [ ] Incremental commits and public GitHub repository
- [ ] Screenshots or short demo
- [ ] Assumptions and future scope documented

## Repository rights

Copyright © 2026 Abhishek Mali. This work is being developed for recruitment evaluation. No open-source license has been granted for general reuse or commercial distribution; GitHub's terms still permit actions such as viewing and forking public repositories.
