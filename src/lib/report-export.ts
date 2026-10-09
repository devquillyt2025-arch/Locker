import { CARD_TYPE_META } from "@/lib/card-types";
import { formatBytes, formatDay, CHECK_LABEL, type Report } from "@/lib/analytics";
import type { DocsContextValue } from "@/lib/docs-types";
import { relPathFromFileUrl } from "@/lib/docs-types";
import type { CardWithDetails } from "@/lib/cards";

// Exports built from a Report. None of them contain a secret field's value —
// only the field NAMES and counts — so a downloaded report is safe to share
// with an accountant or family member.

type Cell = string | number | boolean | null | undefined;

function csvCell(v: Cell): string {
  let s = v === null || v === undefined ? "" : String(v);
  // Stops spreadsheet apps from running a text cell that starts like a formula.
  // Real numbers are left alone, or an overdue "-12" would turn into the text '-12.
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(head: string[], rows: Cell[][]): string {
  // BOM so Excel opens UTF-8 (₹, accents) correctly.
  return "﻿" + [head, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export function download(filename: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: `${mime};charset=utf-8` }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const stamp = (now: number) => new Date(now).toISOString().slice(0, 10);

export function cardsCsv(report: Report, cards: CardWithDetails[]): string {
  const byId = new Map(cards.map((c) => [c.id, c]));
  return toCsv(
    ["Title", "Category", "Details", "Secret details", "Files", "Tags", "Aliases", "Completeness %", "Missing", "Created", "Last updated", "Detail names"],
    report.cards.rows.map((r) => {
      const c = byId.get(r.id);
      return [
        r.title,
        CARD_TYPE_META[r.type].label,
        r.fields,
        r.secrets,
        r.links,
        r.tags.join("; "),
        c?.aliases.join("; ") ?? "",
        r.score,
        r.missing.map((m) => CHECK_LABEL[m]).join("; "),
        new Date(r.created).toISOString().slice(0, 10),
        new Date(r.updated).toISOString().slice(0, 10),
        c?.fields.map((f) => f.key).join("; ") ?? "",
      ];
    })
  );
}

export function docsCsv(docs: DocsContextValue, cards: CardWithDetails[]): string {
  const linked = new Map<string, string[]>();
  for (const c of cards)
    for (const l of c.links) {
      const rel = relPathFromFileUrl(l.url);
      if (rel) linked.set(rel, [...(linked.get(rel) ?? []), c.title]);
    }
  return toCsv(
    ["Path", "Name", "Section", "Type", "Size (bytes)", "Size", "Modified", "Linked cards", "On Drive", "Description"],
    docs.files.map((f) => [
      f.path,
      f.name,
      f.top,
      f.kind,
      f.size,
      formatBytes(f.size),
      new Date(f.modified).toISOString().slice(0, 10),
      (linked.get(f.path) ?? []).join("; "),
      docs.uploads[f.path] ? "yes" : "no",
      f.description,
    ])
  );
}

export function datesCsv(report: Report): string {
  return toCsv(
    ["Card", "Category", "Field", "Date", "Days from today", "Status"],
    report.dates.deadlines.map((d) => [d.cardTitle, CARD_TYPE_META[d.cardType].label, d.key, new Date(d.at).toISOString().slice(0, 10), d.days, d.status])
  );
}

export function findingsCsv(report: Report): string {
  return toCsv(
    ["Severity", "Finding", "What to do", "Count", "Items"],
    report.findings.map((f) => [f.severity, f.title, f.detail, f.count, f.items.map((i) => i.label).join("; ")])
  );
}

/** The whole report as plain JSON (no secret values, no per-item drill-down lists). */
export function reportJson(report: Report): string {
  const { cards, docs, ...rest } = report;
  return JSON.stringify(
    {
      generatedAt: new Date(report.now).toISOString(),
      ...rest,
      cards: {
        avgScore: cards.avgScore,
        byType: cards.byType.map((t) => ({ type: t.type, count: t.count, fields: t.fields, secrets: t.secrets, links: t.links, avgScore: t.avgScore, withLinks: t.withLinks })),
        rows: cards.rows,
        fieldKeys: cards.fieldKeys.map((k) => ({ label: k.label, count: k.count })),
        tags: cards.tags.map((k) => ({ label: k.label, count: k.count })),
        fieldMix: cards.fieldMix,
        linkSources: cards.linkSources,
        linkKinds: cards.linkKinds,
      },
      docs: {
        byTop: docs.byTop,
        byKind: docs.byKind,
        byExt: docs.byExt,
        byYear: docs.byYear,
        duplicates: docs.duplicates.map((d) => ({ name: d.name, size: d.size, paths: d.files.map((f) => f.path) })),
        needsReview: docs.needsReview.length,
        inbox: docs.inbox.length,
        orphans: docs.orphans.length,
      },
      findings: report.findings.map(({ items, ...f }) => ({ ...f, items: items.map((i) => i.label) })),
    },
    null,
    2
  );
}

/** A short plain-text summary, ready to paste into a message or note. */
export function summaryText(report: Report): string {
  const t = report.totals;
  const lines = [
    `Locker report — ${formatDay(report.now)}`,
    `Health score: ${report.health.score}/100 (${report.health.label})`,
    "",
    `${t.cards} cards · ${t.files} files (${formatBytes(t.bytes)}) · ${t.links} file links · ${t.secretFields} secret details`,
  ];
  if (report.docsAvailable) {
    lines.push(
      `Drive backup: ${report.backup.connected ? `${report.backup.onDrive} of ${report.backup.eligible} files (${report.backup.coverage}%)` : "not connected"}`
    );
  }
  const d = report.dates.counts;
  lines.push(`Dates: ${d.overdue} overdue · ${d.week + d.month} due within 30 days · ${d.quarter} within 90 days`);
  const todo = report.findings.filter((f) => f.severity === "critical" || f.severity === "warning");
  if (todo.length) {
    lines.push("", "Needs attention:");
    for (const f of todo) lines.push(`- ${f.title}`);
  } else {
    lines.push("", "Nothing urgent.");
  }
  return lines.join("\n");
}
