import { sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  date,
  jsonb,
  index,
  pgPolicy,
} from "drizzle-orm/pg-core";
import { authUid, authenticatedRole } from "drizzle-orm/supabase";

export const CARD_TYPES = [
  "id_doc",
  "bank",
  "insurance",
  "vehicle",
  "property",
  "medical",
  "education",
  "contact",
  "note",
] as const;
export type CardType = (typeof CARD_TYPES)[number];

export const RECURRENCE_TYPES = ["none", "yearly", "monthly"] as const;
export type Recurrence = (typeof RECURRENCE_TYPES)[number];

export const REMINDER_STATUS = ["pending", "done", "snoozed"] as const;
export type ReminderStatus = (typeof REMINDER_STATUS)[number];

export const LINK_SOURCES = ["drive", "digilocker", "other"] as const;
export type LinkSource = (typeof LINK_SOURCES)[number];

export const LINK_KINDS = ["image", "pdf", "doc", "folder"] as const;
export type LinkKind = (typeof LINK_KINDS)[number];

export const cardTypeEnum = pgEnum("card_type", CARD_TYPES);
export const recurrenceEnum = pgEnum("recurrence", RECURRENCE_TYPES);
export const reminderStatusEnum = pgEnum("reminder_status", REMINDER_STATUS);
export const linkSourceEnum = pgEnum("link_source", LINK_SOURCES);
export const linkKindEnum = pgEnum("link_kind", LINK_KINDS);

// Every table carries `user_id` (denormalized, not just via a join to
// `cards`) so a single equality check drives RLS on each table directly —
// the Supabase-recommended shape for row-level policies. This app only
// ever has one allowlisted user, but the policies are real: they're what
// protects the anon-key / PostgREST / future client-side Supabase access
// paths. Server Actions here connect over a trusted direct DB connection
// (service role) and additionally filter by the verified session's user id
// in application code — see src/lib/auth.ts.

export const cards = pgTable(
  "cards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    type: cardTypeEnum("type").notNull(),
    title: text("title").notNull(),
    aliases: jsonb("aliases").$type<string[]>().notNull().default([]),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("cards_user_id_idx").on(table.userId),
    pgPolicy("owner_crud", {
      for: "all",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
      withCheck: sql`${authUid} = ${table.userId}`,
    }),
  ]
).enableRLS();

export const fields = pgTable(
  "fields",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    cardId: uuid("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    // Plaintext for non-secret fields. For secret fields (phase 2) this
    // holds the AES-256-GCM ciphertext, base64-encoded; iv/salt carry the
    // per-field encryption params. The server never sees the passphrase or
    // plaintext of a secret field.
    value: text("value").notNull().default(""),
    isSecret: boolean("is_secret").notNull().default(false),
    iv: text("iv"),
    salt: text("salt"),
    masked: text("masked"), // e.g. "XXXX4417", shown in the UI without unlocking
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    index("fields_card_id_idx").on(table.cardId),
    pgPolicy("owner_crud", {
      for: "all",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
      withCheck: sql`${authUid} = ${table.userId}`,
    }),
  ]
).enableRLS();

export const links = pgTable(
  "links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    cardId: uuid("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    label: text("label").notNull().default(""), // "Front", "Back", "e-Aadhaar"
    url: text("url").notNull(),
    source: linkSourceEnum("source").notNull().default("other"),
    driveFileId: text("drive_file_id"),
    kind: linkKindEnum("kind").notNull().default("doc"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    index("links_card_id_idx").on(table.cardId),
    pgPolicy("owner_crud", {
      for: "all",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
      withCheck: sql`${authUid} = ${table.userId}`,
    }),
  ]
).enableRLS();

export const reminders = pgTable(
  "reminders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    cardId: uuid("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    // Which field on the card this reminder tracks (e.g. "Renews"); null
    // for a standalone reminder not tied to a specific field.
    fieldKey: text("field_key"),
    dueDate: date("due_date").notNull(),
    recurrence: recurrenceEnum("recurrence").notNull().default("none"),
    leadDays: jsonb("lead_days").$type<number[]>().notNull().default([30, 7, 1]),
    status: reminderStatusEnum("status").notNull().default("pending"),
  },
  (table) => [
    index("reminders_card_id_idx").on(table.cardId),
    index("reminders_due_date_idx").on(table.dueDate),
    pgPolicy("owner_crud", {
      for: "all",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
      withCheck: sql`${authUid} = ${table.userId}`,
    }),
  ]
).enableRLS();

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    deviceLabel: text("device_label"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("push_subscriptions_user_id_idx").on(table.userId),
    pgPolicy("owner_crud", {
      for: "all",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
      withCheck: sql`${authUid} = ${table.userId}`,
    }),
  ]
).enableRLS();
