"use client";

import * as React from "react";
import type { DocsContextValue } from "@/lib/docs-types";

const DocsContext = React.createContext<DocsContextValue | null>(null);

export function useDocs() {
  const ctx = React.useContext(DocsContext);
  if (!ctx) throw new Error("useDocs must be used within DocsProvider");
  return ctx;
}

// Loaded once by the (app) layout next to the cards, so the Documents page
// opens instantly like every other page. Also carries the Google Drive
// connection status and which files are already on Drive.
export function DocsProvider({ docs, children }: { docs: DocsContextValue; children: React.ReactNode }) {
  return <DocsContext.Provider value={docs}>{children}</DocsContext.Provider>;
}
