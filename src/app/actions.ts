"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createCard,
  deleteCard,
  searchCards,
  updateCard,
  type SearchResult,
} from "@/lib/cards";
import { cardInputSchema } from "@/lib/validation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type ActionState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

function parseFormCard(formData: FormData) {
  const raw = {
    type: formData.get("type"),
    title: formData.get("title"),
    aliases: JSON.parse((formData.get("aliases") as string) || "[]"),
    tags: JSON.parse((formData.get("tags") as string) || "[]"),
    notes: formData.get("notes") ?? "",
    fields: JSON.parse((formData.get("fields") as string) || "[]"),
    links: JSON.parse((formData.get("links") as string) || "[]"),
  };
  return cardInputSchema.safeParse(raw);
}

export async function createCardAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parseFormCard(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const card = await createCard(user.id, parsed.data);
  revalidatePath("/cards");
  redirect(`/cards/${card.id}`);
}

export async function updateCardAction(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parseFormCard(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await updateCard(user.id, id, parsed.data);
  revalidatePath("/cards");
  revalidatePath(`/cards/${id}`);
  redirect(`/cards/${id}`);
}

export async function deleteCardAction(id: string): Promise<void> {
  const user = await requireUser();
  await deleteCard(user.id, id);
  revalidatePath("/cards");
  redirect("/cards");
}

export async function searchAction(query: string): Promise<SearchResult[]> {
  const user = await requireUser();
  return searchCards(user.id, query);
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
