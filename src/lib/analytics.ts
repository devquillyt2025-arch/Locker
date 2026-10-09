import type { CardType } from "@/db/schema";
import type { CardWithDetails } from "@/lib/cards";
import {
  isDriveEligiblePath,
  relPathFromFileUrl,
  type DocFile,
  type DocsContextValue,
  type TrashData,
} from "@/lib/docs-types";

// Everything the Reports page shows is computed here, from data the app shell
// has already loaded (cards, documents, Drive uploads, Trash). Pure functions,
// no I/O — safe on the client, easy to test.
//
// Privacy rule: a secret field's VALUE is never read by anything in this file.
// Secret fields are only counted, never inspected or parsed.

export const DAY = 86_400_000;

export type Item = { id: string; label: string; sub?: string; href?: string };

const ts = (d: Date | string | number) => new Date(d).getTime();

const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

// ------------------------------------------------------------------ dates

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function monthIndex(name: string): number {
  return MONTHS.indexOf(name.slice(0, 3).toLowerCase());
}

function makeDate(y: number, m: number, d: number): number | null {
  // m is 1-12. Round-trip through Date so 31 Feb etc. are rejected.
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date.getTime();
}

function endOfMonth(y: number, m: number): number | null {
  if (m < 1 || m > 12) return null;
  return new Date(y, m, 0).getTime();
}

/**
 * Reads a date out of a free-text field value. Understands 2027-03-05,
 * 05/03/2027 (day first), 5 Mar 2027, Mar 5, 2027 and month-only forms
 * ("Mar 2027", "03/2027", which mean the END of that month — the usual
 * meaning on a card that says "valid till"). Returns local midnight, or null.
 */
export function parseDateValue(raw: string): number | null {
  const s = raw.trim().replace(/\s+/g, " ");
  if (!s || s.length > 32) return null;
  let m: RegExpMatchArray | null;

  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/))) return makeDate(+m[1], +m[2], +m[3]);
  if ((m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/))) return makeDate(+m[3], +m[2], +m[1]);
  if ((m = s.match(/^(\d{1,2})(?:st|nd|rd|th)? ([A-Za-z]{3,9})\.?,? (\d{4})$/))) {
    const mi = monthIndex(m[2]);
    return mi === -1 ? null : makeDate(+m[3], mi + 1, +m[1]);
  }
  if ((m = s.match(/^([A-Za-z]{3,9})\.? (\d{1,2})(?:st|nd|rd|th)?,? (\d{4})$/))) {
    const mi = monthIndex(m[1]);
    return mi === -1 ? null : makeDate(+m[3], mi + 1, +m[2]);
  }
  if ((m = s.match(/^([A-Za-z]{3,9})\.?,? (\d{4})$/))) {
    const mi = monthIndex(m[1]);
    return mi === -1 ? null : endOfMonth(+m[2], mi + 1);
  }
  if ((m = s.match(/^(\d{1,2})[/-](\d{4})$/))) return endOfMonth(+m[2], +m[1]);
  return null;
}

export type DateRole = "deadline" | "birth" | "past" | "other";

const BIRTH = /\b(dob|birth|born)\b|date of birth/i;
const PAST = /valid\s*from|issue|start|since|purchase|joined|opened|commenc|registration date|reg\.? date/i;
const DEADLINE = /renew|expir|\bexp\b|valid|\bdue\b|matur|lapse|next\b|end date|until|till|deadline|\bby\b/i;

/** What a date field on a card means, judged from its name. */
export function dateRole(key: string): DateRole {
  if (BIRTH.test(key)) return "birth";
  if (PAST.test(key)) return "past";
  if (DEADLINE.test(key)) return "deadline";
  return "other";
}

export type DeadlineStatus = "overdue" | "week" | "month" | "quarter" | "year" | "far";

export function deadlineStatus(days: number): DeadlineStatus {
  if (days < 0) return "overdue";
  if (days <= 7) return "week";
  if (days <= 30) return "month";
  if (days <= 90) return "quarter";
  if (days <= 365) return "year";
  return "far";
}

// ---------------------------------------------------------------- card scoring

export type CardCheck = "fields" | "links" | "notes" | "tags" | "aliases";

export const CHECK_LABEL: Record<CardCheck, string> = {
  fields: "details",
  links: "file links",
  notes: "notes",
  tags: "tags",
  aliases: "search aliases",
};

/** Which checks make sense for each kind of card. A note needs text, not a policy number. */
function applicableChecks(type: CardType): CardCheck[] {
  if (type === "note") return ["notes", "tags", "aliases"];
  if (type === "contact") return ["fields", "tags", "aliases"];
  return ["fields", "links", "tags", "aliases"];
}

export type CardScore = { score: number; missing: CardCheck[] };

export function scoreCard(card: CardWithDetails): CardScore {
  const checks = applicableChecks(card.type);
  const passed: Record<CardCheck, boolean> = {
    fields: card.fields.length > 0,
    links: card.links.length > 0,
    notes: card.notes.trim().length > 0,
    tags: card.tags.length > 0,
    aliases: card.aliases.length > 0,
  };
  const missing = checks.filter((c) => !passed[c]);
  return { score: Math.round(((checks.length - missing.length) / checks.length) * 100), missing };
}

// ------------------------------------------------------------------- report

export type CardRow = {
  id: string;
  title: string;
  type: CardType;
  fields: number;
  secrets: number;
  links: number;
  tags: string[];
  aliases: number;
  hasNotes: boolean;
  created: number;
  updated: number;
  score: number;
  missing: CardCheck[];
};

export type TypeStat = {
  type: CardType;
  count: number;
  fields: number;
  secrets: number;
  links: number;
  avgScore: number;
  withLinks: number;
  items: Item[];
};

export type Counted = { key: string; label: string; count: number; items?: Item[] };

export type DeadlineRow = {
  cardId: string;
  cardTitle: string;
  cardType: CardType;
  key: string;
  at: number;
  days: number;
  status: DeadlineStatus;
};

export type SectionStat = {
  name: string;
  count: number;
  bytes: number;
  eligible: number;
  onDrive: number;
  linked: number;
  unlinked: number;
};

export type Finding = {
  id: string;
  severity: "critical" | "warning" | "info" | "good";
  title: string;
  detail: string;
  count: number;
  items: Item[];
  action?: { label: string; href: string };
};

export type HealthPart = {
  id: string;
  label: string;
  weight: number;
  /** 0-100 */
  score: number;
  detail: string;
};

export type ActivityEvent = {
  at: number;
  kind: "card-created" | "card-updated" | "doc-changed";
  label: string;
  href?: string;
};

export type Report = {
  now: number;
  empty: boolean;
  docsAvailable: boolean;

  totals: {
    cards: number;
    fields: number;
    secretFields: number;
    cardsWithSecrets: number;
    links: number;
    files: number;
    bytes: number;
    trash: number;
    categories: number;
  };

  cards: {
    rows: CardRow[];
    byType: TypeStat[];
    avgScore: number;
    scoreBuckets: { label: string; count: number; items: Item[] }[];
    fieldKeys: Counted[];
    tags: Counted[];
    untagged: Item[];
    noAliases: Item[];
    thin: Item[];
    stale: Item[];
    richest: Item[];
    fieldMix: { plain: number; secret: number };
    linkSources: { drive: number; digilocker: number; other: number };
    linkKinds: { image: number; pdf: number; doc: number; folder: number };
  };

  docs: {
    byTop: SectionStat[];
    byKind: { kind: DocFile["kind"]; count: number; bytes: number }[];
    byExt: { ext: string; count: number; bytes: number }[];
    sizeBuckets: { label: string; count: number; bytes: number; items: Item[] }[];
    byYear: { year: number; count: number }[];
    largest: DocFile[];
    duplicates: { name: string; size: number; files: DocFile[] }[];
    duplicateBytes: number;
    described: number;
    renamed: number;
    needsReview: Item[];
    inbox: Item[];
    orphans: Item[];
  };

  links: {
    total: number;
    local: number;
    remote: number;
    broken: (Item & { cardId: string })[];
    cardsWithout: Item[];
    byType: { type: CardType; cards: number; withLinks: number }[];
    filesPerCard: { label: string; count: number }[];
  };

  backup: {
    configured: boolean;
    connected: boolean;
    email: string | null;
    eligible: number;
    onDrive: number;
    pending: Item[];
    pendingBytes: number;
    excluded: number;
    coverage: number;
  };

  dates: {
    deadlines: DeadlineRow[];
    counts: Record<DeadlineStatus, number>;
    byMonth: { key: string; label: string; count: number; items: Item[] }[];
    missing: Item[];
    other: { cardId: string; cardTitle: string; key: string; at: number; role: DateRole }[];
  };

  trash: {
    cards: number;
    docs: number;
    docBytes: number;
    oldest: number | null;
    stale: number;
  };

  health: { score: number; label: string; parts: HealthPart[] };
  findings: Finding[];
};

const STALE_DAYS = 365;
const TRASH_STALE_DAYS = 30;

function cardItem(c: { id: string; title: string }, sub?: string): Item {
  return { id: c.id, label: c.title, sub, href: `/cards/${c.id}` };
}

function docItem(f: DocFile, sub?: string): Item {
  return { id: f.path, label: f.name, sub: sub ?? f.folder, href: f.url ?? "/documents" };
}

function bump<K>(map: Map<K, number>, key: K, by = 1) {
  map.set(key, (map.get(key) ?? 0) + by);
}

export function healthLabel(score: number) {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Needs attention";
  return "At risk";
}

export function buildReport(cards: CardWithDetails[], docs: DocsContextValue, trash: TrashData, now = Date.now()): Report {
  const files = docs.available ? docs.files : [];
  const docsAvailable = docs.available;

  // ------------------------------------------------------------- card rows
  const rows: CardRow[] = cards.map((c) => {
    const { score, missing } = scoreCard(c);
    return {
      id: c.id,
      title: c.title,
      type: c.type,
      fields: c.fields.length,
      secrets: c.fields.filter((f) => f.isSecret).length,
      links: c.links.length,
      tags: c.tags,
      aliases: c.aliases.length,
      hasNotes: c.notes.trim().length > 0,
      created: ts(c.createdAt),
      updated: ts(c.updatedAt),
      score,
      missing,
    };
  });
  const cardById = new Map(cards.map((c) => [c.id, c]));

  const byTypeMap = new Map<CardType, CardRow[]>();
  for (const r of rows) {
    const list = byTypeMap.get(r.type);
    if (list) list.push(r);
    else byTypeMap.set(r.type, [r]);
  }
  const byType: TypeStat[] = [...byTypeMap.entries()]
    .map(([type, list]) => ({
      type,
      count: list.length,
      fields: sum(list, (r) => r.fields),
      secrets: sum(list, (r) => r.secrets),
      links: sum(list, (r) => r.links),
      avgScore: Math.round(sum(list, (r) => r.score) / list.length),
      withLinks: list.filter((r) => r.links > 0).length,
      items: list.map((r) => cardItem(r, `${r.score}% complete`)),
    }))
    .sort((a, b) => b.count - a.count || collator.compare(a.type, b.type));

  const avgScore = rows.length ? Math.round(sum(rows, (r) => r.score) / rows.length) : 0;

  const bucketDefs = [
    { label: "0–25%", min: 0, max: 25 },
    { label: "26–50%", min: 26, max: 50 },
    { label: "51–75%", min: 51, max: 75 },
    { label: "76–99%", min: 76, max: 99 },
    { label: "Complete", min: 100, max: 100 },
  ];
  const scoreBuckets = bucketDefs.map((b) => {
    const inBucket = rows.filter((r) => r.score >= b.min && r.score <= b.max);
    return {
      label: b.label,
      count: inBucket.length,
      items: inBucket
        .sort((a, b2) => a.score - b2.score || collator.compare(a.title, b2.title))
        .map((r) => cardItem(r, r.missing.length ? `Missing ${r.missing.map((m) => CHECK_LABEL[m]).join(", ")}` : "Nothing missing")),
    };
  });

  // Field names and tags — counted per card, never per value.
  const keyMap = new Map<string, { label: string; cards: Set<string> }>();
  const tagMap = new Map<string, { label: string; cards: Set<string> }>();
  let plainFields = 0;
  let secretFields = 0;
  const linkSources = { drive: 0, digilocker: 0, other: 0 };
  const linkKinds = { image: 0, pdf: 0, doc: 0, folder: 0 };

  for (const c of cards) {
    for (const f of c.fields) {
      if (f.isSecret) secretFields++;
      else plainFields++;
      const k = f.key.trim().toLowerCase();
      if (!k) continue;
      const e = keyMap.get(k) ?? { label: f.key.trim(), cards: new Set<string>() };
      e.cards.add(c.id);
      keyMap.set(k, e);
    }
    for (const t of c.tags) {
      const k = t.trim().toLowerCase();
      if (!k) continue;
      const e = tagMap.get(k) ?? { label: t.trim(), cards: new Set<string>() };
      e.cards.add(c.id);
      tagMap.set(k, e);
    }
    for (const l of c.links) {
      linkSources[l.source]++;
      linkKinds[l.kind]++;
    }
  }
  const counted = (m: Map<string, { label: string; cards: Set<string> }>, limit: number): Counted[] =>
    [...m.entries()]
      .map(([key, e]) => ({
        key,
        label: e.label,
        count: e.cards.size,
        items: [...e.cards].map((id) => cardItem(cardById.get(id)!)),
      }))
      .sort((a, b) => b.count - a.count || collator.compare(a.label, b.label))
      .slice(0, limit);

  const staleCut = now - STALE_DAYS * DAY;
  const staleRows = rows.filter((r) => r.updated < staleCut && r.type !== "note").sort((a, b) => a.updated - b.updated);
  const thinRows = rows.filter((r) => r.score < 50).sort((a, b) => a.score - b.score || collator.compare(a.title, b.title));
  const richest = [...rows].sort((a, b) => b.fields + b.links - (a.fields + a.links) || collator.compare(a.title, b.title)).slice(0, 8);

  const cardsBlock: Report["cards"] = {
    rows,
    byType,
    avgScore,
    scoreBuckets,
    fieldKeys: counted(keyMap, 14),
    tags: counted(tagMap, 20),
    untagged: rows.filter((r) => r.tags.length === 0).map((r) => cardItem(r)),
    noAliases: rows.filter((r) => r.aliases === 0).map((r) => cardItem(r)),
    thin: thinRows.map((r) => cardItem(r, `${r.score}% · missing ${r.missing.map((m) => CHECK_LABEL[m]).join(", ")}`)),
    stale: staleRows.map((r) => cardItem(r, `Not updated in ${Math.floor((now - r.updated) / DAY)} days`)),
    richest: richest.map((r) => cardItem(r, `${r.fields} details · ${r.links} files`)),
    fieldMix: { plain: plainFields, secret: secretFields },
    linkSources,
    linkKinds,
  };

  // -------------------------------------------------------- links & backup
  const cardsByFile = new Map<string, Set<string>>();
  const broken: Report["links"]["broken"] = [];
  const filePaths = new Set(files.map((f) => f.path));
  let localLinks = 0;
  let remoteLinks = 0;
  for (const c of cards) {
    for (const l of c.links) {
      const rel = relPathFromFileUrl(l.url);
      if (rel === null) {
        remoteLinks++;
        continue;
      }
      localLinks++;
      const set = cardsByFile.get(rel) ?? new Set<string>();
      set.add(c.id);
      cardsByFile.set(rel, set);
      if (docsAvailable && !filePaths.has(rel)) {
        broken.push({ id: `${c.id}:${l.id}`, cardId: c.id, label: l.label || rel, sub: `on “${c.title}” → ${rel}`, href: `/cards/${c.id}` });
      }
    }
  }

  const linkExpected = (t: CardType) => t !== "note" && t !== "contact";
  const filesPerCardMap = new Map<number, number>();
  for (const c of cards) bump(filesPerCardMap, Math.min(c.links.length, 4));
  const filesPerCard = [0, 1, 2, 3, 4].map((n) => ({
    label: n === 4 ? "4 or more" : n === 0 ? "None" : `${n} file${n > 1 ? "s" : ""}`,
    count: filesPerCardMap.get(n) ?? 0,
  }));

  const linksBlock: Report["links"] = {
    total: localLinks + remoteLinks,
    local: localLinks,
    remote: remoteLinks,
    broken,
    cardsWithout: rows.filter((r) => r.links === 0 && linkExpected(r.type)).map((r) => cardItem(r)),
    byType: byType
      .filter((t) => linkExpected(t.type))
      .map((t) => ({ type: t.type, cards: t.count, withLinks: t.withLinks })),
    filesPerCard,
  };

  // Documents ----------------------------------------------------------------
  const eligibleFiles = files.filter((f) => isDriveEligiblePath(f.path));
  const onDriveFiles = eligibleFiles.filter((f) => docs.uploads[f.path]);
  const pendingFiles = eligibleFiles.filter((f) => !docs.uploads[f.path]);
  const orphanFiles = eligibleFiles.filter((f) => !cardsByFile.has(f.path));

  const sections = new Map<string, SectionStat>();
  for (const f of files) {
    const top = f.top || "(loose files)";
    const s = sections.get(top) ?? { name: top, count: 0, bytes: 0, eligible: 0, onDrive: 0, linked: 0, unlinked: 0 };
    s.count++;
    s.bytes += f.size;
    if (isDriveEligiblePath(f.path)) {
      s.eligible++;
      if (docs.uploads[f.path]) s.onDrive++;
      if (cardsByFile.has(f.path)) s.linked++;
      else s.unlinked++;
    }
    sections.set(top, s);
  }
  const byTop = [...sections.values()].sort((a, b) => b.count - a.count || collator.compare(a.name, b.name));

  const kindMap = new Map<DocFile["kind"], { count: number; bytes: number }>();
  const extMap = new Map<string, { count: number; bytes: number }>();
  for (const f of files) {
    const k = kindMap.get(f.kind) ?? { count: 0, bytes: 0 };
    k.count++;
    k.bytes += f.size;
    kindMap.set(f.kind, k);
    const ext = (f.ext || "(none)").toLowerCase().replace(/^\./, "");
    const e = extMap.get(ext) ?? { count: 0, bytes: 0 };
    e.count++;
    e.bytes += f.size;
    extMap.set(ext, e);
  }

  const bucketsBySize = [
    { label: "Under 100 KB", max: 100 * 1024 },
    { label: "100 KB – 1 MB", max: 1024 * 1024 },
    { label: "1 – 5 MB", max: 5 * 1024 * 1024 },
    { label: "Over 5 MB", max: Infinity },
  ];
  const sizeBuckets = bucketsBySize.map((b, i) => {
    const min = i === 0 ? -1 : bucketsBySize[i - 1].max;
    const inB = files.filter((f) => f.size > min && f.size <= b.max);
    return {
      label: b.label,
      count: inB.length,
      bytes: sum(inB, (f) => f.size),
      items: [...inB].sort((a, b2) => b2.size - a.size).map((f) => docItem(f, `${formatBytes(f.size)} · ${f.folder}`)),
    };
  });

  const yearMap = new Map<number, number>();
  for (const f of files) bump(yearMap, new Date(f.modified).getFullYear());
  const years = [...yearMap.keys()];
  const byYear: { year: number; count: number }[] = [];
  if (years.length) {
    for (let y = Math.min(...years); y <= Math.max(...years); y++) byYear.push({ year: y, count: yearMap.get(y) ?? 0 });
  }

  const dupMap = new Map<string, DocFile[]>();
  for (const f of files) {
    if (f.size <= 0) continue;
    const key = `${f.name.toLowerCase()}|${f.size}`;
    const list = dupMap.get(key);
    if (list) list.push(f);
    else dupMap.set(key, [f]);
  }
  const duplicates = [...dupMap.values()]
    .filter((g) => g.length > 1)
    .map((g) => ({ name: g[0].name, size: g[0].size, files: g }))
    .sort((a, b) => b.size * (b.files.length - 1) - a.size * (a.files.length - 1));
  const duplicateBytes = sum(duplicates, (d) => d.size * (d.files.length - 1));

  const docsBlock: Report["docs"] = {
    byTop,
    byKind: [...kindMap.entries()].map(([kind, v]) => ({ kind, ...v })).sort((a, b) => b.count - a.count),
    byExt: [...extMap.entries()]
      .map(([ext, v]) => ({ ext, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    sizeBuckets,
    byYear,
    largest: [...files].sort((a, b) => b.size - a.size).slice(0, 10),
    duplicates,
    duplicateBytes,
    described: files.filter((f) => f.description.trim()).length,
    renamed: files.filter((f) => f.original).length,
    needsReview: files.filter((f) => f.top === "Needs Review").map((f) => docItem(f)),
    inbox: files.filter((f) => f.top === "Inbox").map((f) => docItem(f)),
    orphans: orphanFiles.map((f) => docItem(f)),
  };

  const backup: Report["backup"] = {
    configured: docs.drive.configured,
    connected: docs.drive.connected,
    email: docs.drive.email,
    eligible: eligibleFiles.length,
    onDrive: onDriveFiles.length,
    pending: pendingFiles.map((f) => docItem(f, `${formatBytes(f.size)} · ${f.folder}`)),
    pendingBytes: sum(pendingFiles, (f) => f.size),
    excluded: files.length - eligibleFiles.length,
    coverage: eligibleFiles.length ? Math.round((onDriveFiles.length / eligibleFiles.length) * 100) : 0,
  };

  // ---------------------------------------------------------------- dates
  const deadlines: DeadlineRow[] = [];
  const otherDates: Report["dates"]["other"] = [];
  const today = startOfDay(now);
  const withDeadline = new Set<string>();
  for (const c of cards) {
    for (const f of c.fields) {
      if (f.isSecret) continue; // secret values are never read
      const at = parseDateValue(f.value);
      if (at === null) continue;
      const role = dateRole(f.key);
      if (role === "deadline") {
        const days = Math.round((at - today) / DAY);
        deadlines.push({ cardId: c.id, cardTitle: c.title, cardType: c.type, key: f.key, at, days, status: deadlineStatus(days) });
        withDeadline.add(c.id);
      } else {
        otherDates.push({ cardId: c.id, cardTitle: c.title, key: f.key, at, role });
      }
    }
  }
  deadlines.sort((a, b) => a.at - b.at);
  const deadlineCounts: Record<DeadlineStatus, number> = { overdue: 0, week: 0, month: 0, quarter: 0, year: 0, far: 0 };
  for (const d of deadlines) deadlineCounts[d.status]++;

  // Next 12 months (this month + 11), overdue items are shown separately.
  const months: Report["dates"]["byMonth"] = [];
  const startMonth = new Date(now);
  for (let i = 0; i < 12; i++) {
    const d = new Date(startMonth.getFullYear(), startMonth.getMonth() + i, 1);
    months.push({ key: monthKey(d), label: d.toLocaleString("en", { month: "short", year: i === 0 || d.getMonth() === 0 ? "2-digit" : undefined }), count: 0, items: [] });
  }
  for (const d of deadlines) {
    if (d.days < 0) continue;
    const m = months.find((x) => x.key === monthKey(new Date(d.at)));
    if (m) {
      m.count++;
      m.items.push({ id: `${d.cardId}:${d.key}`, label: d.cardTitle, sub: `${d.key} · ${formatDay(d.at)}`, href: `/cards/${d.cardId}` });
    }
  }

  // Cards that normally carry a renewal date but have none recorded.
  const expectsDate = (t: CardType) => t === "insurance" || t === "vehicle";
  const missingDates = rows
    .filter((r) => expectsDate(r.type) && !withDeadline.has(r.id))
    .map((r) => cardItem(r, `${r.type === "insurance" ? "Insurance" : "Vehicle"} with no renewal or expiry date`));

  // ---------------------------------------------------------------- trash
  const trashedAt = [...trash.cards.map((c) => ts(c.deletedAt)), ...trash.docs.map((d) => ts(d.trashedAt))];
  const trashCut = now - TRASH_STALE_DAYS * DAY;
  const trashBlock: Report["trash"] = {
    cards: trash.cards.length,
    docs: trash.docs.length,
    docBytes: sum(trash.docs, (d) => d.size),
    oldest: trashedAt.length ? Math.min(...trashedAt) : null,
    stale: trashedAt.filter((t) => t < trashCut).length,
  };

  // --------------------------------------------------------------- report
  const report: Report = {
    now,
    empty: cards.length === 0 && files.length === 0,
    docsAvailable,
    totals: {
      cards: cards.length,
      fields: plainFields + secretFields,
      secretFields,
      cardsWithSecrets: rows.filter((r) => r.secrets > 0).length,
      links: linksBlock.total,
      files: files.length,
      bytes: sum(files, (f) => f.size),
      trash: trashBlock.cards + trashBlock.docs,
      categories: byType.length,
    },
    cards: cardsBlock,
    docs: docsBlock,
    links: linksBlock,
    backup,
    dates: { deadlines, counts: deadlineCounts, byMonth: months, missing: missingDates, other: otherDates },
    trash: trashBlock,
    health: { score: 0, label: "", parts: [] },
    findings: [],
  };

  report.health = buildHealth(report);
  report.findings = buildFindings(report);
  return report;
}

// ------------------------------------------------------------------- health

function buildHealth(r: Report): Report["health"] {
  const parts: HealthPart[] = [];

  if (r.totals.cards > 0) {
    parts.push({
      id: "completeness",
      label: "Card completeness",
      weight: 25,
      score: r.cards.avgScore,
      detail: `Cards have ${r.cards.avgScore}% of the details, links, tags and aliases they should.`,
    });
    const active = r.cards.rows.filter((c) => c.type !== "note");
    if (active.length) {
      const fresh = active.filter((c) => c.updated >= r.now - STALE_DAYS * DAY).length;
      parts.push({
        id: "freshness",
        label: "Freshness",
        weight: 5,
        score: Math.round((fresh / active.length) * 100),
        detail: `${fresh} of ${active.length} cards were touched in the last year.`,
      });
    }
  }

  const dated = r.dates.deadlines.length;
  if (dated > 0) {
    const overdue = r.dates.counts.overdue;
    const soon = r.dates.counts.week + r.dates.counts.month;
    // Each overdue date costs 40 points, each one due within a month costs 10.
    const score = Math.max(0, 100 - overdue * 40 - soon * 10);
    parts.push({
      id: "deadlines",
      label: "Renewals & expiries",
      weight: 15,
      score,
      detail: overdue
        ? `${overdue} date${overdue > 1 ? "s are" : " is"} already past.`
        : soon
          ? `${soon} date${soon > 1 ? "s" : ""} fall due within 30 days.`
          : "Nothing is overdue or due within 30 days.",
    });
  }

  if (r.docsAvailable && r.backup.eligible > 0) {
    const linked = r.backup.eligible - r.docs.orphans.length;
    parts.push({
      id: "linking",
      label: "Files linked to cards",
      weight: 15,
      score: Math.round((linked / r.backup.eligible) * 100),
      detail: `${linked} of ${r.backup.eligible} personal files are attached to a card.`,
    });
    parts.push({
      id: "backup",
      label: "Backed up to Drive",
      weight: 20,
      score: r.backup.coverage,
      detail: r.backup.connected
        ? `${r.backup.onDrive} of ${r.backup.eligible} files are on Google Drive.`
        : "Google Drive isn't connected, so nothing is backed up off this computer.",
    });
    const unfiled = r.docs.needsReview.length + r.docs.inbox.length;
    parts.push({
      id: "filing",
      label: "Filing",
      weight: 10,
      score: Math.max(0, 100 - Math.round((unfiled / Math.max(1, r.totals.files)) * 300)),
      detail: unfiled ? `${unfiled} file${unfiled > 1 ? "s are" : " is"} in Inbox or Needs Review.` : "Everything is filed.",
    });
  }

  if (r.links.total > 0 && r.docsAvailable) {
    parts.push({
      id: "integrity",
      label: "Link integrity",
      weight: 10,
      score: Math.round(((r.links.total - r.links.broken.length) / r.links.total) * 100),
      detail: r.links.broken.length ? `${r.links.broken.length} card link${r.links.broken.length > 1 ? "s point" : " points"} at a missing file.` : "Every file link resolves.",
    });
  }

  const totalWeight = sum(parts, (p) => p.weight);
  const score = totalWeight ? Math.round(sum(parts, (p) => p.score * p.weight) / totalWeight) : 0;
  return { score, label: r.empty ? "No data yet" : healthLabel(score), parts };
}

// ----------------------------------------------------------------- findings

const SEVERITY_RANK = { critical: 0, warning: 1, info: 2, good: 3 } as const;

function buildFindings(r: Report): Finding[] {
  const out: Finding[] = [];
  const add = (f: Finding) => {
    if (f.count > 0 || f.severity === "good") out.push(f);
  };
  const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;
  const dl = (rows: DeadlineRow[]): Item[] =>
    rows.map((d) => ({
      id: `${d.cardId}:${d.key}`,
      label: d.cardTitle,
      sub: `${d.key} · ${formatDay(d.at)} · ${d.days < 0 ? `${-d.days} days ago` : d.days === 0 ? "today" : `in ${d.days} days`}`,
      href: `/cards/${d.cardId}`,
    }));

  const overdue = r.dates.deadlines.filter((d) => d.status === "overdue");
  add({
    id: "overdue",
    severity: "critical",
    title: `${plural(overdue.length, "date")} already past`,
    detail: "A renewal, expiry or due date on these cards is behind you. Renew it, or update the date if it's already done.",
    count: overdue.length,
    items: dl(overdue),
  });

  const broken = r.links.broken;
  add({
    id: "broken-links",
    severity: "critical",
    title: `${plural(broken.length, "card link")} point at a missing file`,
    detail: "The file was moved, renamed or deleted after it was linked. Open the card and re-link it.",
    count: broken.length,
    items: broken,
  });

  const soon = r.dates.deadlines.filter((d) => d.status === "week" || d.status === "month");
  add({
    id: "due-soon",
    severity: "warning",
    title: `${plural(soon.length, "date")} due within 30 days`,
    detail: "Start these now — most renewals take a few days.",
    count: soon.length,
    items: dl(soon),
  });

  if (r.docsAvailable && r.backup.eligible > 0) {
    if (!r.backup.connected) {
      add({
        id: "no-backup",
        severity: "warning",
        title: "Nothing is backed up off this computer",
        detail: `${plural(r.backup.eligible, "personal file")} live only in the docs folder. Connect Google Drive to keep a copy.`,
        count: r.backup.eligible,
        items: r.backup.pending.slice(0, 200),
        action: { label: "Open Documents", href: "/documents" },
      });
    } else if (r.backup.pending.length > 0) {
      add({
        id: "backup-pending",
        severity: r.backup.pending.length / r.backup.eligible > 0.25 ? "warning" : "info",
        title: `${plural(r.backup.pending.length, "file")} not on Drive yet`,
        detail: `${formatBytes(r.backup.pendingBytes)} still to upload.`,
        count: r.backup.pending.length,
        items: r.backup.pending,
        action: { label: "Open Documents", href: "/documents" },
      });
    }
  }

  add({
    id: "needs-review",
    severity: "warning",
    title: `${plural(r.docs.needsReview.length, "file")} waiting in Needs Review`,
    detail: "Duplicates, other people's papers and sensitive items that are waiting for your decision.",
    count: r.docs.needsReview.length,
    items: r.docs.needsReview,
  });

  add({
    id: "duplicates",
    severity: "warning",
    title: `${plural(r.docs.duplicates.length, "set")} of duplicate files`,
    detail: `Same name and size in more than one place — about ${formatBytes(r.docs.duplicateBytes)} that could be reclaimed.`,
    count: r.docs.duplicates.length,
    items: r.docs.duplicates.flatMap((d) => d.files.map((f) => docItem(f, `${formatBytes(f.size)} · ${f.folder}`))),
  });

  add({
    id: "inbox",
    severity: "info",
    title: `${plural(r.docs.inbox.length, "file")} in the Inbox`,
    detail: "New files that haven't been sorted into a folder yet.",
    count: r.docs.inbox.length,
    items: r.docs.inbox,
  });

  const orphanShare = r.backup.eligible ? r.docs.orphans.length / r.backup.eligible : 0;
  add({
    id: "orphans",
    severity: orphanShare > 0.4 ? "warning" : "info",
    title: `${plural(r.docs.orphans.length, "file")} not attached to any card`,
    detail: "You can find these in the folder tree, but not by searching for a card. Attach them to the right card so they show up.",
    count: r.docs.orphans.length,
    items: r.docs.orphans,
  });

  add({
    id: "no-links",
    severity: "info",
    title: `${plural(r.links.cardsWithout.length, "card")} with no file attached`,
    detail: "ID, bank, insurance and similar cards usually have a scan or PDF behind them.",
    count: r.links.cardsWithout.length,
    items: r.links.cardsWithout,
  });

  add({
    id: "missing-dates",
    severity: "info",
    title: `${plural(r.dates.missing.length, "card")} with no renewal date`,
    detail: "Add a field such as “Renews” or “Valid till” (e.g. 2027-03-05) so Reports can warn you ahead of time.",
    count: r.dates.missing.length,
    items: r.dates.missing,
  });

  add({
    id: "thin",
    severity: "info",
    title: `${plural(r.cards.thin.length, "card")} less than half complete`,
    detail: "Missing details, files, tags or search aliases — these are the hardest ones to find later.",
    count: r.cards.thin.length,
    items: r.cards.thin,
  });

  add({
    id: "stale",
    severity: "info",
    title: `${plural(r.cards.stale.length, "card")} untouched for over a year`,
    detail: "Worth a quick check that the details are still right.",
    count: r.cards.stale.length,
    items: r.cards.stale,
  });

  const nearly = r.dates.deadlines.filter((d) => d.status === "quarter");
  add({
    id: "due-quarter",
    severity: "info",
    title: `${plural(nearly.length, "date")} due in 30–90 days`,
    detail: "Coming up next quarter.",
    count: nearly.length,
    items: dl(nearly),
  });

  if (r.trash.stale > 0) {
    add({
      id: "trash",
      severity: "info",
      title: `${plural(r.trash.stale, "item")} in the Trash for over 30 days`,
      detail: "Empty the Trash if you're sure — otherwise restore what you still need.",
      count: r.trash.stale,
      items: [],
      action: { label: "Open Trash", href: "/trash" },
    });
  }

  const serious = out.some((f) => f.severity === "critical" || f.severity === "warning");
  if (!r.empty && !serious) {
    add({
      id: "all-good",
      severity: "good",
      title: "No urgent problems",
      detail: "Nothing is overdue, missing or unbacked-up. Anything below is just tidying.",
      count: 0,
      items: [],
    });
  }
  if (r.empty) {
    add({
      id: "empty",
      severity: "info",
      title: "Nothing to analyse yet",
      detail: "Add a few cards and drop your files into the docs folder — this page fills in on its own.",
      count: 1,
      items: [],
      action: { label: "New card", href: "/cards/new" },
    });
  }

  return out.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.count - a.count);
}

// ----------------------------------------------------------------- activity

export type ActivityRange = 3 | 6 | 12 | 24 | 0; // months; 0 = everything

export type Activity = {
  months: { key: string; label: string; created: number; updated: number; docs: number; cumulative: number }[];
  heat: { weeks: ({ at: number; count: number } | null)[][]; max: number };
  weekdays: { label: string; count: number }[];
  compare: { label: string; now: number; before: number }[];
  recent: ActivityEvent[];
  total: number;
};

export function collectEvents(cards: CardWithDetails[], docs: DocsContextValue): ActivityEvent[] {
  const events: ActivityEvent[] = [];
  for (const c of cards) {
    const created = ts(c.createdAt);
    const updated = ts(c.updatedAt);
    events.push({ at: created, kind: "card-created", label: c.title, href: `/cards/${c.id}` });
    // Saving right after creating isn't an "edit".
    if (updated - created > 60_000) events.push({ at: updated, kind: "card-updated", label: c.title, href: `/cards/${c.id}` });
  }
  if (docs.available) {
    for (const f of docs.files) events.push({ at: f.modified, kind: "doc-changed", label: f.name, href: f.url ?? "/documents" });
  }
  return events;
}

export function buildActivity(events: ActivityEvent[], cards: CardWithDetails[], range: ActivityRange, now = Date.now()): Activity {
  const nowDate = new Date(now);
  const earliest = events.length ? Math.min(...events.map((e) => e.at)) : now;
  let span: number = range;
  if (range === 0) {
    const e = new Date(earliest);
    span = Math.min(60, Math.max(3, (nowDate.getFullYear() - e.getFullYear()) * 12 + nowDate.getMonth() - e.getMonth() + 1));
  }

  const months: Activity["months"] = [];
  for (let i = span - 1; i >= 0; i--) {
    const d = new Date(nowDate.getFullYear(), nowDate.getMonth() - i, 1);
    months.push({
      key: monthKey(d),
      label: d.toLocaleString("en", { month: "short", year: span > 12 && (d.getMonth() === 0 || i === span - 1) ? "2-digit" : undefined }),
      created: 0,
      updated: 0,
      docs: 0,
      cumulative: 0,
    });
  }
  const byKey = new Map(months.map((m) => [m.key, m]));
  const firstKey = months[0].key;
  for (const e of events) {
    const m = byKey.get(monthKey(new Date(e.at)));
    if (!m) continue;
    if (e.kind === "card-created") m.created++;
    else if (e.kind === "card-updated") m.updated++;
    else m.docs++;
  }
  // Cumulative card count = cards created before the window + created so far inside it.
  let running = cards.filter((c) => monthKey(new Date(c.createdAt)) < firstKey).length;
  for (const m of months) {
    running += m.created;
    m.cumulative = running;
  }

  // Heatmap: 53 weeks ending this week, Monday first.
  const today = startOfDay(now);
  const dow = (new Date(today).getDay() + 6) % 7; // Mon = 0
  const gridStart = today - dow * DAY - 52 * 7 * DAY;
  const perDay = new Map<number, number>();
  for (const e of events) bump(perDay, startOfDay(e.at));
  const weeks: Activity["heat"]["weeks"] = [];
  let max = 0;
  for (let w = 0; w < 53; w++) {
    const week: ({ at: number; count: number } | null)[] = [];
    for (let d = 0; d < 7; d++) {
      const at = startOfDay(gridStart + (w * 7 + d) * DAY + DAY / 2);
      if (at > today) {
        week.push(null);
        continue;
      }
      const count = perDay.get(at) ?? 0;
      max = Math.max(max, count);
      week.push({ at, count });
    }
    weeks.push(week);
  }

  const wd = [0, 0, 0, 0, 0, 0, 0];
  for (const e of events) wd[(new Date(e.at).getDay() + 6) % 7]++;

  const within = (kind: ActivityEvent["kind"], from: number, to: number) =>
    events.filter((e) => e.kind === kind && e.at >= from && e.at < to).length;
  const t30 = now - 30 * DAY;
  const t60 = now - 60 * DAY;
  const compare = [
    { label: "Cards added", now: within("card-created", t30, now + 1), before: within("card-created", t60, t30) },
    { label: "Cards edited", now: within("card-updated", t30, now + 1), before: within("card-updated", t60, t30) },
    { label: "Files added or changed", now: within("doc-changed", t30, now + 1), before: within("doc-changed", t60, t30) },
  ];

  return {
    months,
    heat: { weeks, max },
    weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label, i) => ({ label, count: wd[i] })),
    compare,
    recent: [...events].sort((a, b) => b.at - a.at).slice(0, 15),
    total: events.length,
  };
}

// ------------------------------------------------------------------ helpers

function sum<T>(list: T[], f: (x: T) => number) {
  let n = 0;
  for (const x of list) n += f(x);
  return n;
}

export function startOfDay(t: number) {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatDay(t: number) {
  return new Date(t).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" });
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1000 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
