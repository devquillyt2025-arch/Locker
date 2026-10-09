"use client";

import * as React from "react";
import type { TrashData } from "@/lib/docs-types";

const TrashContext = React.createContext<TrashData | null>(null);

export function useTrash() {
  const ctx = React.useContext(TrashContext);
  if (!ctx) throw new Error("useTrash must be used within TrashProvider");
  return ctx;
}

// Loaded once by the (app) layout with the cards; refreshed when a Server
// Action revalidates the layout (trash / restore / delete forever).
export function TrashProvider({ trash, children }: { trash: TrashData; children: React.ReactNode }) {
  return <TrashContext.Provider value={trash}>{children}</TrashContext.Provider>;
}
