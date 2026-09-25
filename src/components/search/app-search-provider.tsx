"use client";

import * as React from "react";
import { useGlobalSearchShortcut } from "./global-search";

type SearchContextValue = {
  open: () => void;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
};

const SearchContext = React.createContext<SearchContextValue | null>(null);

export function useAppSearch() {
  const ctx = React.useContext(SearchContext);
  if (!ctx) throw new Error("useAppSearch must be used within AppSearchProvider");
  return ctx;
}

// Holds only the open/closed state (and the Ctrl/⌘K shortcut). The palette
// itself is rendered by AppShell, inside the cards store, because it
// searches the cards already loaded on the client.
export function AppSearchProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setOpen] = React.useState(false);
  useGlobalSearchShortcut(setOpen);

  const value = React.useMemo(
    () => ({ open: () => setOpen(true), isOpen, setOpen }),
    [isOpen]
  );

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}
