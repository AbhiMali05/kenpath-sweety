# Sweety — Blood Glucose Tracker

Kenpath Technologies recruitment assessment. Sweety is a personal tracker for recording blood glucose readings and reviewing date-based summaries. It is a demonstration project, not a medical device; it does not diagnose or provide medical advice.

## Features

- Account registration, login, logout, protected routes, and session restoration.
- Create, list, update, and delete a user's readings.
- Four daily slots: morning fasting, after breakfast, after lunch, and after dinner.
- Daily, month-to-date, and previous-calendar-month reports.
- Backend-calculated highest, lowest, average, and count; daily reports also list the readings.
- Date/value validation, responsive layouts, and loading, error, empty, and success feedback.

## Technology and architecture

- **Client:** React 19, Vite 8, JavaScript ES modules, React Router 7, Axios, CSS.
- **API:** Node.js 22, Express 5, JavaScript ES modules, JWT, bcrypt.
- **Database:** PostgreSQL 19 and Prisma 7 with the PostgreSQL `pg` driver adapter.
- **Tests:** backend Vitest 5 + Supertest; frontend Vitest 5, React Testing Library, user-event, jest-dom, and jsdom.

```text
React browser app → Express REST API → Prisma ORM + PostgreSQL
```

The browser calls the Express API; PostgreSQL credentials and database access remain on the server. Express routes apply authentication and validation, controllers handle HTTP requests/responses, and feature services implement data operations. Report aggregation is performed by PostgreSQL through Prisma and is scoped to the authenticated user.

### Database model

`User` has a one-to-many relationship with `GlucoseReading`. Each reading belongs to one user and stores its calendar day as PostgreSQL `DATE`.

- `ReadingSlot` contains exactly `MORNING_FASTING`, `AFTER_BREAKFAST`, `AFTER_LUNCH`, `AFTER_DINNER`.
- `User.email` is unique.
- `(userId, readingDate, slot)` is unique, preventing duplicate slots per day.
- `(userId, readingDate)` is indexed for a user's date filtering.
- The foreign key cascades on user deletion/update.
- A PostgreSQL CHECK constraint limits values to integers from 40 through 600.
- Prisma 7 CLI settings are in `server/prisma.config.ts`; the schema is `server/prisma/schema.prisma`; the shared adapter-backed client is `server/src/config/database.js`.

The schema uses the `prisma-client-js` generator to keep the Express backend JavaScript-only and allow imports from `@prisma/client`. Prisma 7 favors its newer generated-source workflow; this compatibility choice is documented because the JS generator is deprecated. It avoids adding a TypeScript compilation step to this assessment.

## Repository structure

```text
client/
  src/api/                     shared Axios client and API helpers
  src/components/common/       loading, error and empty states
  src/components/layout/       brand, header, navigation and shell
  src/features/auth/           session, login and registration
  src/features/readings/       glucose reading page
  src/features/reports/        reports page
  src/routes/                  protected and not-found routes
  src/test/                    frontend test setup
  src/utils/                   date-only helpers
  vitest.config.js             frontend test configuration
server/
  prisma/                      schema and versioned migration
  src/config/                  shared Prisma client and read-only DB checks
  src/middleware/              JWT authentication
  src/modules/{auth,readings,reports}/ routes, controllers, validation, services
  tests/                       API tests with mocked Prisma
AGENTS.md                      handover and permanent development conventions
README.md                      setup, API, verification and roadmap
Sweety_README.md               original assignment brief and checklist
```

## Prerequisites and install

Use Node.js 22.13.1 (Node 22.12+), npm, and PostgreSQL 19 for a complete local integration. The configured local database is expected to be `sweety_db` on `127.0.0.1:5432`. Real database verification belongs to Stage 9 and has not been performed in Stage 8.

```powershell
cd server
npm install
cd ..\client
npm install
# Reproducible client install after package-lock.json is checked in
npm ci
```

Client test versions verified with Node.js 22.13.1 and React 19 / Vite 8: Vitest 5.1.2, React Testing Library 16.3.3, user-event 14.6.13, jest-dom 6.9.1, and jsdom 27.4.0. `npm install` and a clean `npm ci` completed; the client lockfile matches its manifest. `npm audit` reported zero vulnerabilities.

## Environment configuration

Keep local `.env` files private and preserve existing values. Copy the examples only if local configuration does not already exist. The examples contain placeholders only.

`server/.env` (see `server/.env.example`):

```env
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
DATABASE_URL=postgresql://DB_USER:DB_PASSWORD@127.0.0.1:5432/sweety_db
JWT_SECRET=REPLACE_WITH_A_PRIVATE_RANDOM_VALUE_AT_LEAST_32_CHARACTERS
JWT_EXPIRES_IN=1d
```

`client/.env` (see `client/.env.example`):

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

Never place database credentials or JWT secrets in `VITE_` variables. Verify `.env` files remain ignored by Git; do not print them in logs or reports.

## Run locally

After installing dependencies and configuring the server environment:

```powershell
# terminal 1
cd server
npm run dev

# terminal 2
cd client
npm run dev
```

The server health endpoint is `GET /api/health`. Starting the UI does not apply migrations. Do not reset, recreate, or seed a database.

## Database and Prisma commands

The initial migration is `server/prisma/migrations/20261125120000_init_sweety_schema/migration.sql`. Its schema and SQL are committed, but migration application and live connection verification remain pending for Stage 9. Stage 8 performed no database operations.

From `server/`, these commands are available:

```powershell
npm run prisma:validate
npm run prisma:generate
npm run prisma:status
npm run db:inspect
npm run db:verify
```

`npm run prisma:migrate` runs `prisma migrate dev` and changes the database. Use it only during Stage 9 after confirming database identity and reviewing migration SQL. Never use reset or destructive synchronization commands. `db:inspect` and `db:verify` are intended as read-only checks. No success is claimed for any live database operation in this stage.

## API reference

All API responses use JSON. Protected routes require `Authorization: Bearer <token>`. The backend derives user identity from the verified JWT and scopes reads and mutations to that user.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | API status |
| POST | `/api/auth/register` | Register with name, email, password |
| POST | `/api/auth/login` | Authenticate and return token/profile |
| GET | `/api/auth/me` | Return the verified user's safe profile |
| GET | `/api/readings` | List the authenticated user's readings |
| POST | `/api/readings` | Create a reading (`readingDate`, `slot`, `value`) |
| PUT | `/api/readings/:id` | Partially update an owned reading |
| DELETE | `/api/readings/:id` | Delete an owned reading |
| GET | `/api/reports/daily?date=YYYY-MM-DD` | Daily statistics and individual readings |
| GET | `/api/reports/month-to-date?date=YYYY-MM-DD` | Month start through selected day, inclusive |
| GET | `/api/reports/previous-month?date=YYYY-MM-DD` | Full month before the selected date's month |

Reading values must be integers from 40 through 600 mg/dL; future reading dates and duplicate slots are rejected. Dates are calendar dates in `YYYY-MM-DD` form. Report statistics come from the backend. Empty periods return count zero and null maximum/minimum/average rather than invented values. See `server/src/modules/` for request validation and exact response shapes.

## Testing and quality checks

From `client/`:

```powershell
npm run lint
npm test
npm run build
```

From `server/`:

```powershell
npm test
```

Frontend tests mock API responses and cover auth forms/session routing, readings behavior, report selection/statistics, and date helpers. Backend API tests mock Prisma. Neither suite proves live PostgreSQL integration. Stage 8 results: all 23 frontend tests pass across five test files; lint and production build pass; all 55 backend tests pass across three files. The npm registry initially returned `ENOTFOUND` from the normal sandbox; npm uses the official registry and no npm or HTTP proxy is configured. With approved network access, npm 10.9.2 then hit an Arborist peer-resolution error on the original Vitest 4 declaration. Aligning the client to Vitest 5.1.2 (the existing backend runner, compatible with Vite 8 and Node 22.13.1) resolved installation. A clean `npm ci` confirmed reproducibility. No Prisma or PostgreSQL operation was run.

The current production build is 343.24 kB JavaScript (109.81 kB gzip) and 14.57 kB CSS (4.05 kB gzip). Compared with the earlier Stage 8 build, JavaScript is unchanged; CSS increased 0.07 kB and gzip 0.01 kB for contrast and touch-target refinements. No pre-Stage 8 bundle baseline was retained.

### Stage 8 browser and accessibility checks

Login and registration were rendered in the browser at 320, 375, 390, 768, 1024, and 1440px. Each reported `documentElement.scrollWidth` equal to the viewport width, and all visible auth fields/buttons stayed within the viewport. Mobile and desktop screenshots were inspected. Auth pages' field labels, keyboard focus outline, password visibility toggle, and empty-field validation were checked. Sampled text contrast on white and the auth side-panel background measured at least 4.67:1 after refinements. This was a practical check, not a formal WCAG audit.

At the time of local verification, Vite listened on IPv6 loopback `::1:5173`: `http://localhost:5173/login` returned HTTP 200 and loaded in the browser; `127.0.0.1:5173` was not bound. The Vite-reported localhost URL is usable. The protected readings/reports browser layouts and their loading/error/empty states require a real authenticated session and are deferred to Stage 9; component behavior is covered by mocked tests.

## Security and known limitations

- Passwords are bcrypt-hashed server-side and are not persisted in browser storage.
- JWTs are stored in `sessionStorage` for the current tab session. `sessionStorage` is readable by browser JavaScript, so an XSS vulnerability could expose a stored token; this assessment does not redesign that architecture.
- Frontend validation improves feedback; backend validation and authorization remain authoritative.
- This application is not intended for real health-data or clinical use. It provides no diagnoses, risk classifications, or medical recommendations.
- Protected readings/reports browser checks, live frontend/API/PostgreSQL integration, and end-to-end workflows remain pending for Stage 9. No end-to-end check has been claimed.

## Implementation roadmap and status

The stage names below were cross-checked against the retained stage prompts. Historical detailed verification logs are not all available; the status distinguishes implemented work from checks that remain pending.

| Stage | Scope | Status |
| --- | --- | --- |
| 1 | Project inspection, structure, environment examples and Express foundation | Implemented; commits present; historic detailed checks unavailable |
| 2 | PostgreSQL and Prisma schema, adapter, migration and DB helpers | Implemented; real DB/migration verification pending |
| 3 | User authentication backend | Implemented; live DB verification pending |
| 4 | Glucose readings CRUD, validation and AGENTS.md | Implemented; live DB verification pending |
| 5 | Daily, month-to-date and previous-month reporting backend | Implemented; live DB verification pending |
| 6 | React frontend foundation, routing, layout and API configuration | Implemented; browser verification pending |
| 7 | Frontend auth, readings and reports features | Implemented; previous client lint/build and 55 mocked backend tests were recorded; live integration pending |
| 8 | UI/UX refinement, responsive/accessibility audit, frontend tests and code quality | **Complete for Stage 8.** 23 frontend and 55 backend tests pass; lint/build pass; login/register checked at six widths. Protected page browser checks are deferred to Stage 9. |
| 9 | Local PostgreSQL and Prisma migration verification, real API/UI integration, user data isolation, end-to-end workflow | Upcoming; not started |
| 10 | Final assignment audit, remaining fixes, final documentation, readiness and interview preparation | Upcoming; not started |

Do not call the project submission-ready until real PostgreSQL integration and final assignment verification are complete.

## Future scope (not part of current stages)

Possible later enhancements include pagination, historical charts, Docker Compose, report caching, reminders, and explicitly assigned clinician accounts. Any real medical deployment would additionally require privacy, security, audit, backup, and clinical review. These are not authorized by Stages 1–10 unless the assignment changes.

## Submission checklist

- [ ] Required workflows verified end to end
- [ ] Real PostgreSQL integration and user data isolation verified
- [x] Backend and frontend mocked tests pass
- [ ] Setup commands verified on a clean environment
- [ ] Safe environment examples and no committed credentials
- [ ] Seed script/demo data and demo assets reviewed against final assignment requirements
- [ ] Final assignment audit complete

## Repository rights

Copyright © 2026 Abhishek Mali. This work is being developed for recruitment evaluation. No open-source license has been granted for general reuse or commercial distribution; GitHub's terms still permit actions such as viewing and forking a public repository.
