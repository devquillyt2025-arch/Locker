# Locker

A private, hosted personal document & info index. Everything is a **card**:
structured details plus links to the real files, which live in your own
Google Drive / DigiLocker — Locker never stores file contents, only links.

Single-user, allowlisted to one Google account. Next.js on Vercel,
Supabase Postgres via Drizzle, RLS on every table.

## Shared Supabase project

This app's Supabase project is shared with the Nook app. Every Locker
table, enum, and index lives in the **`locker` Postgres schema** —
`src/db/schema.ts` uses `pgSchema("locker")` for everything, and
`drizzle.config.ts` sets `schemaFilter: ["locker"]` so `generate`/
`migrate`/`push` never introspect or touch `public`, `auth`, or `storage`.
Nook's tables, functions, and triggers are untouched by anything in this
repo. Any migration SQL Locker generates only ever contains `locker.*`
statements — verify that before running `npm run db:migrate`.

Auth is also shared: Locker reuses the project's existing Google sign-in
rather than creating its own users, and this repo never changes Auth
settings. One-time manual setup, done in the Supabase dashboard (not by
this app):

- **Database -> Schemas -> Exposed schemas**: add `locker`.
- **Authentication -> URL Configuration -> Redirect URLs**: add
  `http://localhost:3000/auth/callback` and `<your-vercel-url>/auth/callback`.
  Leave the project's Site URL unchanged (that's Nook's).

## Phase 1 — this branch

Repo migration off local SQLite, Supabase schema + RLS, Google auth
allowlist, card CRUD with templates, links UI. Search here is a
simple in-memory ranker over the cards already loaded on the client
(instant, no server call); typo-tolerant Fuse + FTS + trigram search lands
in phase 3. Secret field values are stored as plain text for now with an
`is_secret` flag only — browser-side AES-256-GCM encryption lands in
phase 2.

## Setup

### 1. Env vars

```bash
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (both
from **Project Settings -> API**), `DATABASE_URL` (**Project Settings ->
Database -> Connection string -> Transaction pooler**, port 6543), and
`ALLOWED_EMAIL` (the one Google account allowed to use this Locker — every
other signed-in account is rejected server-side). `.env.local` is
gitignored; `.env.example` stays a template with no real values.

### 2. Install and migrate

```bash
npm install
npm run db:generate   # only needed after schema.ts changes; doesn't touch the DB
npm run db:migrate    # applies locker.* migrations to the shared Supabase Postgres
```

`db:migrate`/`db:seed` load `.env.local` explicitly (via Node's
`--env-file`) since the Next.js app and the CLI scripts are separate
processes.

### 3. Run

```bash
npm run dev
```

Sign in with the allowlisted Google account at `http://localhost:3000`.

### 4. Seed fake data (optional)

Sign in once first (so a Supabase auth user exists), find your user id in
**Supabase Dashboard -> Authentication -> Users**, then:

```bash
SEED_USER_ID=<your-user-uuid> npm run db:seed
```

Fake data and dummy Drive URLs only — never run this against real personal
data.

## Deploying

Deploy to Vercel and set the same env vars there (use your deployed origin
for the `/auth/callback` redirect URL added above).
