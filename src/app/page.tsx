import Link from "next/link";
import { Plus } from "lucide-react";
import { listEntries } from "@/lib/entries";
import { ENTRY_TYPE_META } from "@/lib/entry-types";
import { ENTRY_TYPES } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { HomeSearchHero } from "@/components/search/home-search-hero";
import { ThemeToggle } from "@/components/theme-toggle";

// Reads live from SQLite on every request — this is a single-user local
// app, so there's no CDN/ISR benefit to statically baking in DB reads.
export const dynamic = "force-dynamic";

export default function Home() {
  const recent = listEntries().slice(0, 6);

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-10">
      <div className="mb-10 flex items-center justify-between">
        <span className="text-sm font-medium tracking-tight text-muted-foreground">
          LifeDesk
        </span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/entries">All entries</Link>
          </Button>
          <ThemeToggle />
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-8">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            Where&apos;s that thing?
          </h1>
          <p className="mt-2 text-muted-foreground">
            Your accounts, documents, and dates — one search away.
          </p>
        </div>

        <HomeSearchHero />

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {ENTRY_TYPES.map((t) => {
            const meta = ENTRY_TYPE_META[t];
            const Icon = meta.icon;
            return (
              <Link
                key={t}
                href={`/entries/new`}
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
            <Link href="/entries/new">
              <Plus className="size-4" /> New entry
            </Link>
          </Button>
        </div>
        {recent.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nothing yet. Add your first entry to get started.
          </p>
        ) : (
          <div className="divide-y rounded-lg border">
            {recent.map((entry) => {
              const meta = ENTRY_TYPE_META[entry.type];
              const Icon = meta.icon;
              return (
                <Link
                  key={entry.id}
                  href={`/entries/${entry.id}`}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50"
                >
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate text-sm">{entry.title}</span>
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
