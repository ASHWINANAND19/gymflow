# GymFlow — Gym Membership & Workout Progress Tracker

GymFlow is a web app for a small gym. Members buy plans, check in at the gym, log their workouts and track their progress. Trainers follow their clients and write workout plans for them. Admins manage members, trainers, plans and payments from a live dashboard.

It is built for the **DBMS Level 3 project** and uses two databases, each for the kind of data it handles best:

| Data | Database | Why |
|---|---|---|
| Users, plans, memberships, payments, check-ins, trainer assignments | **PostgreSQL** | Structured, related data involving money. Needs ACID transactions, foreign keys, constraints and triggers. |
| Workout sessions and trainer-written workout plans | **MongoDB** | Each exercise has a different shape (sets/reps/kg vs distance/minutes), the data is nested, and it is always read as a whole session. |

The full write-up (ER diagram, relational schema, data dictionary, queries, screenshots and test results) is in **[docs/REPORT.md](docs/REPORT.md)**.

---

## Features

**Member**
- Sign up, log in, see membership status and days remaining
- Buy or renew a plan. Renewals are queued to start the day after the current plan ends.
- Check in / check out. The database refuses check-ins without an active membership.
- Log workouts with exercise-specific fields, and view weekly volume charts and personal records
- View the workout plan written by their trainer

**Trainer**
- See their clients with attendance and last workout date
- Open a client to see progress charts, recent workouts and attendance
- Create or update the client's weekly workout plan

**Admin**
- Dashboard: active members, monthly revenue, people in the gym now, memberships ending soon, low-attendance members, trainer workload and the most popular exercises
- Search and filter members; record front-desk sales; cancel memberships; deactivate accounts
- Add trainers, change their capacity, assign and unassign clients
- Manage plans and the exercise catalog, filter payments, read the audit log

## Database features used

- **Transactions:** plan purchase, member sign-up and membership cancellation all run inside `BEGIN … COMMIT` and roll back on any error
- **Stored procedure / functions:** `purchase_membership`, `days_remaining`, `expire_memberships`
- **Triggers:** check-in needs an active membership; trainer capacity and plan eligibility; automatic audit log
- **Views:** `v_active_members`, `v_monthly_revenue`, `v_trainer_workload`, `v_member_attendance_30d`
- **Indexes:** composite indexes and a partial unique index (one active trainer per member)
- **MongoDB:** `$jsonSchema` validators and aggregation pipelines (weekly volume, personal records, top exercises)
- **Constraints:** PK, FK (`CASCADE` / `RESTRICT`), `UNIQUE`, `NOT NULL`, `CHECK` (email format, phone, age ≥ 14, price > 0 …)

## Tech stack

- **Frontend + API:** Next.js 16 (App Router, Route Handlers), React 19, Tailwind CSS, Recharts
- **Databases:** PostgreSQL 15+ (`pg` driver, raw parameterized SQL) and MongoDB 6+ (official driver)
- **Auth:** bcrypt password hashing and a signed JWT in an httpOnly cookie, with role checks in `proxy.js` and in every API route
- **Tests:** Node's built-in test runner

---

## Setup

### 1. Prerequisites

- Node.js 20 or newer
- PostgreSQL 15 or newer, running locally
- MongoDB 6 or newer, running locally

On macOS with Homebrew:

```bash
brew install postgresql@17 mongodb/brew/mongodb-community@7.0
brew services start postgresql@17
brew services start mongodb-community@7.0
```

Optional, to look at the MongoDB data from a terminal: `brew install mongosh`, then `mongosh gymflow`.

### 2. Install and configure

```bash
git clone https://github.com/ASHWINANAND19/gymflow.git
cd gymflow
npm install
cp .env.example .env.local
```

Edit `.env.local` and set `JWT_SECRET` to a long random string (for example the output of `openssl rand -hex 32`). Change the database URLs if your setup differs.

### 3. Create the databases and load demo data

```bash
npm run db:reset
```

This creates the `gymflow` PostgreSQL database if needed, runs every SQL file in `db/sql/` in order, creates the MongoDB collections with their validators, and seeds about 5 months of realistic data.

### 4. Run

```bash
npm run dev
```

Open http://localhost:3000.

### Demo logins

| Role | Email | Password | What to try |
|---|---|---|---|
| Admin | admin@gymflow.com | Admin@123 | Dashboard, assign a member to Meera Pillai (she is full) |
| Trainer | trainer1@gymflow.com | Trainer@123 | Open a client, edit their plan |
| Member | member1@gymflow.com | Member@123 | Check in, log a workout, view progress |
| Expired member | member2@gymflow.com | Member@123 | Try to check in (refused by trigger) |

All 40 members use `memberN@gymflow.com` / `Member@123`, and the 4 trainers use `trainerN@gymflow.com` / `Trainer@123`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the app in development mode |
| `npm run build` / `npm start` | Production build / run |
| `npm run db:setup` | Drop and recreate all tables, functions, triggers, views, indexes and Mongo collections |
| `npm run db:seed` | Load demo data into both databases |
| `npm run db:reset` | `db:setup` followed by `db:seed` |
| `npm test` | Run the test suite against separate `gymflow_test` databases |

## Project structure

```
app/
  api/                 Route Handlers (the backend API)
  admin/ trainer/ member/   Pages for each role
  login/ register/     Public pages
components/            Shared UI (layout shell, tables, charts, workout views)
lib/
  db.js                PostgreSQL pool + transaction helper
  mongo.js             MongoDB client
  auth.js session.js   Password hashing, JWT sessions, role checks
  http.js validate.js  Error handling and input validation
  sql/                 All SQL queries, one file per area
  mongo/               MongoDB queries and aggregation pipelines
db/
  sql/                 00_drop … 06_indexes, queries.sql
  mongo/setup.js       Collections, $jsonSchema validators, indexes
scripts/               setup-db.js, seed.js
tests/                 Database rule, MongoDB, auth and API logic tests
docs/                  Project report and screenshots
proxy.js               Page-level login/role guard
```

## Team

| Name | SRN | Responsibilities |
|---|---|---|
| Akarsh Kumar Gupta | PES1UG24AM021 | Relational design (ER diagram, schema, normalisation), constraints, views, indexes and important queries; admin dashboard, member search, plans, payments and audit screens |
| Aryan Arora | PES1UG24AM055 | Stored procedure and functions, triggers and transactions; authentication and role-based access; memberships, check-in and trainer-assignment APIs and screens |
| Ashwin Anand | PES1UG24AM057 | MongoDB data model, validators and aggregation pipelines; exercise catalog and the PostgreSQL–MongoDB link; seed data; workout logging, progress and trainer plan screens; app layout and documentation |

A file-by-file breakdown is in [docs/REPORT.md §15](docs/REPORT.md#15-team-contribution).
