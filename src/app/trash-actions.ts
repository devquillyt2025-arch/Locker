"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { emptyCardTrash, purgeCard, restoreCard, trashCard } from "@/lib/cards";
import { emptyDocTrash, purgeDoc, restoreDoc, trashDoc } from "@/lib/docs-trash";

// Everything here is reversible except the three "purge"/"empty" actions,
// which are the only ones that really delete data — and they only ever touch
// items that are ALREADY in the Trash.

export type TrashActionResult = { ok: true; message?: string; id?: string } | { ok: false; error: string };

const done = (message?: string, id?: string): TrashActionResult => {
  revalidatePath("/", "layout");
  return { ok: true, message, id };
};

// ---- cards
export async function trashCardAction(cardId: string): Promise<TrashActionResult> {
  const user = await requireUser();
  return (await trashCard(user.id, cardId)) ? done(undefined, cardId) : { ok: false, error: "That card doesn't exist." };
}

export async function restoreCardAction(cardId: string): Promise<TrashActionResult> {
  const user = await requireUser();
  return (await restoreCard(user.id, cardId)) ? done("Card restored") : { ok: false, error: "That card isn't in the Trash." };
}

export async function purgeCardAction(cardId: string): Promise<TrashActionResult> {
  const user = await requireUser();
  return (await purgeCard(user.id, cardId))
    ? done("Card deleted forever")
    : { ok: false, error: "That card isn't in the Trash." };
}

// ---- document files
export async function trashDocAction(relPath: string): Promise<TrashActionResult> {
  const user = await requireUser();
  const result = await trashDoc(user.id, relPath);
  return result.ok ? done("Moved to Trash", result.doc.id) : { ok: false, error: result.error };
}

export async function restoreDocAction(trashId: string): Promise<TrashActionResult> {
  const user = await requireUser();
  const result = await restoreDoc(user.id, trashId);
  if (!result.ok) return { ok: false, error: result.error };
  const where = result.renamed ? ` as “${result.restoredTo.split("/").pop()}” (the original name was taken)` : "";
  const links = result.linksRestored > 0 ? ` and re-attached to ${result.linksRestored} card${result.linksRestored === 1 ? "" : "s"}` : "";
  return done(`File restored${where}${links}`);
}

export async function purgeDocAction(trashId: string): Promise<TrashActionResult> {
  await requireUser();
  const result = await purgeDoc(trashId);
  return result.ok ? done("File deleted forever") : { ok: false, error: result.error ?? "That item isn't in the Trash." };
}

// ---- everything
export async function emptyTrashAction(): Promise<TrashActionResult> {
  const user = await requireUser();
  const [cards, docs] = await Promise.all([emptyCardTrash(user.id), emptyDocTrash()]);
  return done(`Trash emptied — ${cards} card${cards === 1 ? "" : "s"} and ${docs} file${docs === 1 ? "" : "s"} deleted forever`);
}
