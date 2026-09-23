import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
} from "drizzle-orm/sqlite-core";

export const ENTRY_TYPES = [
  "note",
  "account",
  "document",
  "date",
  "contact",
  "id_doc",
] as const;
export type EntryType = (typeof ENTRY_TYPES)[number];

export const RECURRENCE_TYPES = ["none", "yearly", "monthly"] as const;
export type Recurrence = (typeof RECURRENCE_TYPES)[number];

export const REMINDER_STATUS = ["pending", "done", "snoozed"] as const;
export type ReminderStatus = (typeof REMINDER_STATUS)[number];

export const entries = sqliteTable("entries", {
  id: text("id").primaryKey(),
  type: text("type", { enum: ENTRY_TYPES }).notNull(),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  // JSON-encoded string array
  tags: text("tags").notNull().default("[]"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const fields = sqliteTable("fields", {
  id: text("id").primaryKey(),
  entryId: text("entry_id")
    .notNull()
    .references(() => entries.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  value: text("value").notNull().default(""),
  sensitive: integer("sensitive", { mode: "boolean" }).notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

// Encrypted values for fields flagged `sensitive`. The plaintext never
// touches `fields.value` once a vault row exists for it (phase 2).
export const vault = sqliteTable("vault", {
  id: text("id").primaryKey(),
  fieldId: text("field_id")
    .notNull()
    .unique()
    .references(() => fields.id, { onDelete: "cascade" }),
  ciphertext: text("ciphertext").notNull(),
  iv: text("iv").notNull(),
  authTag: text("auth_tag").notNull(),
  masked: text("masked").notNull(), // e.g. "XXXX4417" shown to the LLM/UI
});

export const reminders = sqliteTable("reminders", {
  id: text("id").primaryKey(),
  entryId: text("entry_id")
    .notNull()
    .references(() => entries.id, { onDelete: "cascade" }),
  dueDate: text("due_date").notNull(), // ISO date, YYYY-MM-DD
  recurrence: text("recurrence", { enum: RECURRENCE_TYPES })
    .notNull()
    .default("none"),
  // JSON-encoded number array, e.g. [30,7,1]
  leadDays: text("lead_days").notNull().default("[]"),
  status: text("status", { enum: REMINDER_STATUS }).notNull().default("pending"),
});

export const files = sqliteTable("files", {
  id: text("id").primaryKey(),
  entryId: text("entry_id")
    .notNull()
    .references(() => entries.id, { onDelete: "cascade" }),
  path: text("path").notNull(),
  mime: text("mime").notNull(),
  extractedText: text("extracted_text").notNull().default(""),
  contentHash: text("content_hash").notNull().default(""),
});

export const chunks = sqliteTable("chunks", {
  id: text("id").primaryKey(),
  entryId: text("entry_id")
    .notNull()
    .references(() => entries.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  // populated in phase 4/5 via sqlite-vec; null until embedded
  embedding: text("embedding"),
});
