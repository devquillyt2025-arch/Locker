"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createEntry,
  deleteEntry,
  searchEntries,
  updateEntry,
  type SearchResult,
} from "@/lib/entries";
import { entryInputSchema } from "@/lib/validation";

export type ActionState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

function parseFormEntry(formData: FormData) {
  const raw = {
    type: formData.get("type"),
    title: formData.get("title"),
    body: formData.get("body") ?? "",
    tags: JSON.parse((formData.get("tags") as string) || "[]"),
    fields: JSON.parse((formData.get("fields") as string) || "[]"),
  };
  return entryInputSchema.safeParse(raw);
}

export async function createEntryAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseFormEntry(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const entry = createEntry(parsed.data);
  revalidatePath("/entries");
  redirect(`/entries/${entry.id}`);
}

export async function updateEntryAction(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseFormEntry(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  updateEntry(id, parsed.data);
  revalidatePath("/entries");
  revalidatePath(`/entries/${id}`);
  redirect(`/entries/${id}`);
}

export async function deleteEntryAction(id: string): Promise<void> {
  deleteEntry(id);
  revalidatePath("/entries");
  redirect("/entries");
}

export async function searchAction(query: string): Promise<SearchResult[]> {
  return searchEntries(query);
}
