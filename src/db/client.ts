import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

declare global {
  var __lockerPg: ReturnType<typeof postgres> | undefined;
}

// Trusted server-only connection (service role / DB password — never
// exposed to the client). RLS policies on every table still protect the
// anon-key/PostgREST path; authorization for this direct-connection path
// is enforced in application code (every query filters by the verified
// session's user id — see src/lib/auth.ts and src/lib/cards.ts).
function createConnection() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return postgres(url, { prepare: false });
}

// Cache on globalThis so Next.js dev-mode hot reload doesn't open a new
// connection pool on every edit.
const client = global.__lockerPg ?? createConnection();
if (process.env.NODE_ENV !== "production") {
  global.__lockerPg = client;
}

export const db = drizzle(client, { schema });
