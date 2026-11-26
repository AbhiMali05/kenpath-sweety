# Repository guidance for coding agents

## Project identity and boundaries

Sweety is Kenpath Technologies' recruitment assessment: a personal blood-glucose tracker built with React/Vite, Node.js/Express (JavaScript ES modules), Prisma 7, PostgreSQL, bcrypt, JWT, Vitest, and Supertest. This is a demonstration app, not medical software. Read [README.md](README.md) for product requirements, setup, endpoint details, and status. Implement only the feature or stage requested by the user; do not start later work automatically.

## Required context before changes

Read README.md and this file, inspect relevant source/tests, inspect Git status, and identify existing behavior and conventions before editing. Do not assume a file's contents without opening it. Preserve working features and unrelated user changes.

## Architecture

- `client/src/api/`: HTTP client and API helpers.
- `client/src/components/`: reusable UI, with `common/` and `layout/` subdivisions.
- `client/src/features/{auth,readings,reports}/`: feature-specific screens and client logic.
- `client/src/hooks/`, `client/src/styles/`: shared hooks and styles.
- `server/src/app.js`, `index.js`: Express configuration and process startup.
- `server/src/config/`: shared configuration and the single Prisma Client.
- `server/src/middleware/`: cross-cutting request handling, including authentication.
- `server/src/modules/{auth,readings,reports}/`: feature routes, controllers, validation, and services.
- `server/src/utils/`: small shared helpers.
- `server/prisma/schema.prisma`, `migrations/`: PostgreSQL data model and versioned schema changes.
- `server/tests/`: automated backend tests.

Routes bind URL/middleware, controllers handle HTTP input/output, validation rejects malformed input, and services contain business rules and Prisma access.

## Coding conventions

Use JavaScript ES modules and existing naming/response patterns. Keep controllers focused, business logic in services, and validation separate where useful. Reuse shared configuration and avoid duplicate logic, unnecessary dependencies, premature optimization, and abstractions that obscure straightforward behavior. Prefer clear code.

## Database rules

PostgreSQL is required and Prisma is the ORM. Reuse the shared Prisma Client; never create one per request. Preserve database constraints and use migrations for schema changes. Never reset a database, delete existing data, or modify an unrelated database automatically. Destructive data/schema changes require explicit user approval.

## Security rules

Never commit `.env` files or expose database credentials/JWT secrets. Never log passwords, password hashes, or JWTs. Hash passwords with bcrypt; verify JWTs on protected routes; derive identity only from verified claims. Scope every user-specific read and mutation to the authenticated user, never a client-supplied user ID. Never return `passwordHash` or expose SQL errors/stack traces to clients.

## Date handling

Reading dates are calendar dates in exact `YYYY-MM-DD` form and PostgreSQL `DATE`, not timestamps. Preserve the calendar date without timezone shifts. Follow the README's UTC convention for future-date checks and test date boundaries.

## Testing requirements

Before declaring work complete, run relevant tests, preserve existing behavior, and add tests for business rules, invalid inputs, authorization, and edge cases. Verify HTTP behavior when possible. Distinguish mocked tests from real database integration checks and never claim an unrun check passed.

## Git rules

Inspect status before editing. Preserve history; do not commit, push, change repository visibility, or stage secrets automatically. Review the diff. Do not run destructive Git commands without explicit permission. Suggest meaningful feature-based commit messages when useful.

## Documentation

Update README.md when APIs, setup, or behavior change. Keep implemented and planned work distinct; document assumptions, decisions, and test commands. Preserve useful future scope and repository-rights information. Keep these agent instructions concise instead of copying the README.

## Workflow and handoff

Work through: Inspect → Plan → Implement → Test → Review → Document → Report. Finish only the requested scope. Report changes, created/modified files, executed tests and results, technical decisions, limitations, remaining tasks, and a suggested commit message.

## Known concerns to re-check

Node watch-mode startup behavior and npm audit findings in Prisma's dependency chain were observed previously. Treat these as items to verify against current state, not confirmed defects. Do not change working configuration or install/update packages solely based on historical notes; inspect current evidence first.
