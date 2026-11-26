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
| 2 — PostgreSQL + Prisma database implementation | Added Prisma 7 schema, PostgreSQL adapter/shared client, CLI config, initial migration, and read-only database inspection/connection helpers. | Migration is committed; applying/verifying against real PostgreSQL remains pending for Stage 9. |
| 3 — User authentication backend | Added registration/login/profile endpoints, bcrypt/JWT behavior, and backend test coverage. | Later backend suite contains auth tests; live DB integration is pending. |
| 4 — Glucose readings CRUD + validation + AGENTS.md | Added authenticated reading list/create/update/delete, date/slot/value validation, ownership scoping, and root agent instructions. | Later backend suite contains mocked-Prisma reading tests; live DB integration is pending. |
| 5 — Daily, month-to-date and monthly reporting backend | Added authenticated daily and monthly report endpoints and backend-calculated statistics. | Later backend suite contains mocked-Prisma report tests; live DB integration is pending. |
| 6 — React frontend foundation, routing, layout and API configuration | Added the React route/layout foundation and frontend/API boundaries. | Commit `dd47347` replaced much of the starter UI with the current frontend; no browser verification is recorded before Stage 8. |
| 7 — Frontend feature implementation | Implemented login/register/session restoration, protected pages, readings CRUD UI, and the three report views. | Stage 7 reported client lint/build and 55 mocked backend tests passing. No PostgreSQL or end-to-end verification. |
| 8 — UI/UX refinement, frontend testing and code quality audit | Improved responsive auth layouts, contrast, focus and touch targets; protected duplicate form submissions synchronously; added 23 frontend behavior tests. | npm install and clean `npm ci` pass; client lock is synchronized. Frontend tests pass 23/23, lint/build pass, and backend tests pass 55/55. Login and registration were visually checked at 320, 375, 390, 768, 1024 and 1440px with no horizontal overflow. Keyboard focus, password toggle, validation, and sampled text contrast were checked. Protected readings/reports visual checks require a real authenticated session and are deferred to Stage 9. No database operation was performed. Stage 8 is complete for its scope. |

## Current status and limitations

- Implemented: registration/login, token session restoration/logout, protected routes, per-user reading CRUD, daily/month-to-date/previous-month backend reports, responsive UI, backend validation, Prisma schema/migration, backend mocked tests, and frontend test source.
- Stage 8 verified here: clean client `npm ci`, 23/23 frontend tests, client lint, client production build, and 55/55 backend tests pass. Build output: 343.24 kB JS (109.81 kB gzip), 14.57 kB CSS (4.05 kB gzip). Compared with the earlier Stage 8 build, JS is unchanged; CSS increased 0.07 kB and gzip 0.01 kB for contrast/touch-target refinements.
- Responsive browser checks: login and registration passed no-overflow checks at 320, 375, 390, 768, 1024 and 1440px. Screenshots were inspected at mobile and desktop sizes. Readings/reports screens and their loading/error/empty browser states need an authenticated session and remain for Stage 9; component behavior is covered by mocked frontend tests.
- Browser connectivity: Vite is listening on `::1:5173`; `http://localhost:5173/login` responds with HTTP 200 and loads in the browser tool. `127.0.0.1:5173` is not bound in this run. npm uses the official registry with no npm or HTTP proxy configured; registry access works with approved network permission, while sandbox DNS alone produced `ENOTFOUND`.
- No live PostgreSQL, migration, or real API integration was run. These remain Stage 9 tasks.
- Stage 8 dependency investigation: npm 10.9.2 inside the ordinary sandbox could not resolve registry DNS; elevated `npm ping` returned PONG and DNS/TCP checks passed. With network available, npm 10's Arborist peer-set resolver threw `Cannot read properties of null (reading 'edgesOut')` while installing Vitest 4. The client runner was aligned to Vitest 5.1.2, already used by the backend and compatible with Node 22.13.1 / Vite 8; `npm install` then completed, `npm ci` reproduced the install, and package manifest/lock were verified synchronized. `npm audit` reports zero vulnerabilities.
- Known security limitation: JWT in `sessionStorage` is readable by JavaScript. The app is not approved for real health-data use and has no clinical interpretation.
- Sampled auth-page foreground/background contrast ratios are at least 4.67:1 after Stage 8 fixes. This is not a formal WCAG audit.

## Roadmap

- **Stage 9 — Local PostgreSQL setup and integration verification:** verify local database identity, inspect migration status, verify/apply the existing Prisma migration without reset, run real authenticated backend/API and frontend integration workflows, and confirm user-specific data isolation. Do not begin until explicitly requested.
- **Stage 10 — Final assignment audit and submission preparation:** audit requirements, fix remaining defects, finalize documentation, assess submission readiness, and prepare interview answers. Do not begin until Stage 9 is complete and requested.

## Instructions for future agents

1. Read all of `AGENTS.md` and `README.md` before starting; review the original requirements when relevant.
2. Inspect implementation, tests, and Git status before editing. Preserve completed functionality and uncommitted work.
3. Respect the explicitly requested stage boundary. Do not start the next stage automatically.
4. Run relevant verification commands; never describe an unrun check as passed.
5. Update both `AGENTS.md` and `README.md` after each stage. Keep the entire roadmap and historic status accurate; label unavailable evidence as unverified.
6. Report actual results, failures, limitations, and blockers. Do not expose secrets or credentials.
7. Do not automatically commit, push, reset, or perform destructive database operations. Do not run migrations, seed data, or live PostgreSQL checks unless the active stage explicitly requests them.
