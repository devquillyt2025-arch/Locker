"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { CardType } from "@/db/schema";
import type { CardWithDetails } from "@/lib/cards";

type CardsContextValue = {
  cards: CardWithDetails[];
  byId: Map<string, CardWithDetails>;
  counts: Partial<Record<CardType, number>>;
};

const CardsContext = React.createContext<CardsContextValue | null>(null);

export function useCards() {
  const ctx = React.useContext(CardsContext);
  if (!ctx) throw new Error("useCards must be used within CardsProvider");
  return ctx;
}

// How long a tab can sit in the background before returning to it triggers
// a quiet refresh (covers edits made from another tab or device).
const STALE_AFTER_MS = 60_000;

// The whole vault is loaded once by the (app) layout and lives here, so
// moving between pages, filtering and searching are instant in-memory
// operations. The server is only involved when something is saved or
// deleted: those Server Actions revalidate the layout, which hands this
// provider a fresh `cards` prop.
export function CardsProvider({
  cards,
  children,
}: {
  cards: CardWithDetails[];
  children: React.ReactNode;
}) {
  const router = useRouter();

  const value = React.useMemo<CardsContextValue>(() => {
    const byId = new Map<string, CardWithDetails>();
    const counts: Partial<Record<CardType, number>> = {};
    for (const card of cards) {
      byId.set(card.id, card);
      counts[card.type] = (counts[card.type] ?? 0) + 1;
    }
    return { cards, byId, counts };
  }, [cards]);

  React.useEffect(() => {
    let hiddenAt: number | null = null;
    function onVisibility() {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
      } else if (hiddenAt !== null && Date.now() - hiddenAt > STALE_AFTER_MS) {
        hiddenAt = null;
        router.refresh();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [router]);

  return <CardsContext.Provider value={value}>{children}</CardsContext.Provider>;
}
