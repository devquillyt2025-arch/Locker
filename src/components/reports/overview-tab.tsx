"use client";

import * as React from "react";
import { Cloud, FileStack, FolderTree, KeyRound, Layers, Link2, Trash2 } from "lucide-react";
import { CARD_TYPE_META } from "@/lib/card-types";
import { buildActivity, formatBytes, type ActivityEvent, type Report } from "@/lib/analytics";
import type { CardWithDetails } from "@/lib/cards";
import { BarList, LineChart, Panel, SERIES, StatTile, fmt } from "./charts";
import { FindingRow, HealthSummary } from "./health-tab";

export function OverviewTab({
  report,
  cards,
  events,
  onTab,
}: {
  report: Report;
  cards: CardWithDetails[];
  events: ActivityEvent[];
  onTab: (tab: string) => void;
}) {
  const t = report.totals;
  const growth = React.useMemo(() => buildActivity(events, cards, 12, report.now), [events, cards, report.now]);
  const attention = report.findings.filter((f) => f.severity === "critical" || f.severity === "warning").slice(0, 4);
  const today = growth.compare;

  return (
    <div className="space-y-6">
      <Panel
        title="Vault health"
        description="A single score for how complete, current and backed-up everything is."
        actions={
          <button type="button" onClick={() => onTab("health")} className="shrink-0 text-xs font-medium text-primary hover:underline">
            Full audit →
          </button>
        }
      >
        <HealthSummary report={report} />
      </Panel>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Cards" icon={FileStack} value={fmt(t.cards)} hint={`${t.categories} ${t.categories === 1 ? "category" : "categories"}`} />
        <StatTile
          label="Details recorded"
          icon={KeyRound}
          value={fmt(t.fields)}
          hint={`${fmt(t.secretFields)} secret · on ${fmt(t.cardsWithSecrets)} ${t.cardsWithSecrets === 1 ? "card" : "cards"}`}
        />
        <StatTile
          label="Files"
          icon={FolderTree}
          value={report.docsAvailable ? fmt(t.files) : "—"}
          hint={report.docsAvailable ? formatBytes(t.bytes) : "No documents folder here"}
        />
        <StatTile label="File links on cards" icon={Link2} value={fmt(t.links)} hint={`${report.links.broken.length} broken`} />
        <StatTile
          label="On Google Drive"
          icon={Cloud}
          value={report.docsAvailable && report.backup.connected ? `${report.backup.coverage}%` : "—"}
          hint={
            !report.docsAvailable
              ? undefined
              : report.backup.connected
                ? `${fmt(report.backup.onDrive)} of ${fmt(report.backup.eligible)} files`
                : "Not connected"
          }
        />
        <StatTile label="Card completeness" icon={Layers} value={`${report.cards.avgScore}%`} hint="average across all cards" />
        <StatTile
          label="Dates being tracked"
          value={fmt(report.dates.deadlines.length)}
          hint={`${report.dates.counts.overdue} overdue · ${report.dates.counts.week + report.dates.counts.month} due in 30 days`}
        />
        <StatTile label="In Trash" icon={Trash2} value={fmt(t.trash)} hint={report.trash.stale ? `${report.trash.stale} older than 30 days` : "nothing stale"} />
      </div>

      {attention.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">Needs your attention</h3>
            <button type="button" onClick={() => onTab("health")} className="text-xs font-medium text-primary hover:underline">
              All findings →
            </button>
          </div>
          <ul className="space-y-2">
            {attention.map((f) => (
              <FindingRow key={f.id} finding={f} />
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Cards by category" description="Click a category to list its cards.">
          <BarList
            drillNoun="cards"
            rows={report.cards.byType.map((s) => ({
              key: s.type,
              label: CARD_TYPE_META[s.type].plural,
              icon: CARD_TYPE_META[s.type].icon,
              value: s.count,
              items: s.items,
            }))}
            emptyText="Add a card to see the breakdown."
          />
        </Panel>
        <Panel
          title="Vault growth"
          description={`Total cards over the last 12 months. ${today[0].now} added in the last 30 days.`}
        >
          <LineChart name="Cards" color={SERIES[0]} points={growth.months.map((m) => ({ label: m.label, value: m.cumulative }))} />
        </Panel>
      </div>
    </div>
  );
}
