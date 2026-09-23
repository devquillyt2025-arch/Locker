import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db/client";
import { cards, fields, links, type CardType } from "@/db/schema";

export type FieldInput = {
  key: string;
  value: string;
  isSecret: boolean;
};

export type LinkInput = {
  label: string;
  url: string;
  source: "drive" | "digilocker" | "other";
  driveFileId: string | null;
  kind: "image" | "pdf" | "doc" | "folder";
};

export type CardInput = {
  type: CardType;
  title: string;
  aliases: string[];
  tags: string[];
  notes: string;
  fields: FieldInput[];
  links: LinkInput[];
};

export type CardWithDetails = typeof cards.$inferSelect & {
  fields: (typeof fields.$inferSelect)[];
  links: (typeof links.$inferSelect)[];
};

export async function listCards(userId: string, type?: CardType): Promise<CardWithDetails[]> {
  const rows = await db
    .select()
    .from(cards)
    .where(type ? and(eq(cards.userId, userId), eq(cards.type, type)) : eq(cards.userId, userId))
    .orderBy(desc(cards.updatedAt));

  return attachDetails(userId, rows);
}

export async function getCard(userId: string, id: string): Promise<CardWithDetails | undefined> {
  const card = await db
    .select()
    .from(cards)
    .where(and(eq(cards.id, id), eq(cards.userId, userId)))
    .then((rows) => rows[0]);
  if (!card) return undefined;

  const [cardFields, cardLinks] = await Promise.all([
    db.select().from(fields).where(and(eq(fields.cardId, id), eq(fields.userId, userId))).orderBy(fields.sortOrder),
    db.select().from(links).where(and(eq(links.cardId, id), eq(links.userId, userId))).orderBy(links.sortOrder),
  ]);

  return { ...card, fields: cardFields, links: cardLinks };
}

async function attachDetails(
  userId: string,
  rows: (typeof cards.$inferSelect)[]
): Promise<CardWithDetails[]> {
  return Promise.all(
    rows.map(async (card) => {
      const [cardFields, cardLinks] = await Promise.all([
        db.select().from(fields).where(and(eq(fields.cardId, card.id), eq(fields.userId, userId))).orderBy(fields.sortOrder),
        db.select().from(links).where(and(eq(links.cardId, card.id), eq(links.userId, userId))).orderBy(links.sortOrder),
      ]);
      return { ...card, fields: cardFields, links: cardLinks };
    })
  );
}

export async function createCard(userId: string, input: CardInput): Promise<CardWithDetails> {
  const id = await db.transaction(async (tx) => {
    const [card] = await tx
      .insert(cards)
      .values({
        userId,
        type: input.type,
        title: input.title,
        aliases: input.aliases,
        tags: input.tags,
        notes: input.notes,
      })
      .returning({ id: cards.id });

    if (input.fields.length > 0) {
      await tx.insert(fields).values(
        input.fields.map((field, index) => ({
          userId,
          cardId: card.id,
          key: field.key,
          value: field.value,
          isSecret: field.isSecret,
          sortOrder: index,
        }))
      );
    }

    if (input.links.length > 0) {
      await tx.insert(links).values(
        input.links.map((link, index) => ({
          userId,
          cardId: card.id,
          label: link.label,
          url: link.url,
          source: link.source,
          driveFileId: link.driveFileId,
          kind: link.kind,
          sortOrder: index,
        }))
      );
    }

    return card.id;
  });

  return (await getCard(userId, id))!;
}

export async function updateCard(
  userId: string,
  id: string,
  input: CardInput
): Promise<CardWithDetails> {
  await db.transaction(async (tx) => {
    await tx
      .update(cards)
      .set({
        type: input.type,
        title: input.title,
        aliases: input.aliases,
        tags: input.tags,
        notes: input.notes,
        updatedAt: new Date(),
      })
      .where(and(eq(cards.id, id), eq(cards.userId, userId)));

    await tx.delete(fields).where(and(eq(fields.cardId, id), eq(fields.userId, userId)));
    await tx.delete(links).where(and(eq(links.cardId, id), eq(links.userId, userId)));

    if (input.fields.length > 0) {
      await tx.insert(fields).values(
        input.fields.map((field, index) => ({
          userId,
          cardId: id,
          key: field.key,
          value: field.value,
          isSecret: field.isSecret,
          sortOrder: index,
        }))
      );
    }

    if (input.links.length > 0) {
      await tx.insert(links).values(
        input.links.map((link, index) => ({
          userId,
          cardId: id,
          label: link.label,
          url: link.url,
          source: link.source,
          driveFileId: link.driveFileId,
          kind: link.kind,
          sortOrder: index,
        }))
      );
    }
  });

  return (await getCard(userId, id))!;
}

export async function deleteCard(userId: string, id: string): Promise<void> {
  // fields/links/reminders cascade via FK ON DELETE CASCADE
  await db.delete(cards).where(and(eq(cards.id, id), eq(cards.userId, userId)));
}

export type SearchResult = {
  card: CardWithDetails;
  matchedField?: { key: string; value: string };
  source: "title" | "field";
};

// Simple ILIKE search over title/aliases/tags/notes plus non-secret field
// key/value pairs. This is a placeholder for phase 3 (Postgres FTS +
// trigram + client-side Fuse.js) — good enough for exact/substring matches
// in the meantime. Secret field values are never searched here.
export async function searchCards(userId: string, query: string, limit = 20): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const likeQuery = `%${trimmed}%`;
  const results = new Map<string, SearchResult>();

  const titleRows = await db
    .select()
    .from(cards)
    .where(
      and(
        eq(cards.userId, userId),
        or(ilike(cards.title, likeQuery), ilike(cards.notes, likeQuery))
      )
    )
    .limit(limit);

  for (const card of await attachDetails(userId, titleRows)) {
    results.set(card.id, { card, source: "title" });
  }

  if (results.size < limit) {
    const fieldRows = await db
      .select({ cardId: fields.cardId, key: fields.key, value: fields.value })
      .from(fields)
      .where(
        and(
          eq(fields.userId, userId),
          eq(fields.isSecret, false),
          or(ilike(fields.key, likeQuery), ilike(fields.value, likeQuery))
        )
      )
      .limit(limit);

    for (const row of fieldRows) {
      if (results.has(row.cardId)) continue;
      const card = await getCard(userId, row.cardId);
      if (card) {
        results.set(card.id, {
          card,
          matchedField: { key: row.key, value: row.value },
          source: "field",
        });
      }
    }
  }

  return Array.from(results.values()).slice(0, limit);
}
