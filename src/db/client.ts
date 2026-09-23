import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "app.db");

declare global {
  var __lifedeskSqlite: Database.Database | undefined;
}

function createConnection() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(path.join(DATA_DIR, "files"), { recursive: true });

  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return sqlite;
}

// Cache the connection on globalThis so Next.js dev-mode hot reload
// doesn't open a new file handle (and lose WAL state) on every edit.
const sqlite = global.__lifedeskSqlite ?? createConnection();
if (process.env.NODE_ENV !== "production") {
  global.__lifedeskSqlite = sqlite;
}

export const db = drizzle(sqlite, { schema });
export { sqlite };
