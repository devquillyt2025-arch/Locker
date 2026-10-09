"use client";

import * as React from "react";
import { TriangleAlert } from "lucide-react";
import { useDocs } from "@/components/docs/docs-store";
import { formatBytes, type Report } from "@/lib/analytics";
import type { DocFile } from "@/lib/docs-types";
import {
  BarList,
  ColumnChart,
  Coverage,
  Donut,
  Drill,
  ItemList,
  Panel,
  SERIES,
  StatTile,
  fmt,
  pct,
} from "./charts";

const NO_FILES: DocFile[] = [];

const KIND_LABEL: Record<DocFile["kind"], string> = {
  pdf: "PDF",
  image: "Image",
  text: "Text",
  office: "Office",
  other: "Other",
};

export function DocsTab({ report }: { report: Report }) {
  const docs = useDocs();
  const d = report.docs;
  const allFiles = docs.files;
  const files = docs.available ? allFiles : NO_FILES;

  const bySection = React.useMemo(() => {
    const map = new Map<string, DocFile[]>();
    for (const f of files) {
      const k = f.top || "(loose files)";
      map.set(k, [...(map.get(k) ?? []), f]);
    }
    return map;
  }, [files]);

  if (!docs.available) {
    return (
      <Panel>
        <div className="flex flex-col items-center py-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <TriangleAlert className="size-5" />
          </span>
          <p className="mt-4 font-serif text-xl">No documents folder here</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Document analytics read the <span className="font-mono">docs</span> folder of the project, which only exists on the computer that holds your files.
          </p>
        </div>
      </Panel>
    );
  }

  const fileItems = (list: DocFile[]) =>
    list.map((f) => ({ id: f.path, label: f.name, sub: `${formatBytes(f.size)} · ${f.folder}`, href: f.url ?? "/documents" }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Files" value={fmt(report.totals.files)} hint={`in ${d.byTop.length} sections`} />
        <StatTile label="Total size" value={formatBytes(report.totals.bytes)} hint={files.length ? `avg ${formatBytes(Math.round(report.totals.bytes / files.length))} per file` : undefined} />
        <StatTile label="Have a description" value={`${pct(d.described, files.length)}%`} hint={`${fmt(d.described)} of ${fmt(files.length)}`} />
        <StatTile label="Renamed & organised" value={fmt(d.renamed)} hint="files with a known original name" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Files by section" description="Click a section to list its files.">
          <BarList
            drillNoun="files"
            rows={d.byTop.map((s) => ({
              key: s.name,
              label: s.name,
              value: s.count,
              note: formatBytes(s.bytes),
              items: fileItems(bySection.get(s.name) ?? []),
            }))}
          />
        </Panel>
        <Panel title="Storage by section" description="Where the space goes.">
          <BarList
            color={SERIES[1]}
            format={formatBytes}
            valueLabel="Size"
            rows={[...d.byTop]
              .sort((a, b) => b.bytes - a.bytes)
              .map((s) => ({ key: s.name, label: s.name, value: s.bytes, note: `${pct(s.bytes, report.totals.bytes)}%` }))}
          />
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="File types">
          <Donut
            centerLabel="files"
            slices={d.byKind.map((k) => ({ key: k.kind, label: `${KIND_LABEL[k.kind]} · ${formatBytes(k.bytes)}`, value: k.count }))}
          />
        </Panel>
        <Panel title="Extensions" description="The ten most common.">
          <BarList color={SERIES[2]} rows={d.byExt.map((e) => ({ key: e.ext, label: `.${e.ext}`, value: e.count, note: formatBytes(e.bytes) }))} />
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="File sizes" description="Click a bar to list the files, biggest first.">
          <ColumnChart
            drillNoun="files"
            series={[{ name: "Files", color: SERIES[0] }]}
            data={d.sizeBuckets.map((b) => ({ key: b.label, label: b.label, values: [b.count], items: b.items }))}
          />
        </Panel>
        <Panel title="When files were last modified" description="By year — a rough picture of how far back your paperwork goes.">
          <ColumnChart series={[{ name: "Files", color: SERIES[0] }]} data={d.byYear.map((y) => ({ key: String(y.year), label: String(y.year), values: [y.count] }))} />
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Largest files">
          <ItemList items={fileItems(d.largest)} limit={10} />
        </Panel>
        <DuplicatesPanel report={report} />
      </div>

      <Panel title="Housekeeping" description="Coverage of the small things that make files findable.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Coverage label="Files with a description" value={d.described} of={files.length} />
          <Coverage label="Personal files attached to a card" value={report.backup.eligible - d.orphans.length} of={report.backup.eligible} hint="Reference, Inbox and Needs Review don't count." />
        </div>
      </Panel>
    </div>
  );
}

function DuplicatesPanel({ report }: { report: Report }) {
  const d = report.docs;
  const [open, setOpen] = React.useState<string | null>(null);
  const active = d.duplicates.find((g) => `${g.name}|${g.size}` === open);
  return (
    <Panel
      title="Duplicate files"
      description={d.duplicates.length ? `Same name and size in more than one place — about ${formatBytes(d.duplicateBytes)} could be reclaimed.` : undefined}
    >
      {d.duplicates.length === 0 ? (
        <p className="text-sm text-muted-foreground">No duplicates found. Files count as duplicates when the name and size match exactly.</p>
      ) : (
        <>
          <ul className="divide-y rounded-xl border bg-background/40">
            {d.duplicates.slice(0, 12).map((g) => {
              const key = `${g.name}|${g.size}`;
              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => setOpen(open === key ? null : key)}
                    aria-pressed={open === key}
                    className="flex w-full items-baseline gap-3 px-3 py-2 text-left text-[13px] hover:bg-muted/50"
                  >
                    <span className="min-w-0 flex-1 truncate font-medium">{g.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {g.files.length} copies · {formatBytes(g.size)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {active && (
            <Drill
              title={`Copies of ${active.name}`}
              onClose={() => setOpen(null)}
              items={active.files.map((f) => ({ id: f.path, label: f.path, href: f.url ?? "/documents" }))}
            />
          )}
        </>
      )}
    </Panel>
  );
}
