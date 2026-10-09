"use client";

import { Cloud, CloudOff } from "lucide-react";
import { AppLink } from "@/components/shell/app-link";
import { CARD_TYPE_META } from "@/lib/card-types";
import { formatBytes, type Report } from "@/lib/analytics";
import { BarList, ColumnChart, Coverage, DataTable, Donut, ItemList, Meter, Panel, SERIES, StatTile, fmt, pct } from "./charts";

export function LinksTab({ report }: { report: Report }) {
  const b = report.backup;
  const l = report.links;
  const linkedFiles = b.eligible - report.docs.orphans.length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="File links on cards" value={fmt(l.total)} hint={`${fmt(l.local)} local · ${fmt(l.remote)} online`} />
        <StatTile label="Broken links" value={fmt(l.broken.length)} hint={l.broken.length ? "point at a missing file" : "all resolve"} />
        <StatTile label="Cards with no file" value={fmt(l.cardsWithout.length)} hint="where you'd expect one" />
        <StatTile
          label="Files not on any card"
          value={report.docsAvailable ? fmt(report.docs.orphans.length) : "—"}
          hint={report.docsAvailable ? `of ${fmt(b.eligible)} personal files` : "No documents folder here"}
        />
      </div>

      {report.docsAvailable && (
        <Panel
          title="Google Drive backup"
          description="Personal files only — Reference, Inbox and Needs Review are never uploaded."
          actions={
            <AppLink href="/documents" className="shrink-0 text-xs font-medium text-primary hover:underline">
              Open Documents →
            </AppLink>
          }
        >
          <div className="flex flex-wrap items-center gap-x-10 gap-y-5">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-xl bg-muted">
                {b.connected ? <Cloud className="size-5" style={{ color: "var(--viz-good)" }} /> : <CloudOff className="size-5 text-muted-foreground" />}
              </span>
              <div>
                <p className="text-sm font-medium">{b.connected ? "Connected" : b.configured ? "Not connected yet" : "Not set up"}</p>
                <p className="text-xs text-muted-foreground">{b.connected ? (b.email ?? "Google account") : "Nothing is backed up off this computer."}</p>
              </div>
            </div>
            <div className="min-w-[16rem] flex-1">
              <Coverage label="Personal files on Drive" value={b.onDrive} of={b.eligible} hint={b.pending.length ? `${fmt(b.pending.length)} still to upload · ${formatBytes(b.pendingBytes)}` : "Everything eligible is uploaded."} />
            </div>
          </div>
          <div className="mt-6 overflow-x-auto">
            <DataTable
              head={["Section", "Personal files", "On Drive", "Attached to a card", "Not attached"]}
              rows={report.docs.byTop
                .filter((s) => s.eligible > 0)
                .map((s) => [
                  s.name,
                  fmt(s.eligible),
                  <span key="d" className="ml-auto flex w-32 items-center gap-2">
                    <Meter value={pct(s.onDrive, s.eligible)} />
                    <span className="w-9 shrink-0 text-right">{pct(s.onDrive, s.eligible)}%</span>
                  </span>,
                  fmt(s.linked),
                  fmt(s.unlinked),
                ])}
            />
          </div>
          {b.pending.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-sm font-medium">
                Not on Drive yet <span className="font-normal text-muted-foreground">· {fmt(b.pending.length)}</span>
              </p>
              <ItemList items={b.pending} limit={8} />
            </div>
          )}
        </Panel>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Files per card" description="How many files each card has attached.">
          <ColumnChart series={[{ name: "Cards", color: SERIES[0] }]} data={l.filesPerCard.map((f) => ({ key: f.label, label: f.label, values: [f.count] }))} />
        </Panel>
        <Panel title="Which cards have a file?" description="Share of each category with at least one file attached. Notes and contacts are left out.">
          <BarList
            unit="%"
            valueLabel="Have a file"
            color={SERIES[2]}
            rows={l.byType.map((t) => ({
              key: t.type,
              label: CARD_TYPE_META[t.type].plural,
              icon: CARD_TYPE_META[t.type].icon,
              value: pct(t.withLinks, t.cards),
              note: `${t.withLinks}/${t.cards}`,
            }))}
          />
        </Panel>
      </div>

      {report.docsAvailable && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Files attached to cards" description="Personal files that a card points to, compared with ones nothing points to.">
            <Donut
              centerLabel="files"
              slices={[
                { key: "linked", label: "Attached to a card", value: linkedFiles },
                { key: "orphan", label: "Not attached", value: report.docs.orphans.length, color: SERIES[1] },
              ]}
            />
          </Panel>
          <Panel title="Not attached to any card" description="Attach these to the right card so a search finds them.">
            {report.docs.orphans.length ? <ItemList items={report.docs.orphans} limit={8} /> : <p className="text-sm text-muted-foreground">Every personal file is attached to a card.</p>}
          </Panel>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Broken links" description="Card links to a local file that no longer exists at that path.">
          {l.broken.length ? <ItemList items={l.broken} limit={8} /> : <p className="text-sm text-muted-foreground">No broken links.</p>}
        </Panel>
        <Panel title="Cards with no file attached" description="ID, bank, insurance, vehicle, property, medical and education cards usually have a scan behind them.">
          {l.cardsWithout.length ? <ItemList items={l.cardsWithout} limit={8} /> : <p className="text-sm text-muted-foreground">Every card that should have a file does.</p>}
        </Panel>
      </div>
    </div>
  );
}
