"use client";

import { AppLink as Link } from "@/components/shell/app-link";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { CARD_TYPE_META } from "@/lib/card-types";
import { CARD_TYPES, type CardType } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { CardTile } from "@/components/cards/card-tile";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { useCards } from "@/components/cards/cards-store";
import { cn } from "@/lib/utils";

export function CardsView() {
  const type = useSearchParams().get("type");
  const activeType = CARD_TYPES.find((t) => t === type);
  const { cards: all } = useCards();

  const cards = activeType ? all.filter((c) => c.type === activeType) : all;

  const counts = new Map<CardType, number>();
  for (const c of all) counts.set(c.type, (counts.get(c.type) ?? 0) + 1);
  const usedTypes = CARD_TYPES.filter((t) => counts.has(t));

  const title = activeType ? CARD_TYPE_META[activeType].plural : "All cards";
  const newHref = activeType ? `/cards/new?type=${activeType}` : "/cards/new";

  return (
    <PageContainer>
      <PageHeader
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

      {usedTypes.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <FilterChip href="/cards" active={!activeType}>
            All <span className="text-muted-foreground">{all.length}</span>
          </FilterChip>
          {usedTypes.map((t) => {
            const meta = CARD_TYPE_META[t];
            const Icon = meta.icon;
            return (
              <FilterChip key={t} href={`/cards?type=${t}`} active={activeType === t}>
                <Icon className="size-3.5" />
                {meta.plural}
                <span className="text-muted-foreground">{counts.get(t)}</span>
              </FilterChip>
            );
          })}
        </div>
      )}

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
    </PageContainer>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors",
        active
          ? "border-primary/40 bg-primary/10 font-medium text-foreground"
          : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {children}
    </Link>
  );
}
