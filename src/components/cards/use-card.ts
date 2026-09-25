"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useCards } from "./cards-store";

// Looks a card up in the in-memory store. If it isn't there (e.g. it was
// just created and the fresh list is still in flight), refresh from the
// server once before concluding it doesn't exist, so there's never a false
// "not found" flash right after saving.
export function useCard(id: string) {
  const { byId } = useCards();
  const router = useRouter();
  const card = byId.get(id);
  const [refreshing, startRefresh] = React.useTransition();
  const triedRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (card || triedRef.current === id) return;
    triedRef.current = id;
    startRefresh(() => router.refresh());
  }, [card, id, router]);

  const status = card
    ? "found"
    : refreshing || triedRef.current !== id
      ? "loading"
      : "missing";

  return { card, status } as const;
}
