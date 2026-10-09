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

## Login PIN

Set `LOCKER_PIN` in `.env.local` and the whole app — pages, the `/files/...`
documents and every Server Action — sits behind a PIN screen instead of Google
sign-in. Also set `PIN_SESSION_SECRET` (see `.env.example` for a one-liner that
generates one); it signs the cookie that remembers you've unlocked.

- You stay unlocked for 30 days on that browser; **Sign out** in the account
  menu locks it again. Changing the PIN signs every browser out.
- With a PIN set, `SKIP_AUTH` is ignored, and the Google sign-in code is left
  dormant. Remove `LOCKER_PIN` to go back to the old behaviour.
- A short PIN has few combinations, so wrong guesses are throttled: after 5 in
  a row the app locks PIN entry for 30 s, doubling each time up to 15 min.
  That counter lives in the server's memory, so it is exact when you run the
  app yourself and only best-effort on serverless hosting.
- The PIN lives only in the env file. It is never stored in the database or
  the source.

## Google Drive uploads

The **Documents** tab can upload your files to **your own Google Drive** and add
the Drive link to each card (the local link stays too). It uses Google's login
and the narrow `drive.file` permission, so the app can only see files it
uploads itself — nothing else in your Drive. Uploaded files are private
(owner-only) and go into a `Locker Documents` folder that mirrors `docs/`.

Only files that are **attached to a card** are uploaded, and never anything in
`Needs Review`, `Inbox` or `Reference` (the server enforces this).

### One-time setup

1. [console.cloud.google.com](https://console.cloud.google.com) → create a project
   (e.g. "Locker") → **APIs & Services → Library → Google Drive API → Enable**.
2. **OAuth consent screen** (Google Auth Platform): user type **External**, add
   an app name and your email, add the scope
   `https://www.googleapis.com/auth/drive.file`, then **Publish app**.
   (While an app is in "Testing", Google expires the connection every 7 days.
   Publishing an app that only asks for `drive.file` needs no review; you'll see
   an "unverified app" screen once — choose *Advanced → continue*.)
3. **Credentials → Create credentials → OAuth client ID → Web application.**
   Under *Authorized redirect URIs* add exactly
   `http://localhost:3001/api/drive/callback`.
4. Put the client ID and secret in `.env.local`:
   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   ```
5. Restart `npm run dev`, open **Documents**, press **Connect Google Drive**,
   then **Upload N files to Drive**.

The connection (a refresh token) is stored in `data/google-drive.json` and the
list of uploaded files in `data/drive-uploads.json`; both are git-ignored.
**Disconnect** on the Documents page revokes the access and deletes the token.
Re-running an upload skips files that are already on Drive.
