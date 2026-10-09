"use client";

import * as React from "react";
import { format, formatDistanceToNow } from "date-fns";
import { File as FileIcon, FileImage, FileSpreadsheet, FileText, History, Search, X } from "lucide-react";
import { AppLink } from "@/components/shell/app-link";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { useCards } from "@/components/cards/cards-store";
import { useDocs } from "@/components/docs/docs-store";
import { CARD_TYPE_META } from "@/lib/card-types";
import {
  DEFAULT_QUERY,
  KIND_LABEL,
  RANGE_LABEL,
  SORT_LABEL,
  buildHistory,
  dayBucket,
  groupOptions,
  isFiltered,
  queryHistory,
  type HistoryItem,
  type HistoryQuery,
  type RangeFilter,
  type ShowFilter,
  type SortMode,
} from "@/lib/history";
import { useMounted } from "@/lib/use-mounted";
import { cn } from "@/lib/utils";

const SHOW_TABS: { id: ShowFilter; label: string }[] = [
  { id: "all", label: "Everything" },
  { id: "added", label: "Cards added" },
  { id: "edited", label: "Cards edited" },
  { id: "file", label: "Files" },
];

const SELECT_CLASS =
  "h-9 min-w-0 rounded-lg border bg-card px-2.5 text-sm outline-none transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40";

export function RecentsView() {
  const mounted = useMounted();
  return (
    // Fills the pane and never scrolls itself: the search and filters stay put,
    // and only the history list below scrolls.
    <PageContainer className="flex h-full flex-col pb-0 lg:pb-0">
      {mounted ? (
        <Loaded />
      ) : (
        <PageHeader title="Recents" description="Everything you've added or changed, newest first." />
      )}
    </PageContainer>
  );
}

// Drawn in the browser only: "5 minutes ago" and the Today/Yesterday headings
// depend on the clock and the viewer's time zone, so a server render would
// disagree with the client.
function Loaded() {
  const { cards } = useCards();
  const docs = useDocs();
  const now = React.useMemo(() => Date.now(), []);
  const [query, setQuery] = React.useState<HistoryQuery>(DEFAULT_QUERY);
  const set = (patch: Partial<HistoryQuery>) => setQuery((q) => ({ ...q, ...patch }));

  const items = React.useMemo(() => buildHistory(cards, docs), [cards, docs]);
  const options = React.useMemo(() => groupOptions(items), [items]);
  const { rows, counts } = React.useMemo(() => queryHistory(items, query, now), [items, query, now]);

  const byDate = query.sort === "newest" || query.sort === "oldest";
  const filtered = isFiltered(query);

  return (
    <>
      <div className="shrink-0">
        <PageHeader
          className="mb-4"
          title="Recents"
          description={
            items.length === 0
              ? "Everything you've added or changed will appear here."
              : `${filtered ? `${rows.length} of ${items.length}` : items.length} ${items.length === 1 ? "change" : "changes"} — every card added or edited and every file changed, newest first by default.`
          }
        />

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 basis-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query.q}
              onChange={(e) => set({ q: e.target.value })}
              onKeyDown={(e) => e.key === "Escape" && set({ q: "" })}
              placeholder="Search by name, category or folder"
              aria-label="Search history"
              className="h-9 w-full rounded-lg border bg-card pl-9 pr-9 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
            />
            {query.q && (
              <button
                type="button"
                onClick={() => set({ q: "" })}
                title="Clear search"
                className="absolute right-1.5 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <select
            aria-label="Filter by category or section"
            value={query.group}
            onChange={(e) => set({ group: e.target.value })}
            className={cn(SELECT_CLASS, "max-w-[11rem]")}
          >
            <option value="">All categories</option>
            {options.cards.length > 0 && (
              <optgroup label="Cards">
                {options.cards.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label} ({o.count})
                  </option>
                ))}
              </optgroup>
            )}
            {options.files.length > 0 && (
              <optgroup label="Files">
                {options.files.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label} ({o.count})
                  </option>
                ))}
              </optgroup>
            )}
          </select>

          <select
            aria-label="Filter by date"
            value={query.range}
            onChange={(e) => set({ range: e.target.value as RangeFilter })}
            className={SELECT_CLASS}
          >
            {(Object.keys(RANGE_LABEL) as RangeFilter[]).map((r) => (
              <option key={r} value={r}>
                {RANGE_LABEL[r]}
              </option>
            ))}
          </select>

          <select
            aria-label="Sort"
            value={query.sort}
            onChange={(e) => set({ sort: e.target.value as SortMode })}
            className={SELECT_CLASS}
          >
            {(Object.keys(SORT_LABEL) as SortMode[]).map((s) => (
              <option key={s} value={s}>
                {SORT_LABEL[s]}
              </option>
            ))}
          </select>

          {filtered && (
            <button
              type="button"
              onClick={() => setQuery((q) => ({ ...DEFAULT_QUERY, sort: q.sort }))}
              className="h-9 rounded-lg px-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Reset filters
            </button>
          )}
        </div>

        <div role="tablist" aria-label="Show" className="-mx-1 flex gap-1 overflow-x-auto border-b px-1">
          {SHOW_TABS.map((t) => {
            const active = query.show === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => set({ show: t.id })}
                className={cn(
                  "relative flex shrink-0 items-center gap-1.5 px-3 pb-2.5 pt-1 text-sm transition-colors",
                  active ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
                <span className="text-xs tabular-nums text-muted-foreground">{counts[t.id]}</span>
                {active && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="-mx-2 min-h-0 flex-1 overflow-y-auto px-2 pb-6 pt-4 lg:pb-8">
        {items.length === 0 ? (
          <EmptyState title="Nothing here yet" text="Add a card or drop files into the docs folder and they'll show up here." />
        ) : rows.length === 0 ? (
          <EmptyState
            title="Nothing matches"
            text="Try a different word, or loosen the filters."
            action={
              <button
                type="button"
                onClick={() => setQuery((q) => ({ ...DEFAULT_QUERY, sort: q.sort }))}
                className="mt-4 h-9 rounded-lg border bg-card px-3 text-sm hover:bg-muted"
              >
                Reset filters
              </button>
            }
          />
        ) : (
          <HistoryList rows={rows} now={now} grouped={byDate} />
        )}
      </div>
    </>
  );
}

function EmptyState({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <History className="size-5" />
      </span>
      <p className="mt-4 font-serif text-xl">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>
      {action}
    </div>
  );
}

function HistoryList({ rows, now, grouped }: { rows: HistoryItem[]; now: number; grouped: boolean }) {
  // Split into runs under a heading (Today, Yesterday, …) — only when ordered by date.
  const sections: { heading: string | null; rows: HistoryItem[] }[] = [];
  for (const row of rows) {
    const heading = grouped ? dayBucket(row.at, now) : null;
    const last = sections[sections.length - 1];
    if (last && last.heading === heading) last.rows.push(row);
    else sections.push({ heading, rows: [row] });
  }

  return (
    <div className="space-y-5">
      {sections.map((s, n) => (
        <section key={`${s.heading}-${n}`}>
          {s.heading && (
            <h2 className="mb-2 flex items-baseline gap-2 px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {s.heading}
              <span className="font-normal normal-case tracking-normal tabular-nums">{s.rows.length}</span>
            </h2>
          )}
          <ul className="divide-y overflow-hidden rounded-2xl border bg-card shadow-xs">
            {s.rows.map((row) => (
              <HistoryRow key={row.id} row={row} now={now} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

const FILE_ICON = { image: FileImage, pdf: FileText, text: FileText, office: FileSpreadsheet, other: FileIcon } as const;

function HistoryRow({ row, now }: { row: HistoryItem; now: number }) {
  const meta = row.cardType ? CARD_TYPE_META[row.cardType] : null;
  const Icon = meta ? meta.icon : FILE_ICON[row.fileKind ?? "other"];
  const age = now - row.at;
  const when = age < 30 * 86_400_000 ? formatDistanceToNow(row.at, { addSuffix: true }) : format(row.at, "d MMM yyyy");

  const nameClass = "truncate text-sm font-medium hover:text-primary hover:underline";
  const name = row.external ? (
    <a href={row.href} target="_blank" rel="noreferrer noopener" className={nameClass}>
      {row.title}
    </a>
  ) : (
    <AppLink href={row.href} className={nameClass}>
      {row.title}
    </AppLink>
  );

  return (
    <li className="flex items-center gap-3 px-3.5 py-2.5 transition-colors hover:bg-muted/40">
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", meta ? meta.tone : "bg-muted text-muted-foreground")}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0">{name}</div>
        <p className="truncate text-xs text-muted-foreground">
          {/* on small screens the category and activity fold into the second line */}
          <span className="md:hidden">{row.group} · </span>
          <span className="sm:hidden">{KIND_LABEL[row.kind]} · </span>
          {row.detail}
        </p>
      </div>
      <span className="hidden w-36 shrink-0 truncate text-xs text-muted-foreground md:block" title={row.group}>
        {row.group}
      </span>
      <span
        className={cn(
          "hidden w-28 shrink-0 text-xs sm:block",
          row.kind === "added" && "text-foreground",
          row.kind !== "added" && "text-muted-foreground"
        )}
      >
        {KIND_LABEL[row.kind]}
      </span>
      <time
        dateTime={new Date(row.at).toISOString()}
        title={format(row.at, "EEEE d MMM yyyy, h:mm a")}
        className="w-28 shrink-0 text-right text-xs tabular-nums text-muted-foreground"
      >
        {when}
      </time>
    </li>
  );
}
