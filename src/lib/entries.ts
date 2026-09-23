import { randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { db, sqlite } from "@/db/client";
import { entries, fields, type EntryType } from "@/db/schema";

export type FieldInput = {
  key: string;
  value: string;
  sensitive: boolean;
};

export type EntryInput = {
  type: EntryType;
  title: string;
  body: string;
  tags: string[];
  fields: FieldInput[];
};

export type EntryWithFields = typeof entries.$inferSelect & {
  fields: (typeof fields.$inferSelect)[];
};

export function listEntries(type?: EntryType): EntryWithFields[] {
  const rows = type
    ? db.select().from(entries).where(eq(entries.type, type)).orderBy(desc(entries.updatedAt)).all()
    : db.select().from(entries).orderBy(desc(entries.updatedAt)).all();

  return rows.map((entry) => ({
    ...entry,
    fields: db
      .select()
      .from(fields)
      .where(eq(fields.entryId, entry.id))
      .orderBy(fields.sortOrder)
      .all(),
  }));
}

export function getEntry(id: string): EntryWithFields | undefined {
  const entry = db.select().from(entries).where(eq(entries.id, id)).get();
  if (!entry) return undefined;
  const entryFields = db
    .select()
    .from(fields)
    .where(eq(fields.entryId, id))
    .orderBy(fields.sortOrder)
    .all();
  return { ...entry, fields: entryFields };
}

export function createEntry(input: EntryInput): EntryWithFields {
  const id = randomUUID();
  const now = new Date();

  db.transaction((tx) => {
    tx.insert(entries)
      .values({
        id,
        type: input.type,
        title: input.title,
        body: input.body,
        tags: JSON.stringify(input.tags),
        createdAt: now,
        updatedAt: now,
      })
      .run();

    input.fields.forEach((field, index) => {
      tx.insert(fields)
        .values({
          id: randomUUID(),
          entryId: id,
          key: field.key,
          value: field.value,
          sensitive: field.sensitive,
          sortOrder: index,
        })
        .run();
    });
  });

  return getEntry(id)!;
}

export function updateEntry(id: string, input: EntryInput): EntryWithFields {
  const now = new Date();

  db.transaction((tx) => {
    tx.update(entries)
      .set({
        type: input.type,
        title: input.title,
        body: input.body,
        tags: JSON.stringify(input.tags),
        updatedAt: now,
      })
      .where(eq(entries.id, id))
      .run();

    tx.delete(fields).where(eq(fields.entryId, id)).run();

    input.fields.forEach((field, index) => {
      tx.insert(fields)
        .values({
          id: randomUUID(),
          entryId: id,
          key: field.key,
          value: field.value,
          sensitive: field.sensitive,
          sortOrder: index,
        })
        .run();
    });
  });

  return getEntry(id)!;
}

export function deleteEntry(id: string): void {
  // fields/vault/reminders/files/chunks cascade via FK ON DELETE CASCADE
  db.delete(entries).where(eq(entries.id, id)).run();
}

export type SearchResult = {
  entry: EntryWithFields;
  matchedField?: { key: string; value: string };
  source: "fts" | "field";
};

// Exact/keyword path: FTS5 over title+body+tags, plus a direct lookup over
// non-sensitive field key/value pairs (e.g. "IFSC", "policy no"). Sensitive
// field values are never indexed or searched here.
export function searchEntries(query: string, limit = 20): SearchResult[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const ftsQuery = trimmed
    .split(/\s+/)
    .map((term) => term.replace(/["]/g, "") + "*")
    .join(" ");

  const results = new Map<string, SearchResult>();

  try {
    const ftsRows = sqlite
      .prepare(
        `SELECT entry_id as entryId FROM entries_fts WHERE entries_fts MATCH ? ORDER BY rank LIMIT ?`
      )
      .all(ftsQuery, limit) as { entryId: string }[];

    for (const row of ftsRows) {
      const entry = getEntry(row.entryId);
      if (entry) results.set(entry.id, { entry, source: "fts" });
    }
  } catch {
    // malformed FTS query syntax (e.g. bare punctuation) - fall through to field search
  }

  if (results.size < limit) {
    const likeQuery = `%${trimmed}%`;
    const fieldRows = db
      .select({ entryId: fields.entryId, key: fields.key, value: fields.value })
      .from(fields)
      .where(
        and(
          eq(fields.sensitive, false),
          sql`(${fields.key} LIKE ${likeQuery} OR ${fields.value} LIKE ${likeQuery})`
        )
      )
      .limit(limit)
      .all();

    for (const row of fieldRows) {
      if (results.has(row.entryId)) continue;
      const entry = getEntry(row.entryId);
      if (entry) {
        results.set(entry.id, {
          entry,
          matchedField: { key: row.key, value: row.value },
          source: "field",
        });
      }
    }
  }

  return Array.from(results.values()).slice(0, limit);
}
