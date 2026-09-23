# Locker

A private, hosted personal document & info index. Everything is a **card**:
structured details plus links to the real files, which live in your own
Google Drive / DigiLocker — Locker never stores file contents, only links.

Single-user, allowlisted to one Google account. Next.js on Vercel,
Supabase Postgres via Drizzle, RLS on every table.

## Phase 1 — this branch

Repo migration off local SQLite, Supabase schema + RLS, Google auth
allowlist, card CRUD with templates, links UI. Search here is a
placeholder (Postgres `ILIKE`); real Fuse + FTS + trigram search lands in
phase 3. Secret field values are stored as plain text for now with an
`is_secret` flag only — browser-side AES-256-GCM encryption lands in
phase 2.

## Setup

### 1. Create a Supabase project

1. [supabase.com](https://supabase.com) -> New project.
2. **Project Settings -> API**: copy the Project URL and `anon` public key.
3. **Project Settings -> Database -> Connection string -> Transaction
   pooler** (port 6543): copy it as `DATABASE_URL`.
4. **Authentication -> Sign In / Providers -> Google**: enable it, following
   Supabase's guide to create a Google OAuth client (Google Cloud Console).
   Add this project's `/auth/callback` URL (both your local
   `http://localhost:3000/auth/callback` and your deployed URL) as an
   authorized redirect URI in the Google OAuth client.

### 2. Configure env vars

```bash
cp .env.example .env
```

Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`DATABASE_URL`, and `ALLOWED_EMAIL` (the one Google account allowed to use
this Locker — every other signed-in account is rejected server-side).

### 3. Install and migrate

```bash
npm install
npm run db:generate   # only needed after schema.ts changes
npm run db:migrate    # applies migrations to your Supabase Postgres
```

### 4. Run

```bash
npm run dev
```

Sign in with the allowlisted Google account at `http://localhost:3000`.

### 5. Seed fake data (optional)

Sign in once first (so a Supabase auth user exists), find your user id in
**Supabase Dashboard -> Authentication -> Users**, then:

```bash
SEED_USER_ID=<your-user-uuid> npm run db:seed
```

Fake data and dummy Drive URLs only — never run this against real personal
data.

## Deploying

Deploy to Vercel and set the same env vars there (use your deployed origin
for the Google OAuth redirect URI and `/auth/callback`).
