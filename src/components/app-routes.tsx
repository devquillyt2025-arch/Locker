"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { HomeView } from "@/components/views/home-view";
import { CardsView } from "@/components/views/cards-view";
import { NewCardView } from "@/components/views/new-card-view";
import { CardDetailView } from "@/components/views/card-detail-view";
import { EditCardView } from "@/components/views/edit-card-view";
import { CardNotFound } from "@/components/views/card-not-found";

function resolve(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);

  if (parts.length === 0) return <HomeView />;
  if (parts[0] === "cards") {
    if (parts.length === 1) return <CardsView />;
    if (parts.length === 2 && parts[1] === "new") return <NewCardView />;
    if (parts.length === 2) return <CardDetailView id={parts[1]} />;
    if (parts.length === 3 && parts[2] === "edit") return <EditCardView id={parts[1]} />;
  }
  return <CardNotFound />;
}

// Client-side router for everything inside the app shell. The URL is the
// source of truth (so deep links, reloads and back/forward all work), and
// changing it just swaps the view — no server round trip.
export function AppRoutes() {
  const pathname = usePathname();
  const search = useSearchParams().toString();

  // Keyed by URL so every navigation remounts the view: the entrance
  // animation replays and form state can never leak between cards.
  return (
    <div key={`${pathname}?${search}`} className="contents">
      {resolve(pathname)}
    </div>
  );
}
