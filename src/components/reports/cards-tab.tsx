"use client";

import { CARD_TYPE_META } from "@/lib/card-types";
import type { Report } from "@/lib/analytics";
import {
  BarList,
  ColumnChart,
  DataTable,
  Donut,
  ItemList,
  Meter,
  Panel,
  SERIES,
  StatTile,
  fmt,
  pct,
} from "./charts";

export function CardsTab({ report }: { report: Report }) {
  const c = report.cards;
  const total = report.totals.cards;

  if (total === 0) {
    return (
      <Panel>
        <p className="py-8 text-center text-sm text-muted-foreground">No cards yet — add one and this tab breaks your vault down.</p>
      </Panel>
    );
  }

  const complete = c.rows.filter((r) => r.score === 100).length;
  const sourceSlices = [
    { key: "drive", label: "Google Drive", value: c.linkSources.drive },
    { key: "digilocker", label: "DigiLocker", value: c.linkSources.digilocker },
    { key: "other", label: "Local file or other", value: c.linkSources.other },
  ];
  const kindSlices = [
    { key: "pdf", label: "PDF", value: c.linkKinds.pdf },
    { key: "image", label: "Image", value: c.linkKinds.image },
    { key: "doc", label: "Document", value: c.linkKinds.doc },
    { key: "folder", label: "Folder", value: c.linkKinds.folder },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Cards" value={fmt(total)} hint={`${report.totals.categories} categories`} />
        <StatTile label="Fully complete" value={fmt(complete)} hint={`${pct(complete, total)}% of cards`} />
        <StatTile label="Average completeness" value={`${c.avgScore}%`} />
        <StatTile
          label="Have a file attached"
          value={fmt(c.rows.filter((r) => r.links > 0).length)}
          hint={`${fmt(c.rows.filter((r) => r.tags.length > 0).length)} tagged · ${fmt(c.rows.filter((r) => r.aliases > 0).length)} with aliases`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Cards by category" description="Click a category to list its cards.">
          <BarList
            drillNoun="cards"
            rows={c.byType.map((s) => ({
              key: s.type,
              label: CARD_TYPE_META[s.type].plural,
              icon: CARD_TYPE_META[s.type].icon,
              value: s.count,
              note: `${pct(s.count, total)}%`,
              items: s.items,
            }))}
          />
        </Panel>

        <Panel
          title="How complete are your cards?"
          description="Each card is scored on what it should have: details, an attached file, tags and search aliases (a note needs text instead of details and files). Click a bar to see which cards and what each is missing."
        >
          <ColumnChart
            drillNoun="cards"
            series={[{ name: "Cards", color: SERIES[0] }]}
            data={c.scoreBuckets.map((b) => ({ key: b.label, label: b.label, values: [b.count], items: b.items }))}
          />
        </Panel>
      </div>

      <Panel title="Category breakdown" description="What each category actually contains.">
        <div className="overflow-x-auto">
          <DataTable
            head={["Category", "Cards", "Details", "Secret", "Files", "Have a file", "Completeness"]}
            rows={c.byType.map((s) => {
              const meta = CARD_TYPE_META[s.type];
              const Icon = meta.icon;
              return [
                <span key="n" className="flex items-center gap-2">
                  <Icon className="size-3.5 text-muted-foreground" />
                  {meta.plural}
                </span>,
                fmt(s.count),
                fmt(s.fields),
                fmt(s.secrets),
                fmt(s.links),
                `${pct(s.withLinks, s.count)}%`,
                <span key="m" className="ml-auto flex w-32 items-center gap-2">
                  <Meter value={s.avgScore} />
                  <span className="w-9 shrink-0 text-right">{s.avgScore}%</span>
                </span>,
              ];
            })}
          />
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Most-used detail names" description="How many cards carry each kind of detail. Two names for the same thing (say, “Policy No” and “Policy Number”) show up here as separate rows.">
          <BarList drillNoun="cards" color={SERIES[2]} rows={c.fieldKeys.map((k) => ({ key: k.key, label: k.label, value: k.count, items: k.items }))} emptyText="No details recorded yet." />
        </Panel>
        <Panel title="Tags" description="How your cards are labelled.">
          <BarList
            drillNoun="cards"
            color={SERIES[3]}
            rows={c.tags.map((k) => ({ key: k.key, label: k.label, value: k.count, items: k.items }))}
            emptyText="No tags yet — tags make cards easier to find."
          />
          {c.untagged.length > 0 && <p className="mt-3 text-xs text-muted-foreground">{fmt(c.untagged.length)} cards have no tags.</p>}
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Details" description="Plain details versus ones marked secret. Only the count is used here — never the value.">
          <Donut
            centerLabel="details"
            slices={[
              { key: "plain", label: "Plain", value: c.fieldMix.plain },
              { key: "secret", label: "Secret", value: c.fieldMix.secret },
            ]}
          />
        </Panel>
        <Panel title="Where linked files live">
          <Donut centerLabel="links" slices={sourceSlices} />
        </Panel>
        <Panel title="Kinds of linked file">
          <Donut centerLabel="links" slices={kindSlices} />
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Richest cards" description="Most details and files.">
          <ItemList items={c.richest} limit={8} />
        </Panel>
        <Panel title="Least complete" description="Fix these first — they're the hardest to find later.">
          {c.thin.length ? <ItemList items={c.thin} limit={8} /> : <p className="text-sm text-muted-foreground">Every card is at least half complete.</p>}
        </Panel>
        <Panel title="Not touched in a year" description="Worth a quick check that the details are still right.">
          {c.stale.length ? <ItemList items={c.stale} limit={8} /> : <p className="text-sm text-muted-foreground">Everything has been updated in the last year.</p>}
        </Panel>
      </div>
    </div>
  );
}
