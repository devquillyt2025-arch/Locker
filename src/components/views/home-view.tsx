"use client";

import { AppLink as Link } from "@/components/shell/app-link";
import { ArrowRight, FileStack, Layers, Link2, Plus } from "lucide-react";
import { CARD_TYPE_META } from "@/lib/card-types";
import { CARD_TYPES } from "@/db/schema";
import { HomeSearchHero } from "@/components/search/home-search-hero";
import { CardTile } from "@/components/cards/card-tile";
import { PageContainer } from "@/components/shell/page-header";
import { useCards } from "@/components/cards/cards-store";
import { cn } from "@/lib/utils";

export function HomeView() {
  const { cards } = useCards();
  const recent = cards.slice(0, 8);

  const linkCount = cards.reduce((n, c) => n + c.links.length, 0);
  const categoryCount = new Set(cards.map((c) => c.type)).size;

  const stats = [
    { label: "Cards", value: cards.length, icon: FileStack },
    { label: "Linked files", value: linkCount, icon: Link2 },
    { label: "Categories", value: categoryCount, icon: Layers },
  ];

  return (
    <PageContainer className="space-y-12">
      {/* Hero */}
      <section className="mx-auto flex max-w-3xl flex-col items-center pt-6 text-center sm:pt-12">
        <h1 className="font-serif text-4xl font-medium tracking-tight sm:text-5xl">
          Where&apos;s that thing?
        </h1>
        <p className="mt-3 text-muted-foreground">
          Your documents, accounts and details — one search away.
        </p>
        <div className="mt-8 w-full">
          <HomeSearchHero />
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {stats.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="flex items-center gap-2 rounded-full border bg-card px-3.5 py-1.5 text-sm"
            >
              <Icon className="size-3.5 text-muted-foreground" />
              <span className="font-medium tabular-nums">{value}</span>
              <span className="text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Quick add */}
      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Quick add</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9">
          {CARD_TYPES.map((t) => {
            const meta = CARD_TYPE_META[t];
            const Icon = meta.icon;
            return (
              <Link
                key={t}
                href={`/cards/new?type=${t}`}
                className="group flex flex-col items-start gap-3 rounded-2xl border bg-card p-3.5 shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
              >
                <span className={cn("flex size-9 items-center justify-center rounded-xl", meta.tone)}>
                  <Icon className="size-[18px]" />
                </span>
                <span className="text-sm font-medium leading-tight">{meta.label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Recents */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Recently updated</h2>
          {cards.length > recent.length && (
            <Link
              href="/cards"
              className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              View all <ArrowRight className="size-3.5" />
            </Link>
          )}
        </div>
        {recent.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed px-6 py-14 text-center">
            <p className="font-serif text-xl">Nothing here yet</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Add your first card — an ID, an account, a policy — and link the real file from
              Drive.
            </p>
            <Link
              href="/cards/new"
              className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/85"
            >
              <Plus className="size-4" /> New card
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {recent.map((card, i) => (
              <CardTile key={card.id} card={card} index={i} />
            ))}
          </div>
        )}
      </section>
    </PageContainer>
  );
}
