import Link from "next/link";
import { Plus, LogOut } from "lucide-react";
import { listCards } from "@/lib/cards";
import { CARD_TYPE_META } from "@/lib/card-types";
import { CARD_TYPES } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { signOutAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { HomeSearchHero } from "@/components/search/home-search-hero";
import { ThemeToggle } from "@/components/theme-toggle";

// Reads live from Postgres on every request — this is a single-user app,
// so there's no CDN/ISR benefit to statically baking in DB reads.
export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireUser();
  const recent = (await listCards(user.id)).slice(0, 6);

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-10">
      <div className="mb-10 flex items-center justify-between">
        <span className="text-sm font-medium tracking-tight text-muted-foreground">
          Locker
        </span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/cards">All cards</Link>
          </Button>
          <ThemeToggle />
          <form action={signOutAction}>
            <Button variant="ghost" size="sm" type="submit" title="Sign out">
              <LogOut className="size-4" />
            </Button>
          </form>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-8">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            Where&apos;s that thing?
          </h1>
          <p className="mt-2 text-muted-foreground">
            Your documents, accounts, and details — one search away.
          </p>
        </div>

        <HomeSearchHero />

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {CARD_TYPES.map((t) => {
            const meta = CARD_TYPE_META[t];
            const Icon = meta.icon;
            return (
              <Link
                key={t}
                href={`/cards/new`}
                className="flex flex-col items-center gap-1.5 rounded-lg border bg-card px-2 py-3 text-center text-xs transition-colors hover:bg-accent/50"
              >
                <Icon className="size-4" />
                {meta.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">
            Recently updated
          </h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/cards/new">
              <Plus className="size-4" /> New card
            </Link>
          </Button>
        </div>
        {recent.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nothing yet. Add your first card to get started.
          </p>
        ) : (
          <div className="divide-y rounded-lg border">
            {recent.map((card) => {
              const meta = CARD_TYPE_META[card.type];
              const Icon = meta.icon;
              return (
                <Link
                  key={card.id}
                  href={`/cards/${card.id}`}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50"
                >
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate text-sm">{card.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {meta.label}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
