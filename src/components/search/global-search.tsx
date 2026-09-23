"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { CARD_TYPE_META } from "@/lib/card-types";
import { searchAction } from "@/app/actions";
import type { SearchResult } from "@/lib/cards";

export function GlobalSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      const r = await searchAction(query);
      setResults(r);
      setLoading(false);
    }, 150);
    return () => clearTimeout(handle);
  }, [query]);

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  function select(id: string) {
    onOpenChange(false);
    router.push(`/cards/${id}`);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search Locker"
      description="Search your cards by title, alias, tag, or field"
    >
      <CommandInput
        placeholder="Search everything... (e.g. aadhaar, car insurance)"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {!loading && query.trim() && results.length === 0 && (
          <CommandEmpty>No matches for &quot;{query}&quot;.</CommandEmpty>
        )}
        {!query.trim() && (
          <CommandEmpty>Type to search your cards.</CommandEmpty>
        )}
        {results.length > 0 && (
          <CommandGroup heading="Cards">
            {results.map((r) => {
              const meta = CARD_TYPE_META[r.card.type];
              const Icon = meta.icon;
              return (
                <CommandItem
                  key={r.card.id}
                  value={r.card.id}
                  onSelect={() => select(r.card.id)}
                  className="flex items-center gap-2"
                >
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{r.card.title}</p>
                    {r.matchedField && (
                      <p className="truncate text-xs text-muted-foreground">
                        {r.matchedField.key}: {r.matchedField.value}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {meta.label}
                  </span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}

export function useGlobalSearchShortcut(onOpenChange: (open: boolean) => void) {
  React.useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(true);
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onOpenChange]);
}
