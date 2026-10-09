"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import { AppLink } from "@/components/shell/app-link";
import { formatBytes, type Finding, type Report } from "@/lib/analytics";
import { ItemList, Meter, Panel, ScoreRing, SeverityBadge, StatTile, fmt, scoreColor } from "./charts";
import { cn } from "@/lib/utils";

export function HealthSummary({ report }: { report: Report }) {
  const { health } = report;
  return (
    <div className="flex flex-wrap items-center gap-x-10 gap-y-6">
      <div className="flex flex-col items-center gap-2">
        <ScoreRing score={health.score} label={health.label} />
        <p className="flex items-center gap-2 text-sm font-medium">
          <span className="size-2 rounded-full" style={{ background: scoreColor(health.score) }} />
          {health.label}
        </p>
      </div>
      <ul className="min-w-[16rem] flex-1 space-y-3.5">
        {health.parts.length === 0 && <li className="text-sm text-muted-foreground">Add some cards and files to get a score.</li>}
        {health.parts.map((p) => (
          <li key={p.id}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
              <span className="font-medium">{p.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {p.score}
                <span className="text-xs"> · weight {p.weight}</span>
              </span>
            </div>
            <Meter value={p.score} />
            <p className="mt-1 text-xs text-muted-foreground">{p.detail}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FindingRow({ finding, defaultOpen = false }: { finding: Finding; defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(defaultOpen);
  const expandable = finding.items.length > 0;
  return (
    <li className="rounded-xl border bg-card">
      <div className="flex items-start gap-3 p-3.5">
        <div className="w-[5.5rem] shrink-0 pt-0.5">
          <SeverityBadge severity={finding.severity} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{finding.title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{finding.detail}</p>
          {finding.action && (
            <AppLink href={finding.action.href} className="mt-2 inline-block text-xs font-medium text-primary hover:underline">
              {finding.action.label} →
            </AppLink>
          )}
        </div>
        {expandable && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {fmt(finding.items.length)}
            <ChevronRight className={cn("size-3.5 transition-transform", open && "rotate-90")} />
          </button>
        )}
      </div>
      {open && expandable && <ItemList items={finding.items} limit={8} className="border-t p-3.5" />}
    </li>
  );
}

export function HealthTab({ report }: { report: Report }) {
  const groups: { title: string; severities: Finding["severity"][] }[] = [
    { title: "Act now", severities: ["critical"] },
    { title: "Coming up", severities: ["warning"] },
    { title: "Worth tidying", severities: ["info"] },
    { title: "Going well", severities: ["good"] },
  ];
  const t = report.trash;

  return (
    <div className="space-y-6">
      <Panel
        title="Vault health"
        description="One number for how well-kept the vault is. It's an average of the checks below, weighted by how much each one matters; a check that doesn't apply to you (say, no documents folder) is left out rather than counted as zero."
      >
        <HealthSummary report={report} />
      </Panel>

      <div className="space-y-5">
        {groups.map((g) => {
          const list = report.findings.filter((f) => g.severities.includes(f.severity));
          if (list.length === 0) return null;
          return (
            <section key={g.title}>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                {g.title} <span className="tabular-nums">· {list.length}</span>
              </h3>
              <ul className="space-y-2">
                {list.map((f) => (
                  <FindingRow key={f.id} finding={f} defaultOpen={f.severity === "critical"} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <Panel title="Trash" description="Deleted cards and files are kept here until you empty the Trash.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Cards in Trash" value={t.cards} />
          <StatTile label="Files in Trash" value={t.docs} hint={t.docs ? formatBytes(t.docBytes) : undefined} />
          <StatTile label="Older than 30 days" value={t.stale} />
          <StatTile
            label="Oldest item"
            value={t.oldest ? `${Math.floor((report.now - t.oldest) / 86_400_000)}d` : "—"}
            hint={t.oldest ? "since it was deleted" : "Trash is empty"}
          />
        </div>
      </Panel>
    </div>
  );
}
