import type { CardType } from "@/db/schema";
import type { CardWithDetails } from "@/lib/cards";
import { CARD_TYPE_META } from "@/lib/card-types";
import { DOC_TOP_ORDER, type DocFile, type DocsContextValue } from "@/lib/docs-types";

// The data behind the Recents page: everything that was added or changed, as one
// list that can be searched, filtered, sorted and grouped by day. Pure functions,
// no I/O — safe on the client.
//
// What the app actually knows: when each card was created and last saved, and
// when each file was last modified. It does not keep older edits, so a card
// shows up at most twice (once as "Added", once as "Edited").

export type HistoryKind = "added" | "edited" | "file";

export type HistoryItem = {
  id: string;
  kind: HistoryKind;
  /** ms since epoch */
  at: number;
  title: string;
  /** "card:<type>" or "file:<top folder>" — what the Filter menu matches. */
  groupKey: string;
  /** Human label for the row's category / section. */
  group: string;
  /** Second line under the title. */
  detail: string;
  href: string;
  /** Files open in a new tab; cards navigate inside the app. */
  external: boolean;
  cardType?: CardType;
  fileKind?: DocFile["kind"];
};

export const KIND_LABEL: Record<HistoryKind, string> = {
  added: "Card added",
  edited: "Card edited",
  file: "File changed",
};

const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

/** A save within this long of creating a card is the creation itself, not an edit. */
const EDIT_GRACE_MS = 60_000;

export function buildHistory(cards: CardWithDetails[], docs: DocsContextValue): HistoryItem[] {
  const items: HistoryItem[] = [];

  for (const c of cards) {
    const created = new Date(c.createdAt).getTime();
    const updated = new Date(c.updatedAt).getTime();
    const detail = `${c.fields.length} ${c.fields.length === 1 ? "detail" : "details"} · ${c.links.length} ${c.links.length === 1 ? "file" : "files"}`;
    const base = {
      title: c.title,
      groupKey: `card:${c.type}`,
      group: CARD_TYPE_META[c.type].label,
      detail,
      href: `/cards/${c.id}`,
      external: false,
      cardType: c.type,
    };
    items.push({ ...base, id: `added:${c.id}`, kind: "added", at: created });
    if (updated - created > EDIT_GRACE_MS) items.push({ ...base, id: `edited:${c.id}`, kind: "edited", at: updated });
  }

  if (docs.available) {
    for (const f of docs.files) {
      items.push({
        id: `file:${f.path}`,
        kind: "file",
        at: f.modified,
        title: f.name,
        groupKey: `file:${f.top || "(loose files)"}`,
        group: f.top || "(loose files)",
        detail: f.folder,
        href: f.url ?? "/documents",
        external: Boolean(f.url),
        fileKind: f.kind,
      });
    }
  }
  return items;
}

// ------------------------------------------------------------------ filtering

export type ShowFilter = "all" | HistoryKind;
export type RangeFilter = "all" | "1" | "7" | "30" | "90" | "365";
export type SortMode = "newest" | "oldest" | "name-asc" | "name-desc" | "category";

export type HistoryQuery = {
  q: string;
  show: ShowFilter;
  /** "" = everything, otherwise a groupKey */
  group: string;
  range: RangeFilter;
  sort: SortMode;
};

export const DEFAULT_QUERY: HistoryQuery = { q: "", show: "all", group: "", range: "all", sort: "newest" };

export const RANGE_LABEL: Record<RangeFilter, string> = {
  all: "Any time",
  "1": "Last 24 hours",
  "7": "Last 7 days",
  "30": "Last 30 days",
  "90": "Last 90 days",
  "365": "Last year",
};

export const SORT_LABEL: Record<SortMode, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  "name-asc": "Name A–Z",
  "name-desc": "Name Z–A",
  category: "Category",
};

export function isFiltered(q: HistoryQuery) {
  return q.q.trim() !== "" || q.show !== "all" || q.group !== "" || q.range !== "all";
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Search + Filter + date range (everything except "Show" and sorting). */
export function matchHistory(items: HistoryItem[], q: HistoryQuery, now: number): HistoryItem[] {
  const tokens = norm(q.q).split(/\s+/).filter(Boolean);
  const from = q.range === "all" ? -Infinity : now - Number(q.range) * 86_400_000;
  return items.filter((i) => {
    if (i.at < from) return false;
    if (q.group && i.groupKey !== q.group) return false;
    if (tokens.length === 0) return true;
    const hay = norm(`${i.title} ${i.group} ${i.detail} ${KIND_LABEL[i.kind]}`);
    return tokens.every((t) => hay.includes(t));
  });
}

export function sortHistory(items: HistoryItem[], sort: SortMode): HistoryItem[] {
  const out = [...items];
  const byTitle = (a: HistoryItem, b: HistoryItem) => collator.compare(a.title, b.title);
  switch (sort) {
    case "oldest":
      return out.sort((a, b) => a.at - b.at || byTitle(a, b));
    case "name-asc":
      return out.sort((a, b) => byTitle(a, b) || b.at - a.at);
    case "name-desc":
      return out.sort((a, b) => byTitle(b, a) || b.at - a.at);
    case "category":
      return out.sort((a, b) => collator.compare(a.group, b.group) || b.at - a.at);
    default:
      return out.sort((a, b) => b.at - a.at || byTitle(a, b));
  }
}

/** Runs the whole query. `counts` are the per-kind totals BEFORE the "Show" filter, for the tab badges. */
export function queryHistory(items: HistoryItem[], q: HistoryQuery, now: number) {
  const matched = matchHistory(items, q, now);
  const counts: Record<ShowFilter, number> = { all: matched.length, added: 0, edited: 0, file: 0 };
  for (const i of matched) counts[i.kind]++;
  const shown = q.show === "all" ? matched : matched.filter((i) => i.kind === q.show);
  return { rows: sortHistory(shown, q.sort), counts };
}

// ------------------------------------------------------------ filter options

export type GroupOption = { key: string; label: string; count: number };

/** The choices in the Filter menu: card categories, then file sections. */
export function groupOptions(items: HistoryItem[]): { cards: GroupOption[]; files: GroupOption[] } {
  const cards = new Map<string, GroupOption>();
  const files = new Map<string, GroupOption>();
  for (const i of items) {
    const target = i.kind === "file" ? files : cards;
    const label = i.kind === "file" ? i.group : i.cardType ? CARD_TYPE_META[i.cardType].plural : i.group;
    const seen = target.get(i.groupKey) ?? { key: i.groupKey, label, count: 0 };
    seen.count++;
    target.set(i.groupKey, seen);
  }
  const rank = (label: string) => {
    const n = (DOC_TOP_ORDER as readonly string[]).indexOf(label);
    return n === -1 ? DOC_TOP_ORDER.length : n;
  };
  return {
    cards: [...cards.values()].sort((a, b) => collator.compare(a.label, b.label)),
    files: [...files.values()].sort((a, b) => rank(a.label) - rank(b.label) || collator.compare(a.label, b.label)),
  };
}

// ------------------------------------------------------------------ grouping

const startOfDay = (t: number) => {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

/** The heading a row sits under when the list is ordered by date. */
export function dayBucket(at: number, now: number): string {
  const days = Math.round((startOfDay(now) - startOfDay(at)) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return "Earlier this week";
  if (days < 30) return "Last 30 days";
  return new Date(at).toLocaleString("en", { month: "long", year: "numeric" });
}
