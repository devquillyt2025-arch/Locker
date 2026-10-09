"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ChartNoAxesCombined, ClipboardCopy, Download, FileJson, FileSpreadsheet, Table2 } from "lucide-react";
import { ViewModeContext, type ViewMode } from "@/components/reports/charts";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { useCards } from "@/components/cards/cards-store";
import { useDocs } from "@/components/docs/docs-store";
import { useTrash } from "@/components/trash/trash-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buildReport, collectEvents } from "@/lib/analytics";
import { cardsCsv, datesCsv, docsCsv, download, findingsCsv, reportJson, stamp, summaryText } from "@/lib/report-export";
import { useMounted } from "@/lib/use-mounted";
import { cn } from "@/lib/utils";
import { OverviewTab } from "@/components/reports/overview-tab";
import { CardsTab } from "@/components/reports/cards-tab";
import { DocsTab } from "@/components/reports/docs-tab";
import { LinksTab } from "@/components/reports/links-tab";
import { DatesTab } from "@/components/reports/dates-tab";
import { ActivityTab } from "@/components/reports/activity-tab";
import { HealthTab } from "@/components/reports/health-tab";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "cards", label: "Cards" },
  { id: "documents", label: "Documents" },
  { id: "links", label: "Links & backup" },
  { id: "dates", label: "Dates" },
  { id: "activity", label: "Activity" },
  { id: "health", label: "Health" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const VIEW_KEY = "locker_reports_view";

const VIEWS: { value: ViewMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "charts", label: "Charts", icon: ChartNoAxesCombined },
  { value: "tables", label: "Tables", icon: Table2 },
];

export function ReportsView() {
  const mounted = useMounted();
  const initial = useSearchParams().get("tab");
  const [tab, setTab] = React.useState<TabId>(TABS.some((t) => t.id === initial) ? (initial as TabId) : "overview");

  return (
    <PageContainer>
      {mounted ? (
        <Loaded tab={tab} setTab={setTab} />
      ) : (
        <>
          <PageHeader title="Reports" description="Analytics across your cards, documents and backups." />
          <div aria-hidden className="min-h-[60vh]" />
        </>
      )}
    </PageContainer>
  );
}

// Everything below runs in the browser only. The report depends on "now" and on
// the viewer's time zone (month buckets, days until a renewal), so drawing it on
// the server would disagree with the client and cause a hydration mismatch.
function Loaded({ tab, setTab }: { tab: TabId; setTab: (t: TabId) => void }) {
  const { cards } = useCards();
  const docs = useDocs();
  const trash = useTrash();
  const now = React.useMemo(() => Date.now(), []);

  // Charts or tables — remembered on this device. Only ever runs in the browser
  // (Loaded renders after mount), and storage can be blocked, hence the try/catch.
  const fromUrl = useSearchParams().get("view");
  const [view, setViewState] = React.useState<ViewMode>(() => {
    if (fromUrl === "tables" || fromUrl === "charts") return fromUrl;
    try {
      return localStorage.getItem(VIEW_KEY) === "tables" ? "tables" : "charts";
    } catch {
      return "charts";
    }
  });
  function setView(next: ViewMode) {
    setViewState(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {}
  }

  const report = React.useMemo(() => buildReport(cards, docs, trash, now), [cards, docs, trash, now]);
  const events = React.useMemo(() => collectEvents(cards, docs), [cards, docs]);

  const badge: Partial<Record<TabId, { n: number; tone: string }>> = {};
  const urgent = report.findings.filter((f) => f.severity === "critical").length;
  const soon = report.findings.filter((f) => f.severity === "warning").length;
  if (urgent + soon > 0) badge.health = { n: urgent + soon, tone: urgent ? "var(--viz-crit)" : "var(--viz-warn)" };
  if (report.dates.counts.overdue > 0) badge.dates = { n: report.dates.counts.overdue, tone: "var(--viz-crit)" };

  const day = stamp(now);
  async function copySummary() {
    try {
      await navigator.clipboard.writeText(summaryText(report));
      toast.success("Summary copied");
    } catch {
      toast.error("Couldn't copy");
    }
  }

  return (
    // `relative` matters: the screen-reader-only chart tables are absolutely
    // positioned, and without a positioned ancestor inside <main> they would
    // hang off the page itself and give the whole window its own scrollbar.
    <div className="viz-root relative">
      <PageHeader
        title="Reports"
        description="Full analytics across your cards, documents, backups and renewal dates — and what to do about it."
        actions={
          <>
          <div role="radiogroup" aria-label="How to show the data" className="flex h-9 items-center gap-1 rounded-lg bg-muted p-[3px]">
            {VIEWS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={view === value}
                onClick={() => setView(value)}
                className={cn(
                  "flex h-full items-center gap-1.5 rounded-md px-2.5 text-sm transition-colors",
                  view === value ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            ))}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-9 items-center gap-2 rounded-lg border bg-card px-3 text-sm transition-colors hover:bg-muted"
              >
                <Download className="size-4 text-muted-foreground" /> Export
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="font-normal text-muted-foreground">Secret values are never included</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => download(`locker-cards-${day}.csv`, cardsCsv(report, cards), "text/csv")}>
                <FileSpreadsheet /> Cards (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!docs.available}
                onSelect={() => download(`locker-documents-${day}.csv`, docsCsv(docs, cards), "text/csv")}
              >
                <FileSpreadsheet /> Documents (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => download(`locker-dates-${day}.csv`, datesCsv(report), "text/csv")}>
                <FileSpreadsheet /> Renewals & expiries (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => download(`locker-findings-${day}.csv`, findingsCsv(report), "text/csv")}>
                <FileSpreadsheet /> Findings (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => download(`locker-report-${day}.json`, reportJson(report), "application/json")}>
                <FileJson /> Full report (JSON)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => void copySummary()}>
                <ClipboardCopy /> Copy text summary
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </>
        }
      />

      <div role="tablist" aria-label="Report sections" className="-mx-1 mb-6 flex gap-1 overflow-x-auto border-b px-1">
        {TABS.map((t) => {
          const b = badge[t.id];
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={active}
              aria-controls={`panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={cn(
                "relative flex shrink-0 items-center gap-2 px-3 pb-2.5 pt-1 text-sm transition-colors",
                active ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
              {b && (
                <span
                  className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums text-black"
                  style={{ background: b.tone }}
                  title={t.id === "dates" ? "Overdue" : "Findings that need attention"}
                >
                  {b.n}
                </span>
              )}
              {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
            </button>
          );
        })}
      </div>

      {report.empty && tab !== "health" ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed px-6 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <ChartNoAxesCombined className="size-5" />
          </span>
          <p className="mt-4 font-serif text-xl">Nothing to analyse yet</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">Add a few cards and drop your files into the docs folder — this page fills in on its own.</p>
        </div>
      ) : (
        <ViewModeContext.Provider value={view}>
          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
            {tab === "overview" && <OverviewTab report={report} cards={cards} events={events} onTab={(t) => setTab(t as TabId)} />}
            {tab === "cards" && <CardsTab report={report} />}
            {tab === "documents" && <DocsTab report={report} />}
            {tab === "links" && <LinksTab report={report} />}
            {tab === "dates" && <DatesTab report={report} />}
            {tab === "activity" && <ActivityTab report={report} cards={cards} events={events} />}
            {tab === "health" && <HealthTab report={report} />}
          </div>
        </ViewModeContext.Provider>
      )}
    </div>
  );
}
