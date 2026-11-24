# Sweety — Blood Glucose Tracker

**Kenpath Junior Full Stack Developer assessment** · React + Node.js/Express + PostgreSQL

> **Project status:** Initial repository structure only. Features, setup commands, migrations, and tests are not implemented yet. This README will be updated alongside the code. The application is a demonstration project, not a medical device.

## Purpose

Sweety will allow a signed-in user to record up to four blood-glucose readings per calendar day and view daily, month-to-date, and previous-month summaries. Data is isolated per user.

## Planned stack

- **Client:** React + Vite
- **API:** Node.js + Express
- **Database:** PostgreSQL 19
- **Database access:** Prisma ORM (planned)
- **Authentication:** bcrypt-hashed passwords and JWTs
- **Tests:** backend API/validation tests, plus additional tests if time permits

Despite the wording “MERN + PostgreSQL” in the brief, PostgreSQL is the required database; MongoDB is not part of the implementation.

## Required features (planned)

| Area | Requirements |
| --- | --- |
| Authentication | Register with name, email and password; log in; hash passwords with bcrypt; users access only their own data. |
| Reading management | Add, list, edit, and delete readings containing a **date**, **time slot**, and integer **mg/dL** value. |
| Time slots | `MORNING_FASTING`, `AFTER_BREAKFAST`, `AFTER_LUNCH`, `AFTER_DINNER` (display user-friendly labels). |
| Validation | Value required; whole number from **40 to 600**; no more than one reading per time slot per user per date; maximum four per date; date not in the future. Errors appear in the UI. |
| Daily report | Selected calendar date; maximum, minimum, average (1 decimal), count, and the readings with their time slots. |
| Month-to-date | From the first day of the selected date's month through the selected date, inclusive. Show max, min, average (1 decimal), and count. |
| Previous-month report | The full calendar month before the selected date's month, inclusive. Show max, min, average (1 decimal), and count. |
| Empty states | Reports show a friendly message if there are no matching readings. |
| Submission | Public GitHub link with incremental commits; seed script; README; `.env.example`; screenshots or 2–3 minute demo. |

**Example date anchor:** If the selected date is **15 October 2026**, daily = 15 October; month-to-date = 1–15 October; previous month = 1–30 September.

## Planned repository layout

```text
kenpath-sweety/
├── client/
│   ├── src/
│   │   ├── api/                  # HTTP client and API helpers
│   │   ├── components/           # Shared UI components
│   │   ├── features/
│   │   │   ├── auth/             # Login, register, session state
│   │   │   ├── readings/         # Readings list and form
│   │   │   └── reports/          # Daily and monthly report UI
│   │   ├── hooks/
│   │   └── styles/
│   └── .env.example
├── server/
│   ├── src/
│   │   ├── config/              # DB and app configuration
│   │   ├── middleware/          # Authentication and errors
│   │   ├── modules/
│   │   │   ├── auth/             # Routes, handlers, logic, validation
│   │   │   ├── readings/         # CRUD and validation
│   │   │   └── reports/          # Report calculations and queries
│   │   └── utils/
│   ├── prisma/                  # Schema, migrations, seed script
│   ├── tests/                   # Meaningful backend tests
│   └── .env.example
├── screenshots/
├── .gitignore
└── README.md
```

## Local setup (to complete after app initialization)

Prerequisites: Node.js, npm, PostgreSQL and Git.

A local PostgreSQL database named `sweety_db` has been created for development. **Do not commit database credentials.**

1. Initialize the React/Vite app in `client/` and Express app in `server/`.
2. Install each application's dependencies (`npm install`).
3. Copy `server/.env.example` to `server/.env`, and add local credentials.
4. Copy `client/.env.example` to `client/.env` if needed.
5. Create the Prisma schema, migrations, and sample-data seed script.
6. Run database migrations and the seed script.
7. Run server, client, and automated tests using the scripts documented here after implementation.

**Exact installation and run commands will be documented and tested once these files exist.**

## Planned API surface

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Register a user |
| POST | `/api/auth/login` | Obtain an authenticated session/token |
| GET | `/api/readings` | List the current user's readings |
| POST | `/api/readings` | Create a reading |
| PUT | `/api/readings/:id` | Modify own reading |
| DELETE | `/api/readings/:id` | Delete own reading |
| GET | `/api/reports/daily?date=YYYY-MM-DD` | One-day report |
| GET | `/api/reports/month-to-date?date=YYYY-MM-DD` | First of month to selected date |
| GET | `/api/reports/previous-month?date=YYYY-MM-DD` | Entire previous calendar month |

All reading/report routes will require authentication. The server will always derive the user identity from the authenticated request rather than trusting a client-supplied user ID.

## Testing plan

- Password hashing and failed logins
- Authorization: one user cannot read/edit/delete another user's data
- Missing/non-integer/out-of-range glucose values
- Duplicate slot per day, 4-reading limit, future date rejection
- Editing a reading without accidentally triggering a false duplicate
- Correct previous-month boundaries (including January → December) and average rounding
- Empty reports, and reports calculated only from the signed-in user's readings

## Notes / assumptions

- Glucose values are integers in **mg/dL**. Medical thresholds or clinical advice are out of scope.
- Dates are calendar dates (`YYYY-MM-DD`), not timestamps. Store readings with a date-only field to avoid timezone-based day shifts.
- A uniqueness constraint on `(user_id, reading_date, slot)` will prevent duplicate entries even if concurrent requests arrive.
- There are exactly four allowed slots; therefore at most four readings can exist per user per date, with readable API errors for invalid attempts.
- The previous-month report is relative to the *selected date* (not necessarily today's month).
- Demo seed records will be fictional, not real patient data.

## Future scope — **not part of the required implementation**

Only after mandatory features and tests work:

1. Pagination for `GET /readings`.
2. Historical glucose charts (Recharts).
3. Docker Compose for PostgreSQL and applications.
4. React Testing Library tests for reading forms.
5. Redis report caching with invalidation after create/update/delete.
6. BullMQ reminder jobs for days with fewer than four readings.
7. Doctor accounts with explicit patient assignment and role-based access.
8. For any real-world medical deployment: privacy review, stronger session and access controls, encryption, audit logging, backup strategy, and clinical review.

## Submission checklist

- [ ] Required features run end to end
- [ ] Backend tests pass
- [ ] README setup/run/test commands verified
- [ ] `.env.example` complete and no credentials committed
- [ ] Demo user and sample readings seeded
- [ ] Incremental Git commits and public GitHub repository
- [ ] Screenshots or 2–3 minute demonstration attached
- [ ] Assumptions and future improvements documented

## Repository rights

Copyright © 2026 Abhishek Mali. This work is being developed for recruitment evaluation. No open-source license has been granted for general reuse or commercial distribution; GitHub's terms still permit actions such as viewing and forking public repositories.
