# Thunder OA + LIFF — Phase 1

A feature-modular monorepo for the trainee booking platform. The pilot's hard-coded prototype endpoints and frontend fallback metrics have been replaced with database-backed modules and explicit loading/error states.

## Architecture

```text
LINE OA / LIFF Trainee App                Admin Web
React + TypeScript + Vite                 React + TypeScript + Vite
        |                                             |
        +---------------- HTTPS REST API -------------+
                               |
                       NestJS feature modules
  Auth / Trainees / Packages / Payments / Trainers / Classes
            Bookings / Attendance / Dashboard / LINE
                               |
                    Prisma + PostgreSQL
```

### Applications and responsibilities

- `apps/liff` — member-facing LIFF experience: account linking, package balance, open classes, booking/cancellation, and booking history.
- `apps/admin` — admin console: trainee profiles, one-time LINE linking codes, package setup, manual payment confirmation, schedule management, attendance operations, and manual trainee enrollment into an open class.
- `apps/api` — NestJS REST API. Each business capability is isolated in a module; controllers validate/route requests and services own business rules and transactions.
- `packages/shared` — shared API contracts consumed by both frontends.
- `apps/api/prisma` — canonical data model and versioned SQL migrations.

The duplicate prototype app under `apps/web` was removed to avoid maintaining two competing frontends. The LIFF and Admin apps stay separate but share the same contracts and design conventions.

## Tech stack

- Frontends: React, TypeScript, Vite, TanStack Query, React Hook Form + Zod for admin forms, React Router, LINE LIFF SDK, and shared local UI primitives with CSS design tokens. Tailwind/shadcn are not yet wired into this pilot.
- Backend: NestJS, REST, DTO validation (`class-validator`), Swagger/OpenAPI, helmet, JWT sessions, bcrypt, LINE Messaging API.
- Data: PostgreSQL, Prisma ORM, migrations, transactions, unique constraints, credit ledger, notification log, audit log.
- Tooling: Node.js, pnpm workspaces, Docker Compose, ESLint flat config, Jest + ts-jest unit test setup, Markdown and OpenAPI documentation.

## Prerequisites

- Node.js 22.13+ (or Node.js 24 LTS); NestJS 12 requires Node.js 20.19+ or 22.12+ for CommonJS interoperability with ESM packages, and the current ESLint line requires Node.js 22.13+.
- pnpm 9.15.x (`corepack enable` is the preferred install method)
- Docker Desktop / Docker Engine for local PostgreSQL
- A LINE Login/LIFF channel and a LINE Messaging API channel for end-to-end LINE features

## Local setup

1. Install pnpm and dependencies:

   ```bash
   corepack enable
   corepack prepare pnpm@9.15.0 --activate
   pnpm install --no-frozen-lockfile
   ```

   The pilot lockfile predates newly introduced authentication, security, and form dependencies, and its workspace entries are stale. Run this first install with `--no-frozen-lockfile` to regenerate `pnpm-lock.yaml`, then commit the regenerated lockfile for subsequent frozen/CI installs. NestJS 12 tooling requires TypeScript 6; the API test transformer is aligned to the current `ts-jest` 29.4 line.

2. Create local environment files:

   ```bash
   cp .env.example .env
   cp .env.example apps/api/.env
   ```

   Fill in `JWT_SECRET` with a unique random value of at least 32 characters. Keep real `.env` files out of version control. Vite reads `VITE_LIFF_ID` and `VITE_API_BASE_URL` from the repository-root `.env`; the API/Prisma CLI reads `apps/api/.env`.

3. Start PostgreSQL and prepare the database:

   ```bash
   pnpm docker:db
   pnpm --filter @thunder/api prisma:generate
   pnpm db:deploy
   pnpm db:seed-admin
   ```

   Use an `ADMIN_PASSWORD` with at least 12 characters. The seed script hashes the password; it does not store it in plain text.

4. Start each app in a separate terminal:

   ```bash
   pnpm dev:api
   pnpm dev:admin
   pnpm dev:liff
   ```

   - API: `http://localhost:3001/api`
   - API readiness: `http://localhost:3001/api/health/ready`
   - Swagger (development only): `http://localhost:3001/api/docs`
   - Admin Web: `http://localhost:5174`
   - LIFF dev server: `http://localhost:5173` (LINE OAuth/LIFF works fully only when configured and opened via a valid LIFF URL)

5. For day-to-day development, use `pnpm lint`, `pnpm build`, `pnpm --filter @thunder/api test`, and `pnpm --filter @thunder/api prisma:validate` before merging changes. The API has a dedicated `tsconfig.build.json` so production builds emit files, while type-checking can remain no-emit.

## Existing pilot database — important

The first migration (`20261025000000_baseline`) describes the original pilot schema; the next migration upgrades it to the new schema. If the current pilot database was created by `prisma db push` and has **no Prisma migration history**, do not blindly run `migrate deploy` against it. First take a verified backup and compare the database schema with `apps/api/prisma/migrations/20261025000000_baseline/migration.sql`. If they match the original pilot schema, mark the baseline as already applied and then deploy the upgrade:

```bash
pnpm --filter @thunder/api exec prisma migrate resolve --applied 20261025000000_baseline
pnpm db:deploy
```

This is only valid if the live database really matches the baseline. If it has drifted or has existing migration history, reconcile migrations deliberately rather than forcing a baseline. Test the procedure against a restored copy before touching production data.

## Authentication and LINE setup

- Admin sign-in: `POST /api/auth/admin/login`; admin endpoints require a signed Bearer JWT and re-check that the admin user remains active.
- LIFF sign-in: the app exchanges the LINE ID token at `POST /api/auth/line/session`. The API validates it with LINE and issues a short-lived application JWT; regular API requests are verified locally.
- Member linking: Admin generates a random one-time code. Only the hash is stored; the code expires after 24 hours and is consumed transactionally. A LINE account cannot be linked to two different trainee profiles.
- LINE messages: configure `LINE_CHANNEL_ACCESS_TOKEN`. Booking confirmations are sent as a Flex Message with a check-in postback button. Configure the webhook URL to `https://<public-api-host>/api/line/webhook` and set the matching channel secret for HMAC signature verification.
- LIFF needs the `openid` scope to obtain an ID token. The `profile` scope is optional for display name/avatar.
- The LINE OA must be able to message the user. Messaging may be skipped when the user has not linked LINE or required credentials are absent; check `NotificationLog` when debugging delivery.

## Domain rules implemented

- A trainee must have an active membership and a usable entitlement to book. Admin-created bookings use the same membership, overlap, capacity, entitlement, and credit-reservation rules as trainee-created bookings.
- Booking checks class status, start time, duplicate bookings, overlapping bookings, capacity, and entitlement balance within a serializable database transaction. Shared, unit-tested booking policy helpers keep seat occupancy and time cutoffs consistent across modules.
- Finite session credits are reserved at booking time and recorded in `CreditLedger`; eligible cancellations and studio cancellation return credits with idempotency keys.
- Cancellation is allowed up to (and including) 60 minutes before a class starts. The API is the source of truth; frontend timing is only a usability hint.
- LINE check-in validates the signed webhook, matched LINE account, booking ownership, active membership, and the configured check-in window (30 minutes before to 15 minutes after start). Duplicate check-in requests do not create duplicate attendance.
- Manual payment confirmation creates the entitlement and updates payment/member state in one database transaction.
- API failures are shown as errors; the frontends do not replace failed requests with fabricated sample metrics.

## Feature/module map

| Module | Responsibilities |
|---|---|
| `auth` + `common/security` | Admin login, LINE ID-token exchange, application sessions, route protection |
| `trainees` | Trainee CRUD, membership status, one-time LINE linking |
| `packages` | Package definitions and activation |
| `payments` | Manual payment records and entitlement activation |
| `trainers` | Trainer directory and active status |
| `classes` | Schedule creation, capacity metadata, close/cancel workflows |
| `bookings` | List/create/cancel trainee bookings, admin enrollment, seat and credit consistency; shared booking policy |
| `attendance` | Check-in, attendance status and admin corrections |
| `line` | ID-token verification, Messaging API and signed webhook/postback |
| `dashboard` | Admin KPIs and trainee self-service summary |
| `health` | Liveness and database readiness probes |

## Known boundaries before production

- Live LINE credentials, webhook URL, LIFF channel settings, domain, and hosting are environment-specific and are intentionally not included.
- Payment entry is manual; no payment gateway or automatic reconciliation is integrated.
- `ADMIN` and `MANAGER` currently pass the same broad admin guard. Define least-privilege role policies and apply route-level authorization before onboarding more staff.
- Notification send attempts are logged, but a durable queue/retry worker is not included. A queue/outbox pattern is recommended if delivery must be guaranteed.
- API/database integration tests against PostgreSQL and an end-to-end LINE webhook test still need to run in an environment with installed dependencies and configured services.
- Production deployment, secrets management, rate limiting, monitoring, automated backups, CI/CD, and hosting are outside this repository's current scope.
