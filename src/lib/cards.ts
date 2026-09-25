import { and, desc, eq } from "drizzle-orm";
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
      .where(type ? and(eq(cards.userId, userId), eq(cards.type, type)) : eq(cards.userId, userId))
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
    .where(and(eq(cards.id, id), eq(cards.userId, userId)))
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
