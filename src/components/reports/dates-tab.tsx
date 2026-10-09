"use client";

import { CircleAlert, CircleCheck, Clock, TriangleAlert } from "lucide-react";
import { AppLink } from "@/components/shell/app-link";
import { CARD_TYPE_META } from "@/lib/card-types";
import { formatDay, type DeadlineStatus, type Report } from "@/lib/analytics";
import { ColumnChart, DataTable, ItemList, Panel, SERIES, StatTile, fmt } from "./charts";

const STATUS: Record<DeadlineStatus, { label: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; color: string }> = {
  overdue: { label: "Overdue", icon: CircleAlert, color: "var(--viz-crit)" },
  week: { label: "This week", icon: TriangleAlert, color: "var(--viz-serious)" },
  month: { label: "Within 30 days", icon: TriangleAlert, color: "var(--viz-warn)" },
  quarter: { label: "Within 90 days", icon: Clock, color: "var(--viz-1)" },
  year: { label: "Within a year", icon: Clock, color: "var(--viz-1)" },
  far: { label: "Later", icon: CircleCheck, color: "var(--viz-good)" },
};

function when(days: number) {
  if (days < 0) return `${-days} ${-days === 1 ? "day" : "days"} ago`;
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days < 60) return `in ${days} days`;
  if (days < 730) return `in ${Math.round(days / 30)} months`;
  return `in ${(days / 365).toFixed(1)} years`;
}

export function DatesTab({ report }: { report: Report }) {
  const d = report.dates;
  const c = d.counts;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatTile label="Overdue" value={fmt(c.overdue)} icon={CircleAlert} hint={c.overdue ? "needs action" : "none"} />
        <StatTile label="This week" value={fmt(c.week)} icon={TriangleAlert} />
        <StatTile label="Within 30 days" value={fmt(c.week + c.month)} icon={TriangleAlert} hint="including this week" />
        <StatTile label="Within 90 days" value={fmt(c.week + c.month + c.quarter)} icon={Clock} />
        <StatTile label="Tracked in total" value={fmt(d.deadlines.length)} icon={CircleCheck} />
      </div>

      {d.deadlines.length === 0 ? (
        <Panel title="Nothing to track yet">
          <p className="max-w-2xl text-sm text-muted-foreground">
            Reports reads dates from your cards&apos; details. Add a detail named like <span className="font-medium text-foreground">Renews</span>,{" "}
            <span className="font-medium text-foreground">Valid till</span>, <span className="font-medium text-foreground">Expiry</span> or{" "}
            <span className="font-medium text-foreground">Due date</span> with a value such as <span className="font-mono">2027-03-05</span> or{" "}
            <span className="font-mono">05/03/2027</span>, and it appears here with a countdown. Secret details are never read.
          </p>
        </Panel>
      ) : (
        <>
          <Panel title="Next 12 months" description="Renewals and expiries by month. Click a bar to see what falls due. Overdue dates are listed below, not here.">
            <ColumnChart
              drillNoun="due"
              series={[{ name: "Due", color: SERIES[1] }]}
              data={d.byMonth.map((m) => ({ key: m.key, label: m.label, values: [m.count], items: m.items }))}
            />
          </Panel>

          <Panel title="Every tracked date" description="Soonest first, including anything already past.">
            <div className="overflow-x-auto">
              <DataTable
                head={["Card", "Detail", "Date", "When", "Status"]}
                rows={d.deadlines.map((r) => {
                  const s = STATUS[r.status];
                  const Icon = s.icon;
                  return [
                    <AppLink key="c" href={`/cards/${r.cardId}`} className="text-left font-medium hover:text-primary hover:underline">
                      {r.cardTitle}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">{CARD_TYPE_META[r.cardType].label}</span>
                    </AppLink>,
                    r.key,
                    formatDay(r.at),
                    when(r.days),
                    <span key="s" className="inline-flex items-center justify-end gap-1.5">
                      <Icon className="size-4" style={{ color: s.color }} />
                      {s.label}
                    </span>,
                  ];
                })}
              />
            </div>
          </Panel>
        </>
      )}

      {d.missing.length > 0 && (
        <Panel title="No date recorded" description="Insurance and vehicle cards normally renew. Add a “Renews” or “Valid till” detail so you get a warning ahead of time.">
          <ItemList items={d.missing} limit={8} />
        </Panel>
      )}

      {d.other.length > 0 && (
        <Panel title="Other dates on cards" description="Dates of birth, issue dates and similar — kept for reference, not counted as deadlines.">
          <div className="overflow-x-auto">
            <DataTable
              head={["Card", "Detail", "Date"]}
              rows={d.other.slice(0, 40).map((o) => [
                <AppLink key="c" href={`/cards/${o.cardId}`} className="text-left hover:text-primary hover:underline">
                  {o.cardTitle}
                </AppLink>,
                o.key,
                formatDay(o.at),
              ])}
            />
          </div>
        </Panel>
      )}
    </div>
  );
}
