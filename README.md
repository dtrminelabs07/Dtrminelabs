# Dtrminelabs Upload Tracker

A responsive daily upload tracker built with Next.js App Router, TypeScript, PostgreSQL/Neon, Prisma, Zod, and signed HTTP-only sessions.

## Local setup

1. Use Node.js 20.19 or newer.
2. Copy `.env.example` to `.env` and set a Neon PostgreSQL connection string plus a random `AUTH_SECRET` of at least 32 characters.
3. For Neon, use the pooled connection string for `DATABASE_URL` and the direct connection string for `DIRECT_URL` (both with TLS enabled).
4. Install packages with `npm install` (this generates the Prisma client).
5. Apply migrations with `npm run db:migrate`.
6. For a normal first administrator, set `INITIAL_ADMIN_NAME`, `INITIAL_ADMIN_EMAIL`, and a unique 12+ character `INITIAL_ADMIN_PASSWORD`, then run `npm run db:seed-admin`. This seed does not overwrite an existing account.
7. For a demo account, use a dedicated email and password; never reuse administrator credentials.
8. Start the app with `npm run dev`.

### Development or staging demo account

For local testing, set `APP_ENV=development`, `DEMO_LOGIN_ENABLED=true`, `DEMO_EMAIL` to a dedicated email, and `DEMO_PASSWORD` to a unique password of at least 12 characters. Apply migrations, then run `npm run db:seed-demo`. The script creates a least-privilege `DEMO` user and a small set of sample accounts/statuses. It refuses to convert an existing non-demo user and never runs during a Vercel Production build. Set `DEMO_ACCOUNT_READY=true` only after the seed succeeds; the login page then displays the email and password with copy controls. Do not reuse an administrator's email or password.

For Vercel Preview, set the demo credentials in **Preview only**, set `APP_ENV=staging`, and run the seed against the Preview database from a trusted shell. Set `DEMO_ACCOUNT_READY=true` after successful provisioning. The database scopes demo accounts and tracker history to the demo user; ordinary users see only workspace-owned records.

For Vercel Production, do not enable the public login panel until a dedicated demo email has been seeded against the intended production database after applying migrations. From a trusted local shell, set `APP_ENV=production`, `DEMO_SEED_PRODUCTION=true`, `DEMO_LOGIN_ENABLED=true`, and the dedicated `DEMO_EMAIL`/`DEMO_PASSWORD`, then run `npm run db:seed-demo`; never run the command in a Vercel Production build. Once provisioning succeeds, add `DEMO_EMAIL`, `DEMO_PASSWORD`, `DEMO_LOGIN_ENABLED=true`, and `DEMO_ACCOUNT_READY=true` to Vercel Production. Keep the demo password distinct from every administrator credential. If the database or credentials are missing, seeding fails closed.

No public registration route is provided. Admins create staff accounts from **Pengguna**. Passwords are hashed with bcrypt. Sessions are signed, HTTP-only, SameSite=Lax cookies and authorization reads the current role from PostgreSQL on each request.

## Database and deployment

- Prisma schema: `prisma/schema.prisma`
- Migrations: `prisma/migrations/202610270001_init` and `prisma/migrations/202610270002_demo_isolation` (adds the limited demo role and nullable account owner for isolated demo data).
- Prisma 7 uses `prisma.config.ts` for migration connection settings and the generated TypeScript client at `src/generated/prisma`. Runtime queries use Prisma's PostgreSQL driver adapter (`@prisma/adapter-pg`).
- Use Neon pooled `DATABASE_URL` at runtime and the unpooled/direct `DIRECT_URL` for migrations.
- In Vercel, configure `DATABASE_URL`, `DIRECT_URL`, and `AUTH_SECRET` for Production and Preview as appropriate. Add the initial admin variables only to a secure one-time seed environment. Configure demo credentials only after provisioning; the public demo login page renders those credentials when its readiness flags are enabled.
- Deploy the project to Vercel. Before the first production deployment, run `npm run db:migrate` against the production database from a trusted environment. Run the admin seed once, verify login, then remove the initial password variables from the deployment environment.
- Subsequent schema changes should be committed as additive Prisma migrations and applied with `npm run db:migrate` before deploying code that depends on them. Never reset a production database.

Vercel build runs Prisma Client generation and `next build`. The production deployment and database migration have not been changed from this workspace. Apply the additive demo-isolation migration to the intended database before deploying this version; a local `.env` does not configure Vercel.

## Tracker behavior

- One daily record per account/date is enforced by a PostgreSQL unique constraint. Dates are stored as PostgreSQL `DATE` and passed as UTC date keys to avoid time boundary shifts.
- Empty matrix cells mean **Belum dicatat**; they are not silently written as `PENDING`. Explicit `PENDING` is a saved state and both are included in the dashboard's not-yet-processed total.
- Every create or update is performed in a transaction with an append-only activity record attributed to the authenticated server session.
- Deactivating an account preserves its tracker and audit history.
- CSV import requires `date,account,status` headers and optional `notes`. Status codes are deliberately explicit; ambiguous colors or labels are never inferred. The import validates account names, dates, statuses, duplicate rows, and existing records before requiring a separate confirmation.
- CSV export downloads saved tracker entries for the chosen month.

## Environment variables

See `.env.example`. No database or authentication secret is bundled with the application.
