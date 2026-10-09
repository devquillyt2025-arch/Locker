"use client";

import * as React from "react";
import { FilePlus2, FileText, Pencil } from "lucide-react";
import { AppLink } from "@/components/shell/app-link";
import { buildActivity, type ActivityEvent, type ActivityRange, type Report } from "@/lib/analytics";
import type { CardWithDetails } from "@/lib/cards";
import { BarList, ColumnChart, Heatmap, LineChart, Panel, SERIES, StatTile, fmt } from "./charts";
import { cn } from "@/lib/utils";

const RANGES: { value: ActivityRange; label: string }[] = [
  { value: 3, label: "3 months" },
  { value: 6, label: "6 months" },
  { value: 12, label: "12 months" },
  { value: 24, label: "2 years" },
  { value: 0, label: "All time" },
];

const EVENT_META = {
  "card-created": { label: "Card added", icon: FilePlus2 },
  "card-updated": { label: "Card edited", icon: Pencil },
  "doc-changed": { label: "File added or changed", icon: FileText },
} as const;

function ago(now: number, at: number) {
  const days = Math.floor((now - at) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 45) return `${days} days ago`;
  if (days < 700) return `${Math.round(days / 30)} months ago`;
  return `${(days / 365).toFixed(1)} years ago`;
}

export function ActivityTab({ report, cards, events }: { report: Report; cards: CardWithDetails[]; events: ActivityEvent[] }) {
  const [range, setRange] = React.useState<ActivityRange>(12);
  const a = React.useMemo(() => buildActivity(events, cards, range, report.now), [events, cards, range, report.now]);
  const inRange = a.months.reduce((n, m) => n + m.created + m.updated + m.docs, 0);

  if (a.total === 0) {
    return (
      <Panel>
        <p className="py-8 text-center text-sm text-muted-foreground">No activity yet.</p>
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Built from when cards were created and last saved, and when files were last modified. Older edits to a card aren&apos;t kept, so only the latest save counts.
        </p>
        <div role="radiogroup" aria-label="Time range" className="flex gap-1 rounded-lg bg-muted p-[3px]">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              role="radio"
              aria-checked={range === r.value}
              onClick={() => setRange(r.value)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                range === r.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {a.compare.map((c) => (
          <StatTile key={c.label} label={`${c.label} · last 30 days`} value={fmt(c.now)} delta={{ now: c.now, before: c.before }} />
        ))}
      </div>

      <Panel title="Activity by month" description={`${fmt(inRange)} changes in this period.`}>
        <ColumnChart
          series={[
            { name: "Cards added", color: SERIES[0] },
            { name: "Cards edited", color: SERIES[1] },
            { name: "Files changed", color: SERIES[2] },
          ]}
          data={a.months.map((m) => ({ key: m.key, label: m.label, values: [m.created, m.updated, m.docs] }))}
        />
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Vault growth" description="Running total of cards.">
          <LineChart name="Cards" points={a.months.map((m) => ({ label: m.label, value: m.cumulative }))} />
        </Panel>
        <Panel title="Busiest days of the week" description="Across everything, all time.">
          <BarList valueLabel="Changes" rows={a.weekdays.map((w) => ({ key: w.label, label: w.label, value: w.count }))} color={SERIES[3]} />
        </Panel>
      </div>

      <Panel title="The last year, day by day" description="Each square is a day; darker means more changes. Hover for the date.">
        <Heatmap weeks={a.heat.weeks} max={a.heat.max} />
      </Panel>

      <Panel title="Recent changes">
        <ul className="divide-y">
          {a.recent.map((e, i) => {
            const meta = EVENT_META[e.kind];
            const Icon = meta.icon;
            const link =
              e.href?.startsWith("/files/") ? (
                <a href={e.href} target="_blank" rel="noreferrer noopener" className="truncate font-medium hover:text-primary hover:underline">
                  {e.label}
                </a>
              ) : e.href ? (
                <AppLink href={e.href} className="truncate font-medium hover:text-primary hover:underline">
                  {e.label}
                </AppLink>
              ) : (
                <span className="truncate font-medium">{e.label}</span>
              );
            return (
              <li key={`${e.kind}-${e.at}-${i}`} className="flex items-center gap-3 py-2 text-[13px]">
                <Icon className="size-4 shrink-0 text-muted-foreground" />
                <span className="w-36 shrink-0 text-xs text-muted-foreground">{meta.label}</span>
                <span className="flex min-w-0 flex-1">{link}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{ago(report.now, e.at)}</span>
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}
