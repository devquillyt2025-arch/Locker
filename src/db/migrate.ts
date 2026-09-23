import path from "node:path";
import fs from "node:fs";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db, sqlite } from "./client";

let migrated = false;

export function runMigrations() {
  if (migrated) return;
  migrated = true;

  migrate(db, { migrationsFolder: path.join(process.cwd(), "src/db/migrations") });

  const ftsSql = fs.readFileSync(path.join(process.cwd(), "src/db/fts.sql"), "utf-8");
  sqlite.exec(ftsSql);
}
