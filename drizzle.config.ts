import { defineConfig } from "drizzle-kit";

// `generate` only diffs schema.ts against the local migrations folder and
// never opens a connection, so DATABASE_URL is optional for it. `migrate`
// and `push` do connect and will fail fast below without a real one.
//
// This Supabase project is shared with the Nook app: `schemaFilter`
// restricts every drizzle-kit command (`generate`, `migrate`, `push`,
// `pull`) to the `locker` schema so it never introspects, diffs, or
// touches `public`, `auth`, or `storage`.
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  schemaFilter: ["locker"],
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://placeholder-set-DATABASE_URL",
  },
});
