"use client";

import * as React from "react";
import { GlobalSearch, useGlobalSearchShortcut } from "./global-search";

const SearchContext = React.createContext<{ open: () => void } | null>(null);

export function useAppSearch() {
  const ctx = React.useContext(SearchContext);
  if (!ctx) throw new Error("useAppSearch must be used within AppSearchProvider");
  return ctx;
}

export function AppSearchProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  useGlobalSearchShortcut(setOpen);

  return (
    <SearchContext.Provider value={{ open: () => setOpen(true) }}>
      {children}
      <GlobalSearch open={open} onOpenChange={setOpen} />
    </SearchContext.Provider>
  );
}
