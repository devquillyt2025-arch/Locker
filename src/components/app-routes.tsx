"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { HomeView } from "@/components/views/home-view";
import { CardsView } from "@/components/views/cards-view";
import { NewCardView } from "@/components/views/new-card-view";
import { CardDetailView } from "@/components/views/card-detail-view";
import { EditCardView } from "@/components/views/edit-card-view";
import { RecentsView } from "@/components/views/recents-view";
import { DocumentsView } from "@/components/views/documents-view";
import { StructureView } from "@/components/views/structure-view";
import { TrashView } from "@/components/views/trash-view";
import { ReportsView } from "@/components/views/reports-view";
import { CardNotFound } from "@/components/views/card-not-found";
import { matchAppRoute } from "@/lib/app-routes";

function resolve(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  const route = matchAppRoute(parts);
  if (!route) return <CardNotFound />;

  switch (route.kind) {
    case "home":
      return <HomeView />;
    case "cards":
      return <CardsView />;
    case "new-card":
      return <NewCardView />;
    case "card":
      return <CardDetailView id={route.id} />;
    case "edit-card":
      return <EditCardView id={route.id} />;
    case "recents":
      return <RecentsView />;
    case "documents":
      return <DocumentsView />;
    case "structure":
      return <StructureView />;
    case "reports":
      return <ReportsView />;
    case "trash":
      return <TrashView />;
  }
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
