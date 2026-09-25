"use client";

import * as React from "react";
import { LayoutGrid, Plus } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { CARD_TYPE_META } from "@/lib/card-types";
import { searchCards } from "@/lib/search";
import { cn } from "@/lib/utils";
import { navigate } from "@/components/shell/app-link";
import { useCards } from "@/components/cards/cards-store";

export function GlobalSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { cards } = useCards();
  const [query, setQuery] = React.useState("");

  // Instant: filters the cards already in memory, no server round trip.
  const deferredQuery = React.useDeferredValue(query);
  const results = React.useMemo(() => searchCards(cards, deferredQuery), [cards, deferredQuery]);

  React.useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  function go(href: string) {
    onOpenChange(false);
    navigate(href);
  }

  const hasQuery = query.trim().length > 0;
  const recent = React.useMemo(() => cards.slice(0, 5), [cards]);

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search Locker"
      description="Search your cards by title, alias, tag, or field"
      // Ranking is ours (see lib/search.ts); cmdk's own fuzzy filter would
      // hide every result because item values are card ids.
      shouldFilter={false}
    >
      <CommandInput
        placeholder="Search everything... (e.g. aadhaar, car insurance)"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {hasQuery && results.length === 0 && (
          <CommandEmpty>No matches for &quot;{query}&quot;.</CommandEmpty>
        )}

        {!hasQuery && (
          <>
            <CommandGroup heading="Quick actions">
              <CommandItem value="new-card" onSelect={() => go("/cards/new")}>
                <Plus className="size-4 text-muted-foreground" /> New card
              </CommandItem>
              <CommandItem value="all-cards" onSelect={() => go("/cards")}>
                <LayoutGrid className="size-4 text-muted-foreground" /> Browse all cards
              </CommandItem>
            </CommandGroup>
            {recent.length > 0 && (
              <CommandGroup heading="Recent">
                {recent.map((card) => (
                  <ResultItem
                    key={card.id}
                    card={card}
                    onSelect={() => go(`/cards/${card.id}`)}
                  />
                ))}
              </CommandGroup>
            )}
          </>
        )}

        {hasQuery && results.length > 0 && (
          <CommandGroup heading="Cards">
            {results.map((r) => (
              <ResultItem
                key={r.card.id}
                card={r.card}
                hint={r.matchedField && `${r.matchedField.key}: ${r.matchedField.value}`}
                onSelect={() => go(`/cards/${r.card.id}`)}
              />
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}

function ResultItem({
  card,
  hint,
  onSelect,
}: {
  card: { id: string; title: string; type: keyof typeof CARD_TYPE_META };
  hint?: string;
  onSelect: () => void;
}) {
  const meta = CARD_TYPE_META[card.type];
  const Icon = meta.icon;
  return (
    <CommandItem value={card.id} onSelect={onSelect} className="flex items-center gap-2">
      <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg", meta.tone)}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate">{card.title}</p>
        {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">{meta.label}</span>
    </CommandItem>
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
