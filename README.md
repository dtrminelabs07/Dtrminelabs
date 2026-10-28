# Dtrminelabs Upload Tracker

A responsive daily upload tracker built with Next.js App Router, TypeScript, PostgreSQL/Neon, Prisma, Zod, and signed HTTP-only sessions.

## Local setup

1. Use Node.js 20.19 or newer.
2. Copy `.env.example` to `.env` and set a Neon PostgreSQL connection string plus a random `AUTH_SECRET` of at least 32 characters.
3. For Neon, use the pooled connection string for `DATABASE_URL` and the direct connection string for `DIRECT_URL` (both with TLS enabled).
4. Install packages with `npm install` (this generates the Prisma client).
5. Apply migrations with `npm run db:migrate`.
6. For a normal first administrator, set `INITIAL_ADMIN_NAME`, `INITIAL_ADMIN_USERNAME`, `INITIAL_ADMIN_EMAIL`, and a unique 12+ character `INITIAL_ADMIN_PASSWORD`, then run `npm run db:seed-admin`. Passwords are hashed with bcrypt.
7. Login uses usernames only. Email remains a user contact field and is not a login identifier.
8. Start the app with `npm run dev`.

### Development or staging demo account

For isolated local or staging data, set `APP_ENV=development` (or `staging`), `DEMO_LOGIN_ENABLED=true`, `DEMO_EMAIL`, `DEMO_USERNAME`, and `DEMO_PASSWORD`, then run `npm run db:seed-demo`. This creates a least-privilege `DEMO` user with sample data. Demo credentials are never rendered on the login page. Keep this account and database separate from production administrator access.

For Vercel Preview, use a separate Preview database and run the demo seed from a trusted shell only when needed. The database scopes demo accounts and tracker history to the demo user; ordinary users see only workspace-owned records.

Do not create a public demo account in Vercel Production. To promote an existing isolated demo user, first verify the target database and provide the official `ADMIN_USERNAME`. After applying the username migration, run `npm run db:promote-demo-admin` once from a trusted shell with `DEMO_EMAIL`, `ADMIN_USERNAME`, `PROMOTE_DEMO_ADMIN_TARGET`, an exactly matching `PROMOTE_DEMO_ADMIN_CONFIRM` (`local` or `production`), and `PROMOTE_DEMO_ADMIN_DATABASE_HOST` set to the exact host in `DIRECT_URL`/`DATABASE_URL`. Production promotion is restricted to a matching Neon hostname. The script requires exactly one matching `DEMO` user, retains its password hash and upload history, and moves its owned accounts into the shared workspace. It never runs during a Vercel Production build.

No public registration route is provided. Admins create staff accounts from **Pengguna**. Passwords are hashed with bcrypt. Sessions are signed, HTTP-only, SameSite=Lax cookies and authorization reads the current role from PostgreSQL on each request.

## Database and deployment

- Prisma schema: `prisma/schema.prisma`
- Migrations: initial schema, demo isolation, and `prisma/migrations/202610280001_usernames` (adds a nullable unique username; existing rows remain intact until usernames are provisioned).
- Prisma 7 uses `prisma.config.ts` for migration connection settings and the generated TypeScript client at `src/generated/prisma`. Runtime queries use Prisma's PostgreSQL driver adapter (`@prisma/adapter-pg`).
- Use Neon pooled `DATABASE_URL` at runtime and the unpooled/direct `DIRECT_URL` for migrations.
- In Vercel, configure `DATABASE_URL`, `DIRECT_URL`, and `AUTH_SECRET` for Production and Preview as appropriate. Add initial admin variables only to a secure one-time seed environment. Demo credentials are not shown on the public login page; run demo seeds only in isolated internal environments.
- Deploy the project to Vercel. Before the first production deployment, run `npm run db:migrate` against the production database from a trusted environment. Run the admin seed once, verify login, then remove the initial password variables from the deployment environment.
- Subsequent schema changes should be committed as additive Prisma migrations and applied with `npm run db:migrate` before deploying code that depends on them. Never reset a production database.

Vercel build runs Prisma Client generation and `next build`. The username migration and account promotion have not been applied to any database from this workspace. Apply the additive migration to the verified target, provision usernames, promote the intended account, and verify login before deploying this version; a local `.env` does not configure Vercel.

## Tracker behavior

- One daily record per account/date is enforced by a PostgreSQL unique constraint. Dates are stored as PostgreSQL `DATE` and passed as UTC date keys to avoid time boundary shifts.
- Empty matrix cells mean **Belum dicatat**; they are not silently written as `PENDING`. Explicit `PENDING` is a saved state and both are included in the dashboard's not-yet-processed total.
- Every create or update is performed in a transaction with an append-only activity record attributed to the authenticated server session.
- Deactivating an account preserves its tracker and audit history.
- CSV import requires `date,account,status` headers and optional `notes`. Status codes are deliberately explicit; ambiguous colors or labels are never inferred. The import validates account names, dates, statuses, duplicate rows, and existing records before requiring a separate confirmation.
- CSV export downloads saved tracker entries for the chosen month.

## Environment variables

See `.env.example`. No database or authentication secret is bundled with the application.

