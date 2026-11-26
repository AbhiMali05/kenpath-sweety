# Sweety — Agent Handover and Development Rules

## Project overview

Sweety is Kenpath Technologies' recruitment assessment: a personal blood-glucose tracker for registration, sign-in, per-user readings, and date-based summaries. It is a demonstration app, not a medical device. Original requirements are preserved in [Sweety_README.md](Sweety_README.md); implementation and setup status are in [README.md](README.md).

Stack: React 19, Vite 8, React Router 7, Axios, JavaScript ES modules; Node.js 22, Express 5, Prisma 7, PostgreSQL 19, `pg` adapter, bcrypt and JWT. Backend tests use Vitest and Supertest; client tests use Vitest 5, React Testing Library, user-event, jest-dom and jsdom. Client and server test dependencies are installed and lockfiles are synchronized.

## Architecture

- Browser: `client/src/main.jsx` mounts React Router and `AuthProvider`. `features/auth/` owns login, registration, and session state. `routes/ProtectedRoute.jsx` protects user pages. `features/readings/` and `features/reports/` own their screens.
- API flow: pages call feature helpers in `client/src/api/`; one Axios client handles the API base URL, bearer token, safe errors, and unauthorized-session event. The browser never connects to PostgreSQL.
- Server: `server/src/index.js` loads dotenv and listens; `app.js` configures middleware and mounts feature routers. Routes apply authentication/validation, controllers translate HTTP, and services implement business and persistence logic.
- Database: one shared Prisma Client in `server/src/config/database.js` uses Prisma's PostgreSQL driver adapter. `User` has many `GlucoseReading` records. `ReadingSlot` has four values; reading dates are PostgreSQL `DATE`. Unique email, `(userId, readingDate, slot)`, `(userId, readingDate)`, foreign key, and value range check constraints enforce data rules. Reports aggregate in the backend and are always scoped by verified user ID.
- Authentication: API hashes passwords with bcrypt and signs JWTs. The client keeps one token in `sessionStorage`, restores the profile through `/api/auth/me`, and clears invalid sessions on a 401. Browser JavaScript can read session storage; an XSS issue could expose the token.

## Repository structure

```text
client/
  src/api/                    shared Axios client and endpoint helpers
  src/components/common/      loading, error, and empty states
  src/components/layout/      brand, header, navigation, shell
  src/features/auth/          auth context, login/register, tests
  src/features/readings/      reading workflow and tests
  src/features/reports/       report workflow and tests
  src/routes/                 route protection and not-found page
  src/test/                   Vitest setup
  src/utils/                  date-only helpers and tests
  App.css, index.css          shared UI and responsive styles
  vitest.config.js            jsdom test configuration
server/
  prisma/                     Prisma schema and initial migration
  src/config/                 shared database client and read-only checks
  src/middleware/             auth middleware
  src/modules/{auth,readings,reports}/ routes, controllers, validation, services
  tests/                      mocked-Prisma API tests
AGENTS.md                     persistent agent handover
README.md                     setup, API, status, and roadmap
Sweety_README.md              original assignment requirements
```

## Development conventions

- Keep the existing client/server structure and use JavaScript ES modules. React components use PascalCase filenames; API helpers and utilities use camelCase.
- Keep backend routes, validation, controllers, and services in their established roles. Keep one shared Prisma client. Do not add endpoints unless required to fix a concrete defect.
- Call APIs through `client/src/api/client.js`; keep UI validation helpful but retain backend validation as the source of truth. Do not duplicate report calculations in the browser.
- Preserve `YYYY-MM-DD` calendar values without timezone conversion. The server uses UTC calendar boundaries for future-date validation and report ranges.
- Keep loading, error, empty, success, and disabled states accessible. Use native labels/buttons, visible focus, meaningful live status, and reduced-motion support. Do not convey status by color alone.
- Never store passwords in browser storage or log passwords, tokens, hashes, secrets, connection strings, or raw SQL details. Keep local `.env` values untouched; only expose safe placeholders in examples. Check `.gitignore` before adding config files.
- Client tests mock API helpers and never connect to PostgreSQL. Backend tests mock Prisma. Distinguish these from real database integration and browser/E2E checks.

## Implementation history and evidence

Stage names and objectives below were checked against the retained stage prompts and commit history. Historical command-by-command verification logs were not retained in the repository; only evidence explicitly available is stated.

| Stage | Objective and implementation | Verification / remaining limitations |
| --- | --- | --- |
| 1 — Project inspection, structure, and Express foundation | Established the existing React/Vite and Express applications, repository layout, environment examples, initial documentation, and Express startup foundation. | Commits `02d9641`, `54d45de`, `ffee8ec` are present. Historic detailed checks are unavailable. |
| 2 — PostgreSQL + Prisma database implementation | Added Prisma 7 schema, PostgreSQL adapter/shared client, CLI config, initial migration, and read-only database inspection/connection helpers. | Stage 9 verified PostgreSQL 19.0 on `127.0.0.1:5432`, target database `sweety_db`, migration history up to date, and schema constraints. The initial migration was already applied before Stage 9; no schema change was needed. |
| 3 — User authentication backend | Added registration/login/profile endpoints, bcrypt/JWT behavior, and backend test coverage. | Later backend suite contains auth tests; live DB integration is pending. |
| 4 — Glucose readings CRUD + validation + AGENTS.md | Added authenticated reading list/create/update/delete, date/slot/value validation, ownership scoping, and root agent instructions. | Later backend suite contains mocked-Prisma reading tests; live DB integration is pending. |
| 5 — Daily, month-to-date and monthly reporting backend | Added authenticated daily and monthly report endpoints and backend-calculated statistics. | Later backend suite contains mocked-Prisma report tests; live DB integration is pending. |
| 6 — React frontend foundation, routing, layout and API configuration | Added the React route/layout foundation and frontend/API boundaries. | Commit `dd47347` replaced much of the starter UI with the current frontend; no browser verification is recorded before Stage 8. |
| 7 — Frontend feature implementation | Implemented login/register/session restoration, protected pages, readings CRUD UI, and the three report views. | Stage 7 reported client lint/build and 55 mocked backend tests passing. No PostgreSQL or end-to-end verification. |
| 8 — UI/UX refinement, frontend testing and code quality audit | Improved responsive auth layouts, contrast, focus and touch targets; protected duplicate form submissions synchronously; added 23 frontend behavior tests. | npm install and clean `npm ci` pass; client lock is synchronized. Frontend tests pass 23/23, lint/build pass, and backend tests pass 55/55. Login and registration were visually checked at 320, 375, 390, 768, 1024 and 1440px with no horizontal overflow. Keyboard focus, password toggle, validation, and sampled text contrast were checked. Protected readings/reports visual checks require a real authenticated session and are deferred to Stage 9. No database operation was performed. Stage 8 is complete for its scope. |
| 9 — PostgreSQL, migrations, real API/UI integration and data isolation | Verified the existing PostgreSQL database and applied Prisma migration; tested real authentication, readings, reports, ownership isolation, persistence, and cleanup. Added an opt-in real HTTP integration test. | PostgreSQL connection, Prisma validation/generation/status, 89 real API assertions, persistence after Express restart, and 1 repeatable integration test passed. Existing mocked suites still pass (23 frontend, 55 backend), as do lint/build. The Windows Computer Use bridge stopped because it could not safely determine the active browser URL; authenticated browser workflows and responsive checks remain unverified. Stage 9 is PARTIAL PASS pending those browser checks. |

## Current status and limitations

- Implemented: registration/login, token session restoration/logout, protected routes, per-user reading CRUD, daily/month-to-date/previous-month backend reports, responsive UI, backend validation, Prisma schema/migration, mocked tests, frontend test source, and an opt-in real PostgreSQL HTTP integration test.
- Stage 8 verified here: clean client `npm ci`, 23/23 frontend tests, client lint, client production build, and 55/55 backend tests pass. Build output: 343.24 kB JS (109.81 kB gzip), 14.57 kB CSS (4.05 kB gzip). Compared with the earlier Stage 8 build, JS is unchanged; CSS increased 0.07 kB and gzip 0.01 kB for contrast/touch-target refinements.
- Responsive browser checks: Stage 8 login and registration passed no-overflow checks at 320, 375, 390, 768, 1024 and 1440px. Stage 9 authenticated readings/reports layouts and workflows remain unverified. The registration page was opened, but the Windows Computer Use bridge stopped when it could not determine the active browser URL with sufficient confidence. Do not claim authenticated visual or full end-to-end checks.
- Stage 9 database verification: PostgreSQL 19.0 service `postgresql-x64-19` was running; `127.0.0.1:5432` accepted connections. Docker was unavailable on PATH. Read-only inspection confirmed `sweety_db` with `User`, `GlucoseReading`, and `_prisma_migrations`; pre-test data was one user and zero readings. Prisma validation, Client generation (7.10.1), migration status, and read-only connection check passed. The existing `20261125120000_init_sweety_schema` migration was already applied and up to date, so no migration command changed the database.
- Stage 9 real API verification: 89 assertions passed against the running Express API and real PostgreSQL. Registration/login/profile, hashing and safe responses, duplicate/invalid inputs, JWT valid/missing/invalid/expired/tampered behavior, CORS, readings CRUD and constraints, report calculations/empty periods/date boundaries, and cross-user access checks passed. Deterministic Nov 20 data `90, 110, 130, 150` returned daily max 150/min 90/avg 120/count 4; month-to-date returned 150/70/110/count 5; previous month returned 160/80/120/count 2. After update then delete the daily result was max 150/min 90/avg 120/count 3. Leap day and year rollover passed.
- Stage 9 persistence: Express was stopped and restarted. The disposable account could log in after restart, its 10 remaining readings and report remained intact, and Prisma reconnected to the expected 11 total scoped records. Only the exact disposable user IDs and tracked reading IDs were removed. Post-cleanup database state returned to one pre-existing user and zero readings; no pre-existing data or unrelated database was modified.
- Stage 9 added `server/tests/integration/postgres.integration.js`, configured separately by `server/vitest.integration.config.js` and invoked with `npm run test:integration`. The test requires explicit `SWEETY_INTEGRATION_TESTS=1`, restricts both API and database to local Sweety targets, creates one random synthetic account and tracked readings, and deletes only those records. It passed 1/1. The normal backend suite remains mocked and passed 55/55 with local socket permission; frontend passed 23/23, lint/build passed.
- Vite listened on IPv6 loopback `::1:5173`; the local registration page opened. The browser bridge then stopped before authenticated workflows or responsive checks could be run. npm uses the official registry with no npm or HTTP proxy configured; registry access works with approved network permission, while sandbox DNS alone produced `ENOTFOUND`.
- Stage 8 dependency investigation: npm 10.9.2 inside the ordinary sandbox could not resolve registry DNS; elevated `npm ping` returned PONG and DNS/TCP checks passed. With network available, npm 10's Arborist peer-set resolver threw `Cannot read properties of null (reading 'edgesOut')` while installing Vitest 4. The client runner was aligned to Vitest 5.1.2, already used by the backend and compatible with Node 22.13.1 / Vite 8; `npm install` then completed, `npm ci` reproduced the install, and package manifest/lock were verified synchronized. `npm audit` reports zero vulnerabilities.
- Known security limitation: JWT in `sessionStorage` is readable by JavaScript. The app is not approved for real health-data use and has no clinical interpretation.
- Sampled auth-page foreground/background contrast ratios are at least 4.67:1 after Stage 8 fixes. This is not a formal WCAG audit.

## Roadmap

- **Stage 9 — PostgreSQL, migrations, real API/UI integration and data isolation:** PostgreSQL, migration state, real API operations, reports, ownership isolation, and database persistence are verified. **PARTIAL PASS** because authenticated browser workflows and responsive readings/reports checks remain unverified. Do not mark Stage 9 complete until those checks are performed.
- **Stage 10 — Final requirements audit, documentation, submission readiness and interview preparation:** audit original requirements, review code quality/security, run final regression checks, finalize docs, prepare the repository/submission, and prepare interview answers. Do not begin until Stage 9 is complete and requested.

## Instructions for future agents

1. Read all of `AGENTS.md` and `README.md` before starting; review the original requirements when relevant.
2. Inspect implementation, tests, and Git status before editing. Preserve completed functionality and uncommitted work.
3. Respect the explicitly requested stage boundary. Do not start the next stage automatically.
4. Run relevant verification commands; never describe an unrun check as passed.
5. Update both `AGENTS.md` and `README.md` after each stage. Keep the entire roadmap and historic status accurate; label unavailable evidence as unverified.
6. Report actual results, failures, limitations, and blockers. Do not expose secrets or credentials.
7. Do not automatically commit, push, reset, or perform destructive database operations. Do not run migrations, seed data, or live PostgreSQL checks unless the active stage explicitly requests them.
