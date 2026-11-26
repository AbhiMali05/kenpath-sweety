# Sweety — Blood Glucose Tracker

Recruitment assessment project for Kenpath Technologies. Sweety is planned as a personal tracker for blood glucose readings and simple date-based summaries. It is a demonstration project, not a medical device.

## Technology stack

- Client: React, Vite, JavaScript, React Router, Axios, ESLint
- API: Node.js, Express 5, JavaScript ES modules, dotenv, CORS
- Authentication API: bcrypt-hashed passwords and signed JWT bearer tokens
- Database: PostgreSQL 19; Prisma ORM 7 with the PostgreSQL `pg` driver adapter
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
  prisma/                     schema and initial migration
  prisma.config.ts            Prisma CLI config and environment URL
  src/app.js                  Express configuration (implemented)
  src/index.js                server startup (implemented)
  src/config/database.js      shared Prisma Client
  src/config/verifyDatabase.js read-only connection check
  src/config/inspectDatabase.js read-only database/schema inspection
  src/middleware/             shared request middleware (reserved)
  src/modules/auth/           registration, login, validation, profile endpoint
  src/modules/readings/       authenticated glucose reading CRUD and validation
  src/modules/reports/        authenticated daily and monthly reports
  src/utils/                  shared utilities (reserved)
  tests/                      automated tests (planned)
  .env.example
```

## Required features (planned)

- Register and log in; hash passwords with bcrypt; restrict data to its owner.
- Create, view, edit, and delete readings with date, slot, and whole-number mg/dL value (40–600). Slots: `MORNING_FASTING`, `AFTER_BREAKFAST`, `AFTER_LUNCH`, `AFTER_DINNER`. One per slot per date, maximum four per date, and no future dates.
- Daily, month-to-date, and previous-month reports with highest, lowest, one-decimal average, and count. Daily also lists readings and slots. Previous month is relative to the selected date.

Reading CRUD and the three reporting endpoints are implemented as described below. Authentication endpoints are implemented as described in the authentication section.

## Database model

Prisma 7.10 is configured for this JavaScript ES module backend. `prisma-client-js` generates into `@prisma/client` for direct Node.js imports; although the generator is deprecated in favor of the newer generated-source workflow, it avoids introducing a TypeScript build pipeline. Prisma 7's PostgreSQL driver adapter (`@prisma/adapter-pg`) is used by the shared client.

`User` has many `GlucoseReading` records. Each reading belongs to exactly one user with cascading delete/update. PostgreSQL `DATE` stores `readingDate`; timestamps remain for audit fields. Unique email and `(userId, readingDate, slot)` indexes prevent duplicate identities and readings. A separate `(userId, readingDate)` index supports date filtering. The initial migration adds a PostgreSQL CHECK constraint for values 40–600; Prisma schema syntax does not represent this CHECK, so it is maintained in migration SQL.

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

## Reports API (implemented)

All report endpoints require `Authorization: Bearer <token>` and exactly one `date=YYYY-MM-DD` query value. Dates are validated as real calendar dates, normalized at UTC midnight, and are not restricted to today or earlier. The selected date anchors each range:

- Daily: selected date through that same date.
- Month-to-date: first of the selected date's month through the selected date, inclusive.
- Previous month: the entire calendar month before the selected date's month (including year rollover and leap years).

Every query filters on the verified user's ID and an inclusive start/exclusive next-day boundary. PostgreSQL aggregation returns maximum, minimum, average, and count; average is a numeric value rounded to one decimal. Empty periods return HTTP 200, `count: 0`, null maximum/minimum/average, and a friendly message. Daily additionally returns individual readings in enum slot order and serializes dates as `YYYY-MM-DD`.

Example: `GET /api/reports/daily?date=2026-10-15` returns `data.reportType`, `data.selectedDate`, `data.dateRange`, `data.statistics` (`highest`, `lowest`, `average`, `count`) and `data.readings`. Monthly reports return the same range and statistics fields without individual readings. The `userId` + `readingDate` index supports these scoped range queries.

## Authentication API (implemented)

`POST /api/auth/register` accepts `{ "name": "Demo User", "email": "demo@example.com", "password": "ExamplePassword123!" }`. Name is trimmed and required, email is trimmed/lowercased and format-checked, and password must be at least 8 characters. Passwords are stored only as bcrypt hashes. Duplicate email returns HTTP 409.

`POST /api/auth/login` accepts `{ "email": "demo@example.com", "password": "ExamplePassword123!" }`. Success includes a signed token, configured token lifetime, and safe profile fields. Unknown email and incorrect password share the same HTTP 401 message.

`GET /api/auth/me` requires `Authorization: Bearer <token>`. Middleware verifies an HS256 signature and expiration, then derives the numeric user id from verified `sub` claims. The profile is reloaded from PostgreSQL and excludes `passwordHash`. Missing, malformed, invalid, and expired tokens return 401. Tokens contain only the user id subject.

Example registration response (`201`):

```json
{
  "success": true,
  "message": "Account created successfully.",
  "data": {
    "user": { "id": 1, "name": "Demo User", "email": "demo@example.com", "createdAt": "2026-01-01T00:00:00.000Z" }
  }
}
```

Login returns the same safe `user` shape plus `token` and `expiresIn` under `data`. `/api/auth/me` returns `success`, `message`, and `data.user` in the same safe shape. Error responses use `{ "success": false, "message": "..." }`.

Set `JWT_SECRET` to a private, non-placeholder value of at least 32 characters and `JWT_EXPIRES_IN` (for example `1d`) in the local server environment. Never log or commit secrets or access tokens.

## Readings API (implemented)

All endpoints require `Authorization: Bearer <token>`. `POST /api/readings` creates a reading; `GET /api/readings` lists only the authenticated user's readings; `PUT /api/readings/:id` partially updates supplied fields; `DELETE /api/readings/:id` deletes an owned reading. Update fields are optional and omitted fields are preserved. The server takes user identity only from verified JWT claims; update and delete mutations also include both reading ID and user ID in their database operation. Inaccessible and nonexistent IDs both return 404.

Create example: `POST /api/readings` with `{ "readingDate": "2026-11-20", "slot": "MORNING_FASTING", "value": 105 }`. The date must be a real `YYYY-MM-DD` calendar date, not later than the current UTC date. It is persisted as PostgreSQL `DATE` and serialized back as the same calendar string. Slots are `MORNING_FASTING`, `AFTER_BREAKFAST`, `AFTER_LUNCH`, and `AFTER_DINNER`; value must be an integer from 40 through 600. Duplicate user/date/slot combinations and a full day's four slots return 409. PostgreSQL's unique constraint remains the final guard against concurrent duplicates; the API also checks for readable duplicate/daily-limit errors.

Success example: `{ "success": true, "message": "Reading created successfully.", "data": { "reading": { "id": 1, "userId": 1, "readingDate": "2026-11-20", "slot": "MORNING_FASTING", "value": 105, "createdAt": "2026-11-20T10:00:00.000Z", "updatedAt": "2026-11-20T10:00:00.000Z" } } }`. List responses contain `data.readings`, sorted newest date first, then enum slot order and ID. Update returns `data.reading`; delete returns a success/message response.

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

Prerequisites: Node.js 22.12+ (Node 22.13.1 was used) / npm and PostgreSQL 19. The local development database is `sweety_db` at `127.0.0.1:5432`.

Install dependencies in each existing application directory:

```powershell
cd server
npm install
cd ..\client
npm install
```

Keep the existing local `server/.env`; verify its `DATABASE_URL` targets `sweety_db` on `127.0.0.1:5432`. Never replace it with the example or print its contents. Prisma CLI loads the URL through `prisma.config.ts`; the config imports dotenv.

## Development and checks

```powershell
# terminal 1, from server/
npm run dev

# terminal 2, from client/
npm run dev
npm run lint
npm run build
```

Database commands (from `server/`): `npm run prisma:validate`, `npm run prisma:generate`, `npm run prisma:status`, `npm run prisma:migrate`, `npm run db:inspect`, and `npm run db:verify`. Migration applies changes; inspect generated SQL and confirm the local target first. Do not use reset commands. `db:verify` executes read-only `SELECT 1`; `db:inspect` prints database identity and public table names, never credentials. Run all isolated backend auth/readings/report tests with `npm test`; Prisma is mocked so tests do not write to the development database. See [AGENTS.md](AGENTS.md) for permanent repository instructions for coding agents.

## Current implementation status

- Implemented: existing React/Vite starter; Express JSON parsing, configurable CORS, `GET /api/health`, unknown-route JSON 404, separated app/startup modules; Prisma 7 schema/client setup; registration, login, JWT middleware, authenticated profile, authenticated glucose-reading CRUD, and daily/month-to-date/previous-month reports.
- Pending verification: real PostgreSQL-backed integration/manual checks for Stage 4 reading CRUD and Stage 5 reporting. Automated API tests use mocked Prisma and do not establish live database behavior.
- Planned: frontend authentication/readings/report features, seed data, and submission demo assets.

## Assumptions and technical decisions

- Reading dates are calendar dates (`YYYY-MM-DD`) rather than timestamps to avoid timezone shifts.
- Future-date validation compares against today's UTC calendar date; request/response date strings are preserved as UTC calendar dates.
- Glucose values are integer mg/dL and this app provides no medical advice.
- The previous-month period is based on the selected date, not today's date.
- Report date queries allow future calendar dates; only reading creation/update prohibits future dates.
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
