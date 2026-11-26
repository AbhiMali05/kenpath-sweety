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

Use Node.js 22.13.1 (Node 22.12+), npm, PostgreSQL, and Git. The verified local setup uses PostgreSQL 19.0 and a dedicated development database named `sweety_db` on `127.0.0.1:5432`. The database name, host, service, and port were verified during Stage 9; credentials remain private in the ignored `server/.env` file.

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

The initial migration is `server/prisma/migrations/20261125120000_init_sweety_schema/migration.sql`. Stage 9 verified that it was already applied to `sweety_db` and that Prisma reports the schema up to date. The migration SQL was reviewed; it only creates the enum, tables, indexes, constraints, and foreign key. No migration was applied during Stage 9 because the migration was already present and applied. Stage 8 performed no database operations.

From `server/`, these commands are available:

```powershell
npm run prisma:validate
npm run prisma:generate
npm run prisma:status
npm run db:inspect
npm run db:verify
npx prisma migrate deploy
```

For a fresh dedicated local Sweety database, validate and generate the client, inspect the target and migration SQL, then apply committed migrations with `npx prisma migrate deploy`. `npm run prisma:migrate` runs `prisma migrate dev` and can change the database. Confirm the host, port, database, environment, current tables/data, and reviewed SQL before either command. Never use reset or destructive synchronization commands. `db:inspect`, `db:verify`, `prisma:validate`, and `prisma:status` are read-only checks.

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

The regular backend suite mocks Prisma. To run the separately configured real HTTP/PostgreSQL integration test, start PostgreSQL and the API first, then run from `server/`:

```powershell
$env:SWEETY_INTEGRATION_TESTS = '1'
$env:SWEETY_API_BASE_URL = 'http://127.0.0.1:5000/api'
npm run test:integration
Remove-Item Env:SWEETY_INTEGRATION_TESTS
Remove-Item Env:SWEETY_API_BASE_URL
```

This opt-in test refuses non-local targets and any database except `sweety_db`. It creates one random synthetic account, exercises real HTTP requests and database-backed records, then removes only the tracked records for that account. Do not use it against production or a shared database.

Frontend tests mock API responses and cover auth forms/session routing, readings behavior, report selection/statistics, and date helpers. The normal backend suite mocks Prisma. Stage 8 passed 23 frontend and 55 backend tests, client lint, and build. Stage 9 added a separately configured, explicit opt-in database-backed HTTP integration test; it is not included in `npm test`. The real database/API run passed 89 scenario assertions, and the retained integration test passed 1 test. See Stage 9 results below. The npm registry initially returned `ENOTFOUND` from the normal sandbox; npm uses the official registry and no npm or HTTP proxy is configured. With approved network access, npm 10.9.2 then hit an Arborist peer-resolution error on the original Vitest 4 declaration. Aligning the client to Vitest 5.1.2 (the existing backend runner, compatible with Vite 8 and Node 22.13.1) resolved installation. A clean `npm ci` confirmed reproducibility and `npm audit` reported zero vulnerabilities. Stage 8 did not run Prisma or PostgreSQL operations.

The current production build is 343.24 kB JavaScript (109.81 kB gzip) and 14.57 kB CSS (4.05 kB gzip). Compared with the earlier Stage 8 build, JavaScript is unchanged; CSS increased 0.07 kB and gzip 0.01 kB for contrast and touch-target refinements. No pre-Stage 8 bundle baseline was retained.

### Stage 8 browser and accessibility checks

Login and registration were rendered in the browser at 320, 375, 390, 768, 1024, and 1440px. Each reported `documentElement.scrollWidth` equal to the viewport width, and all visible auth fields/buttons stayed within the viewport. Mobile and desktop screenshots were inspected. Auth pages' field labels, keyboard focus outline, password visibility toggle, and empty-field validation were checked. Sampled text contrast on white and the auth side-panel background measured at least 4.67:1 after refinements. This was a practical check, not a formal WCAG audit.

At the time of Stage 8 verification, Vite listened on IPv6 loopback `::1:5173`: `http://localhost:5173/login` returned HTTP 200; `127.0.0.1:5173` was not bound. During Stage 9, the registration page opened at the same localhost origin. Full authenticated workflows and responsive checks for readings/reports were not completed: the available Windows Computer Use bridge stopped when it could not establish the active browser URL with sufficient confidence. Do not treat the API integration tests as browser verification.

### Stage 9 PostgreSQL and API integration results

- PostgreSQL 19.0 was installed at `E:\PostgreSQL\19`; Windows service `postgresql-x64-19` was running. `127.0.0.1:5432` accepted connections. Docker was unavailable on PATH.
- The actual connection target was `sweety_db`, `127.0.0.1`, port `5432`. Public tables were `User`, `GlucoseReading`, and `_prisma_migrations`. Before tests, there was one existing user and no readings. After exact test cleanup, counts returned to one user and zero readings; the existing account was preserved.
- `prisma validate`, `prisma generate` (Prisma Client 7.10.1), `prisma migrate status`, and `db:verify` passed. The committed migration was already applied; status reported one migration and “up to date.” Stage 9 did not need to apply or alter a migration.
- Catalog inspection confirmed the four `ReadingSlot` enum values, primary keys, unique email index, `(userId, readingDate, slot)` unique index, `(userId, readingDate)` index, foreign key, and glucose range CHECK constraint.
- Real HTTP integration covered registration, duplicate and invalid registration, valid/invalid login, `/auth/me`, absent/invalid/expired/tampered JWTs, safe response fields, bcrypt password storage, CORS preflight, reading creation/list/update/delete/validation, duplicate handling, user-scoped query behavior, and report endpoints. All 89 assertions passed. User A could not update/delete User B's reading; both users' reading and report results remained isolated.
- Synthetic report data used disposable values only. For 2026-11-20, `90, 110, 130, 150` produced daily `high 150 / low 90 / average 120 / count 4`. Month-to-date through Nov 20 included a Nov 10 value of `70` and returned `150 / 70 / 110 / 5`; Oct 1 and Oct 31 values `80, 160` returned previous-month `160 / 80 / 120 / 2`. After updating `110 → 120`, daily average was `122.5`; after deleting `130`, it was `120 / count 3`. Empty periods returned null high/low/average and count 0. February 2024 leap day and January-to-December year rollover boundaries passed.
- Express was stopped and restarted. The test account could log in afterward, its 10 remaining readings and report statistics were still available, and Prisma reconnected to the same records. Stage 9 test users/readings were then removed by exact IDs; post-cleanup counts confirmed only the pre-existing user remained.
- A reusable opt-in real database HTTP test is available as `npm run test:integration` from `server/`. Start the local API first, then set `SWEETY_INTEGRATION_TESTS=1` and `SWEETY_API_BASE_URL=http://127.0.0.1:5000/api`. It refuses non-loopback targets or a database other than `sweety_db`, uses one random synthetic account, and deletes only that account and its tracked readings. Do not run against production or shared databases.
- Browser registration was opened, but registration submission, login/session restoration, authenticated readings/reports workflows, six-width authenticated responsiveness, keyboard/touch interactions, and visual loading/error/empty states remain unverified. The Windows Computer Use bridge stopped due to an inability to determine the active browser URL. Stage 9 is therefore **PARTIAL PASS**; do not mark end-to-end browser acceptance complete.

Authenticated responsive results (not run):

| Page | 320px | 375px | 390px | 768px | 1024px | 1440px |
| --- | --- | --- | --- | --- | --- | --- |
| Readings | Not verified | Not verified | Not verified | Not verified | Not verified | Not verified |
| Reports | Not verified | Not verified | Not verified | Not verified | Not verified | Not verified |

## Security and known limitations

- Passwords are bcrypt-hashed server-side and are not persisted in browser storage.
- JWTs are stored in `sessionStorage` for the current tab session. `sessionStorage` is readable by browser JavaScript, so an XSS vulnerability could expose a stored token; this assessment does not redesign that architecture.
- Frontend validation improves feedback; backend validation and authorization remain authoritative.
- This application is not intended for real health-data or clinical use. It provides no diagnoses, risk classifications, or medical recommendations.
- Authenticated browser workflows and responsive readings/reports checks remain unverified after Stage 9. Real PostgreSQL, Prisma migration state, API behavior, persistence, report calculations, and user data isolation were verified as documented above. This is not full browser end-to-end acceptance.

## Implementation roadmap and status

The stage names below were cross-checked against the retained stage prompts. Historical detailed verification logs are not all available; the status distinguishes implemented work from checks that remain pending.

| Stage | Scope | Status |
| --- | --- | --- |
| 1 | Project inspection, structure, environment examples and Express foundation | Implemented; commits present; historic detailed checks unavailable |
| 2 | PostgreSQL and Prisma schema, adapter, migration and DB helpers | Implemented; Stage 9 verified PostgreSQL 19.0, connection, constraints, and the initial migration already applied/up to date |
| 3 | User authentication backend | Implemented; registration, login, profile, hashing, duplicate email and JWT paths verified against real PostgreSQL via HTTP |
| 4 | Glucose readings CRUD, validation and AGENTS.md | Implemented; real create/list/update/delete, validation, uniqueness and user ownership checks passed |
| 5 | Daily, month-to-date and previous-month reporting backend | Implemented; real calculations, empty periods, leap day and year rollover passed |
| 6 | React frontend foundation, routing, layout and API configuration | Implemented; browser verification pending |
| 7 | Frontend auth, readings and reports features | Implemented; previous client lint/build and 55 mocked backend tests were recorded; live integration pending |
| 8 | UI/UX refinement, responsive/accessibility audit, frontend tests and code quality | **Complete for Stage 8.** 23 frontend and 55 backend tests pass; lint/build pass; login/register checked at six widths. Protected page browser checks are deferred to Stage 9. |
| 9 | Local PostgreSQL and Prisma migration verification, real API/UI integration, user data isolation, end-to-end workflow | **PARTIAL PASS.** PostgreSQL, existing migration state, API, reports, isolation, persistence, opt-in integration test, and regressions passed. Browser workflows and authenticated responsive layouts remain unverified. |
| 10 | Final assignment audit, remaining fixes, final documentation, readiness and interview preparation | Upcoming; not started |

Do not call the project submission-ready until real PostgreSQL integration and final assignment verification are complete.

## Future scope (not part of current stages)

Possible later enhancements include pagination, historical charts, Docker Compose, report caching, reminders, and explicitly assigned clinician accounts. Any real medical deployment would additionally require privacy, security, audit, backup, and clinical review. These are not authorized by Stages 1–10 unless the assignment changes.

## Submission checklist

- [ ] Required workflows verified end to end in the browser
- [x] Real PostgreSQL integration and user data isolation verified through API checks
- [x] Backend and frontend mocked tests pass
- [ ] Setup commands verified on a clean environment
- [ ] Safe environment examples and no committed credentials
- [ ] Seed script/demo data and demo assets reviewed against final assignment requirements
- [ ] Final assignment audit complete

## Repository rights

Copyright © 2026 Abhishek Mali. This work is being developed for recruitment evaluation. No open-source license has been granted for general reuse or commercial distribution; GitHub's terms still permit actions such as viewing and forking a public repository.
