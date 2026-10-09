import { and, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
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
  // All three tables carry user_id, so the cards, fields and links can be
  // fetched in parallel — one round trip instead of two in sequence.
  const [rows, allFields, allLinks] = await Promise.all([
    db
      .select()
      .from(cards)
      .where(
        and(
          eq(cards.userId, userId),
          isNull(cards.deletedAt), // cards in the Trash never show up in normal lists
          type ? eq(cards.type, type) : undefined
        )
      )
      .orderBy(desc(cards.updatedAt)),
    db.select().from(fields).where(eq(fields.userId, userId)).orderBy(fields.sortOrder),
    db.select().from(links).where(eq(links.userId, userId)).orderBy(links.sortOrder),
  ]);

  const fieldsByCard = groupBy(allFields, (f) => f.cardId);
  const linksByCard = groupBy(allLinks, (l) => l.cardId);
  return rows.map((card) => ({
    ...card,
    fields: fieldsByCard.get(card.id) ?? [],
    links: linksByCard.get(card.id) ?? [],
  }));
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  }
  return map;
}

export async function getCard(userId: string, id: string): Promise<CardWithDetails | undefined> {
  const card = await db
    .select()
    .from(cards)
    .where(and(eq(cards.id, id), eq(cards.userId, userId), isNull(cards.deletedAt)))
    .then((rows) => rows[0]);
  if (!card) return undefined;

  const [cardFields, cardLinks] = await Promise.all([
    db.select().from(fields).where(and(eq(fields.cardId, id), eq(fields.userId, userId))).orderBy(fields.sortOrder),
    db.select().from(links).where(and(eq(links.cardId, id), eq(links.userId, userId))).orderBy(links.sortOrder),
  ]);

  return { ...card, fields: cardFields, links: cardLinks };
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
    const updated = await tx
      .update(cards)
      .set({
        type: input.type,
        title: input.title,
        aliases: input.aliases,
        tags: input.tags,
        notes: input.notes,
        updatedAt: new Date(),
      })
      .where(and(eq(cards.id, id), eq(cards.userId, userId), isNull(cards.deletedAt)))
      .returning({ id: cards.id });
    // Not found, or in the Trash: never edit (or wipe the fields/links of) it.
    if (updated.length === 0) throw new Error("Card not found");

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

// ---------------------------------------------------------------- Trash (cards)
//
// "Deleting" a card only stamps `deleted_at`: its fields and links stay in
// place, so restoring brings back exactly what was there. Only purgeCard /
// emptyCardTrash really delete rows (fields/links/reminders cascade via FK).

export type TrashedCard = {
  id: string;
  title: string;
  type: CardType;
  deletedAt: Date;
  fieldCount: number;
  linkCount: number;
};

export async function trashCard(userId: string, id: string): Promise<boolean> {
  const done = await db
    .update(cards)
    .set({ deletedAt: new Date() })
    .where(and(eq(cards.id, id), eq(cards.userId, userId), isNull(cards.deletedAt)))
    .returning({ id: cards.id });
  return done.length > 0;
}

export async function restoreCard(userId: string, id: string): Promise<boolean> {
  const done = await db
    .update(cards)
    .set({ deletedAt: null })
    .where(and(eq(cards.id, id), eq(cards.userId, userId), isNotNull(cards.deletedAt)))
    .returning({ id: cards.id });
  return done.length > 0;
}

/** Permanently deletes ONE card, and only if it is already in the Trash. */
export async function purgeCard(userId: string, id: string): Promise<boolean> {
  const done = await db
    .delete(cards)
    .where(and(eq(cards.id, id), eq(cards.userId, userId), isNotNull(cards.deletedAt)))
    .returning({ id: cards.id });
  return done.length > 0;
}

/** Permanently deletes every card in the Trash. Returns how many. */
export async function emptyCardTrash(userId: string): Promise<number> {
  const done = await db
    .delete(cards)
    .where(and(eq(cards.userId, userId), isNotNull(cards.deletedAt)))
    .returning({ id: cards.id });
  return done.length;
}

export async function listTrashedCards(userId: string): Promise<TrashedCard[]> {
  const [rows, allFields, allLinks] = await Promise.all([
    db
      .select({ id: cards.id, title: cards.title, type: cards.type, deletedAt: cards.deletedAt })
      .from(cards)
      .where(and(eq(cards.userId, userId), isNotNull(cards.deletedAt)))
      .orderBy(desc(cards.deletedAt)),
    db.select({ cardId: fields.cardId }).from(fields).where(eq(fields.userId, userId)),
    db.select({ cardId: links.cardId }).from(links).where(eq(links.userId, userId)),
  ]);
  const count = (items: { cardId: string }[]) => {
    const m = new Map<string, number>();
    for (const i of items) m.set(i.cardId, (m.get(i.cardId) ?? 0) + 1);
    return m;
  };
  const fieldCounts = count(allFields);
  const linkCounts = count(allLinks);
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    type: r.type,
    deletedAt: r.deletedAt!,
    fieldCount: fieldCounts.get(r.id) ?? 0,
    linkCount: linkCounts.get(r.id) ?? 0,
  }));
}

/** Titles of ALL cards, trashed or not (so imports never resurrect a trashed card). */
export async function listAllCardTitles(userId: string): Promise<string[]> {
  const rows = await db.select({ title: cards.title }).from(cards).where(eq(cards.userId, userId));
  return rows.map((r) => r.title);
}

// Appends one link to an existing card without touching anything else on it
// (used when a file is uploaded to Drive). Sort order goes after the last link.
export async function addLinkToCard(
  userId: string,
  cardId: string,
  link: LinkInput,
  opts: { allowTrashed?: boolean } = {}
): Promise<void> {
  await db.transaction(async (tx) => {
    const owned = await tx
      .select({ id: cards.id })
      .from(cards)
      .where(and(eq(cards.id, cardId), eq(cards.userId, userId), opts.allowTrashed ? undefined : isNull(cards.deletedAt)));
    if (owned.length === 0) throw new Error("Card not found");

    const [{ max }] = await tx
      .select({ max: sql<number>`coalesce(max(${links.sortOrder}), -1)` })
      .from(links)
      .where(and(eq(links.cardId, cardId), eq(links.userId, userId)));

    await tx.insert(links).values({
      userId,
      cardId,
      label: link.label,
      url: link.url,
      source: link.source,
      driveFileId: link.driveFileId,
      kind: link.kind,
      sortOrder: Number(max) + 1,
    });
    await tx.update(cards).set({ updatedAt: new Date() }).where(and(eq(cards.id, cardId), eq(cards.userId, userId)));
  });
}

// Every link of this user's cards that points at one local file.
export async function linksForLocalUrl(userId: string, url: string) {
  return db
    .select({ id: links.id, cardId: links.cardId, label: links.label, kind: links.kind, driveFileId: links.driveFileId })
    .from(links)
    .innerJoin(cards, eq(cards.id, links.cardId))
    .where(and(eq(links.userId, userId), eq(links.url, url), isNull(cards.deletedAt)));
}

// Removes this user's links to one Drive file (used when that file was deleted on
// Drive and is about to be uploaded again, so cards don't keep a dead link).
export async function removeDriveLinks(userId: string, driveFileId: string): Promise<number> {
  const gone = await db
    .delete(links)
    .where(and(eq(links.userId, userId), eq(links.driveFileId, driveFileId)))
    .returning({ id: links.id });
  return gone.length;
}

// Card ids that already carry a Drive link with this file id.
export async function cardIdsWithDriveFile(userId: string, driveFileId: string): Promise<Set<string>> {
  const rows = await db
    .select({ cardId: links.cardId })
    .from(links)
    .where(and(eq(links.userId, userId), eq(links.driveFileId, driveFileId)));
  return new Set(rows.map((r) => r.cardId));
}

// ---------------------------------------------------- links, for the file Trash

export type LinkRow = typeof links.$inferSelect;

/** Every link (on live AND trashed cards) that points at one local file URL. */
export async function linkRowsByUrl(userId: string, url: string): Promise<LinkRow[]> {
  return db.select().from(links).where(and(eq(links.userId, userId), eq(links.url, url)));
}

export async function deleteLinkRows(userId: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  // One statement, so the links are all detached or none are (trashDoc relies on this to undo cleanly).
  await db.delete(links).where(and(inArray(links.id, ids), eq(links.userId, userId)));
}

/** True if this card (live or trashed) still exists, and whether it already has this URL. */
export async function cardLinkState(userId: string, cardId: string, url: string) {
  const [card] = await db
    .select({ id: cards.id })
    .from(cards)
    .where(and(eq(cards.id, cardId), eq(cards.userId, userId)));
  if (!card) return { exists: false, hasUrl: false };
  const [dup] = await db
    .select({ id: links.id })
    .from(links)
    .where(and(eq(links.cardId, cardId), eq(links.userId, userId), eq(links.url, url)));
  return { exists: true, hasUrl: Boolean(dup) };
}
