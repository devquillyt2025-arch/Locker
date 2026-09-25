"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createCard, deleteCard, updateCard } from "@/lib/cards";
import { cardInputSchema } from "@/lib/validation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type ActionState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

const SAVE_FAILED =
  "Couldn't save right now. Your changes are still in the form — please try again.";

function parseFormCard(formData: FormData) {
  try {
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
  } catch {
    return null; // malformed JSON in a hidden input
  }
}

export async function createCardAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parseFormCard(formData);
  if (!parsed) return { ok: false, error: "Something was wrong with the form. Please try again." };
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  let id: string;
  try {
    id = (await createCard(user.id, parsed.data)).id;
  } catch (err) {
    console.error("createCardAction failed", err);
    return { ok: false, error: SAVE_FAILED };
  }

  // The whole vault is cached on the client from the (app) layout, so
  // revalidating it pushes the new card to every view (and the sidebar).
  // redirect() throws, so it stays outside the try/catch.
  revalidatePath("/", "layout");
  redirect(`/cards/${id}`);
}

export async function updateCardAction(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parseFormCard(formData);
  if (!parsed) return { ok: false, error: "Something was wrong with the form. Please try again." };
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await updateCard(user.id, id, parsed.data);
  } catch (err) {
    console.error("updateCardAction failed", err);
    return { ok: false, error: SAVE_FAILED };
  }

  revalidatePath("/", "layout");
  redirect(`/cards/${id}`);
}

export async function deleteCardAction(id: string): Promise<void> {
  const user = await requireUser();
  await deleteCard(user.id, id);
  revalidatePath("/", "layout");
  redirect("/cards");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
