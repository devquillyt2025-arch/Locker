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
import { ENTRY_TYPE_META } from "@/lib/entry-types";
import { searchAction } from "@/app/actions";
import type { SearchResult } from "@/lib/entries";

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
    router.push(`/entries/${id}`);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search LifeDesk"
      description="Search your entries by title, tag, or field"
    >
      <CommandInput
        placeholder="Search everything... (e.g. SBI account number)"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {!loading && query.trim() && results.length === 0 && (
          <CommandEmpty>No matches for &quot;{query}&quot;.</CommandEmpty>
        )}
        {!query.trim() && (
          <CommandEmpty>Type to search your entries.</CommandEmpty>
        )}
        {results.length > 0 && (
          <CommandGroup heading="Entries">
            {results.map((r) => {
              const meta = ENTRY_TYPE_META[r.entry.type];
              const Icon = meta.icon;
              return (
                <CommandItem
                  key={r.entry.id}
                  value={r.entry.id}
                  onSelect={() => select(r.entry.id)}
                  className="flex items-center gap-2"
                >
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{r.entry.title}</p>
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
