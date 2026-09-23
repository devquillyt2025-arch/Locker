"use client";

import { Search } from "lucide-react";
import { useAppSearch } from "./app-search-provider";

export function HomeSearchHero() {
  const { open } = useAppSearch();
  const isMac =
    typeof navigator !== "undefined" && navigator.platform.toLowerCase().includes("mac");

  return (
    <button
      onClick={open}
      className="flex w-full items-center gap-3 rounded-xl border bg-card px-5 py-4 text-left text-muted-foreground shadow-sm transition-colors hover:bg-accent/50"
    >
      <Search className="size-5 shrink-0" />
      <span className="flex-1">Search anything — &quot;aadhaar&quot;, &quot;car insurance renewal&quot;...</span>
      <kbd className="hidden shrink-0 rounded border bg-muted px-1.5 py-0.5 font-mono text-xs sm:inline">
        {isMac ? "⌘" : "Ctrl"}K
      </kbd>
    </button>
  );
}
