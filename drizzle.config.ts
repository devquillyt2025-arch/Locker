import { defineConfig } from "drizzle-kit";

// `generate` only diffs schema.ts against the local migrations folder and
// never opens a connection, so DATABASE_URL is optional for it. `migrate`
// and `push` do connect and will fail fast below without a real one.
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://placeholder-set-DATABASE_URL",
  },
});
