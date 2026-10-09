"use client";

import { AppLink as Link } from "@/components/shell/app-link";
import * as React from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { restoreCardAction } from "@/app/trash-actions";
import { Plus } from "lucide-react";
import { CARD_TYPE_META } from "@/lib/card-types";
import { CARD_TYPES, type CardType } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { CardTile } from "@/components/cards/card-tile";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { useCards } from "@/components/cards/cards-store";
import { cn } from "@/lib/utils";

export function CardsView() {
  const params = useSearchParams();
  const type = params.get("type");
  const trashedId = params.get("trashed");

  // Arrived here right after deleting a card (deleteCardAction adds ?trashed=<id>):
  // offer an Undo, then clean the URL so a reload doesn't repeat it.
  React.useEffect(() => {
    if (!trashedId) return;
    window.history.replaceState(null, "", "/cards");
    toast.success("Moved to Trash", {
      duration: 10000,
      action: {
        label: "Undo",
        onClick: async () => {
          try {
            const back = await restoreCardAction(trashedId);
            if (back.ok) toast.success("Card restored");
            else toast.error(back.error);
          } catch {
            toast.error("Couldn't undo. You can restore it from the Trash tab.");
          }
        },
      },
    });
  }, [trashedId]);
  const activeType = CARD_TYPES.find((t) => t === type);
  const { cards: all } = useCards();

  const cards = activeType ? all.filter((c) => c.type === activeType) : all;

  const counts = new Map<CardType, number>();
  for (const c of all) counts.set(c.type, (counts.get(c.type) ?? 0) + 1);
  const usedTypes = CARD_TYPES.filter((t) => counts.has(t));

  const title = activeType ? CARD_TYPE_META[activeType].plural : "All cards";
  const newHref = activeType ? `/cards/new?type=${activeType}` : "/cards/new";

  return (
    // The page fills the pane and never scrolls itself: the header and the
    // category tabs stay put, and only the cards below the divider scroll.
    <PageContainer className="flex h-full flex-col pb-0 lg:pb-0">
      <div className="shrink-0">
        <PageHeader
          className="mb-4"
          title={title}
          description={`${cards.length} ${cards.length === 1 ? "card" : "cards"}`}
          actions={
            <Button asChild size="lg">
              <Link href={newHref}>
                <Plus /> New card
              </Link>
            </Button>
          }
        />

        {/* Categories live here as tabs (they used to be a list in the sidebar). */}
        {usedTypes.length > 1 ? (
          <div role="tablist" aria-label="Categories" className="-mx-1 flex gap-1 overflow-x-auto border-b px-1">
            <CategoryTab href="/cards" active={!activeType} count={all.length}>
              All
            </CategoryTab>
            {usedTypes.map((t) => {
              const meta = CARD_TYPE_META[t];
              const Icon = meta.icon;
              return (
                <CategoryTab key={t} href={`/cards?type=${t}`} active={activeType === t} count={counts.get(t) ?? 0}>
                  <Icon className="size-3.5" />
                  {meta.plural}
                </CategoryTab>
              );
            })}
          </div>
        ) : (
          <div className="border-b" />
        )}
      </div>

      {/* Side padding + negative margin leave room for the card hover lift and shadow, which overflow:auto would otherwise clip. */}
      <div className="-mx-2 min-h-0 flex-1 overflow-y-auto px-2 pb-6 pt-4 lg:pb-8">
        {cards.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed px-6 py-16 text-center">
            <p className="font-serif text-xl">No cards here yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create one and it will show up in this view.
            </p>
            <Button asChild className="mt-5" size="lg">
              <Link href={newHref}>
                <Plus /> New card
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {cards.map((card, i) => (
              <CardTile key={card.id} card={card} index={i} />
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}

function CategoryTab({
  href,
  active,
  count,
  children,
}: {
  href: string;
  active: boolean;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="tab"
      aria-selected={active}
      className={cn(
        "relative flex shrink-0 items-center gap-1.5 px-3 pb-2.5 pt-1 text-sm transition-colors",
        active ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
      <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
      {active && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary" />}
    </Link>
  );
}
