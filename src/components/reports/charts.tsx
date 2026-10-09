"use client";

import * as React from "react";
import { ChevronDown, CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { AppLink } from "@/components/shell/app-link";
import type { Item } from "@/lib/analytics";
import { cn } from "@/lib/utils";

// Small, dependency-free chart primitives for the Reports page. Every chart is
// plain HTML/SVG coloured with the --viz-* tokens (see globals.css), carries a
// hover tooltip, and has a screen-reader table so no value lives in colour alone.

export const SERIES = ["var(--viz-1)", "var(--viz-2)", "var(--viz-3)", "var(--viz-4)", "var(--viz-5)"];

/** "charts" draws the graphics; "tables" swaps every one of them for the same numbers in a table. */
export type ViewMode = "charts" | "tables";
export const ViewModeContext = React.createContext<ViewMode>("charts");
const useViewMode = () => React.useContext(ViewModeContext);

/** A row label that opens the drill-down when the row has items behind it. */
function DrillLabel({ label, active, onClick }: { label: string; active: boolean; onClick?: () => void }) {
  if (!onClick) return <>{label}</>;
  return (
    <button
      type="button"
      aria-pressed={active}
      title="Show what's behind this"
      onClick={onClick}
      className={cn("text-left font-medium underline-offset-2 hover:text-primary hover:underline", active && "text-primary underline")}
    >
      {label}
    </button>
  );
}

/** Rounds an axis maximum up to a clean number (1, 2, 5, 10, 20, 50 …). */
export function niceMax(max: number) {
  if (max <= 4) return Math.max(4, Math.ceil(max));
  const pow = 10 ** Math.floor(Math.log10(max));
  for (const step of [1, 2, 2.5, 5, 10]) if (step * pow >= max) return step * pow;
  return 10 * pow;
}

const nf = new Intl.NumberFormat("en");
export const fmt = (n: number) => nf.format(n);
export const pct = (n: number, of: number) => (of > 0 ? Math.round((n / of) * 100) : 0);

// ------------------------------------------------------------------ layout

export function Panel({
  title,
  description,
  actions,
  className,
  children,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("min-w-0 rounded-2xl border bg-card p-5 shadow-xs", className)}>
      {(title || actions) && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h3 className="text-[15px] font-medium leading-tight">{title}</h3>}
            {description && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">{children}</p>;
}

export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  delta,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  delta?: { now: number; before: number; upIsGood?: boolean };
}) {
  return (
    <div className="min-w-0 rounded-2xl border bg-card p-4 shadow-xs">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {Icon && <Icon className="size-3.5 shrink-0" />}
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight">{value}</span>
        {delta && <Delta {...delta} />}
      </div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

/** Change against the previous period. Colour follows direction × whether up is good. */
export function Delta({ now, before, upIsGood = true }: { now: number; before: number; upIsGood?: boolean }) {
  const diff = now - before;
  if (diff === 0) return <span className="text-xs text-muted-foreground">no change</span>;
  const good = diff > 0 === upIsGood;
  return (
    <span className="text-xs font-medium" style={{ color: good ? "var(--viz-good-ink)" : "var(--viz-crit)" }}>
      {diff > 0 ? "▲" : "▼"} {fmt(Math.abs(diff))} <span className="font-normal text-muted-foreground">vs prior</span>
    </span>
  );
}

// ---------------------------------------------------------------- severity

export type Severity = "critical" | "warning" | "info" | "good";

const SEVERITY_META: Record<Severity, { label: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; color: string }> = {
  critical: { label: "Act now", icon: CircleAlert, color: "var(--viz-crit)" },
  warning: { label: "Soon", icon: TriangleAlert, color: "var(--viz-warn)" },
  info: { label: "Tidy up", icon: Info, color: "var(--viz-1)" },
  good: { label: "All clear", icon: CircleCheck, color: "var(--viz-good)" },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const { label, icon: Icon, color } = SEVERITY_META[severity];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      <Icon className="size-4" style={{ color }} />
      {label}
    </span>
  );
}

export function scoreColor(score: number) {
  if (score >= 70) return "var(--viz-good)";
  if (score >= 50) return "var(--viz-warn)";
  return "var(--viz-crit)";
}

// -------------------------------------------------------------- item lists

export function ItemLink({ item, className }: { item: Item; className?: string }) {
  const cls = cn("truncate hover:text-primary hover:underline", className);
  if (!item.href) return <span className={cls}>{item.label}</span>;
  if (item.href.startsWith("/files/")) {
    return (
      <a href={item.href} target="_blank" rel="noreferrer noopener" className={cls}>
        {item.label}
      </a>
    );
  }
  return (
    <AppLink href={item.href} className={cls}>
      {item.label}
    </AppLink>
  );
}

export function ItemList({ items, limit = 10, className }: { items: Item[]; limit?: number; className?: string }) {
  const [all, setAll] = React.useState(false);
  const shown = all ? items : items.slice(0, limit);
  if (items.length === 0) return <p className="text-sm text-muted-foreground">Nothing here.</p>;
  return (
    <div className={className}>
      <ul className="divide-y rounded-xl border bg-background/40">
        {shown.map((item) => (
          <li key={item.id} className="flex items-baseline gap-3 px-3 py-2 text-[13px]">
            <ItemLink item={item} className="min-w-0 max-w-[60%] shrink-0 font-medium" />
            {item.sub && <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{item.sub}</span>}
          </li>
        ))}
      </ul>
      {items.length > limit && (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronDown className={cn("size-3.5 transition-transform", all && "rotate-180")} />
          {all ? "Show fewer" : `Show all ${fmt(items.length)}`}
        </button>
      )}
    </div>
  );
}

/** The drill-down shown under a chart when you click one of its rows or bars. */
export function Drill({ title, items, onClose }: { title: string; items: Item[]; onClose: () => void }) {
  return (
    <div className="mt-4 rounded-xl border bg-muted/30 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-medium">
          {title} <span className="font-normal text-muted-foreground">· {fmt(items.length)}</span>
        </p>
        <button
          type="button"
          onClick={onClose}
          title="Close"
          className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <ItemList items={items} />
    </div>
  );
}

// ---------------------------------------------------------------- bar list

export type BarRow = {
  key: string;
  label: string;
  value: number;
  /** shown after the value, e.g. "42%" or "3.1 MB" */
  note?: string;
  icon?: React.ComponentType<{ className?: string }>;
  items?: Item[];
  title?: string;
};

/** Horizontal bars, one per row. Rows with `items` are clickable and open a drill-down list. */
export function BarList({
  rows,
  color = SERIES[0],
  unit = "",
  format = fmt,
  valueLabel = "Count",
  emptyText = "No data yet.",
  drillNoun = "items",
}: {
  rows: BarRow[];
  color?: string;
  unit?: string;
  format?: (n: number) => string;
  valueLabel?: string;
  emptyText?: string;
  drillNoun?: string;
}) {
  const [open, setOpen] = React.useState<string | null>(null);
  const table = useViewMode() === "tables";
  const max = Math.max(1, ...rows.map((r) => r.value));
  const active = rows.find((r) => r.key === open);
  if (rows.length === 0) return <Empty>{emptyText}</Empty>;

  if (table) {
    const hasNote = rows.some((r) => r.note);
    return (
      <div>
        <DataTable
          head={["Item", valueLabel, ...(hasNote ? ["Detail"] : [])]}
          rows={rows.map((r) => [
            <DrillLabel key="l" label={r.label} active={open === r.key} onClick={r.items?.length ? () => setOpen(open === r.key ? null : r.key) : undefined} />,
            `${format(r.value)}${unit}`,
            ...(hasNote ? [r.note ?? ""] : []),
          ])}
        />
        {active?.items && <Drill title={active.label} items={active.items} onClose={() => setOpen(null)} />}
      </div>
    );
  }

  return (
    <div>
      <ul className="space-y-1">
        {rows.map((r) => {
          const Icon = r.icon;
          const clickable = Boolean(r.items && r.items.length);
          const body = (
            <>
              <span className="flex w-[9.5rem] shrink-0 items-center gap-2 text-left text-[13px] sm:w-44">
                {Icon && <Icon className="size-3.5 shrink-0 text-muted-foreground" />}
                <span className="truncate">{r.label}</span>
              </span>
              <span className="relative h-2.5 min-w-0 flex-1 rounded-r-[4px] bg-muted/70">
                <span
                  className="absolute inset-y-0 left-0 rounded-r-[4px]"
                  style={{ width: `${(r.value / max) * 100}%`, background: color, minWidth: r.value > 0 ? 3 : 0 }}
                />
              </span>
              <span className="w-24 shrink-0 text-right text-[13px] tabular-nums">
                {format(r.value)}
                {unit}
                {r.note && <span className="ml-1.5 text-xs text-muted-foreground">{r.note}</span>}
              </span>
            </>
          );
          return (
            <li key={r.key}>
              {clickable ? (
                <button
                  type="button"
                  aria-pressed={open === r.key}
                  title={r.title ?? `Show ${drillNoun}`}
                  onClick={() => setOpen(open === r.key ? null : r.key)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/60",
                    open === r.key && "bg-muted"
                  )}
                >
                  {body}
                </button>
              ) : (
                <div title={r.title} className="flex items-center gap-3 px-2 py-1.5">
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {active?.items && <Drill title={active.label} items={active.items} onClose={() => setOpen(null)} />}
    </div>
  );
}

// ------------------------------------------------------------ column chart

export type ColumnDatum = { key: string; label: string; values: number[]; items?: Item[] };

/**
 * Vertical columns, grouped when there is more than one series. Bars are capped
 * at 24px with a 2px gap and a 4px rounded top; the y-axis is a single scale.
 */
export function ColumnChart({
  data,
  series,
  height = 180,
  drillNoun = "items",
}: {
  data: ColumnDatum[];
  series: { name: string; color: string }[];
  height?: number;
  drillNoun?: string;
}) {
  const [hover, setHover] = React.useState<number | null>(null);
  const [open, setOpen] = React.useState<string | null>(null);
  const table = useViewMode() === "tables";
  const max = niceMax(Math.max(0, ...data.flatMap((d) => d.values)));
  const ticks = [max, max / 2, 0];
  const active = data.find((d) => d.key === open);
  const dense = data.length > 14;

  if (table) {
    return (
      <div>
        <DataTable
          head={["Period", ...series.map((s) => s.name)]}
          rows={data.map((d) => [
            <DrillLabel key="l" label={d.label} active={open === d.key} onClick={d.items?.length ? () => setOpen(open === d.key ? null : d.key) : undefined} />,
            ...d.values.map((v) => fmt(v)),
          ])}
        />
        {active?.items && <Drill title={`${active.label} — ${drillNoun}`} items={active.items} onClose={() => setOpen(null)} />}
      </div>
    );
  }

  return (
    <div>
      {series.length > 1 && <Legend series={series} className="mb-3" />}
      <div className="flex">
        <div className="relative mr-2 w-8 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground" style={{ height }}>
          {ticks.map((t, i) => (
            <span key={i} className="absolute right-0 -translate-y-1/2" style={{ top: `${(1 - t / max) * 100}%` }}>
              {fmt(Math.round(t * 10) / 10)}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="pointer-events-none absolute inset-x-0 top-0" style={{ height }}>
            {ticks.map((t, i) => (
              <span key={i} className="absolute inset-x-0 h-px bg-border" style={{ top: `${(1 - t / max) * 100}%` }} />
            ))}
          </div>
          <div className="relative flex" style={{ height }} onMouseLeave={() => setHover(null)}>
            {data.map((d, i) => {
              const clickable = Boolean(d.items && d.items.length);
              return (
                <button
                  key={d.key}
                  type="button"
                  disabled={!clickable}
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  onClick={() => setOpen(open === d.key ? null : d.key)}
                  aria-label={`${d.label}: ${series.map((s, k) => `${s.name} ${d.values[k]}`).join(", ")}`}
                  className={cn(
                    "group relative flex min-w-0 flex-1 items-end justify-center gap-[2px] px-[2px] outline-none",
                    clickable ? "cursor-pointer" : "cursor-default",
                    hover === i && "bg-muted/60"
                  )}
                >
                  {d.values.map((v, k) => (
                    <span
                      key={k}
                      className="block min-w-[3px] max-w-6 flex-1 rounded-t-[4px]"
                      style={{ height: `${(v / max) * 100}%`, background: series[k].color, minHeight: v > 0 ? 2 : 0 }}
                    />
                  ))}
                </button>
              );
            })}
            {hover !== null && data[hover] && (
              <div
                role="tooltip"
                className="pointer-events-none absolute z-10 rounded-lg border bg-popover px-2.5 py-1.5 text-xs shadow-md"
                style={{ left: `${((hover + 0.5) / data.length) * 100}%`, top: -8, transform: "translate(-50%, -100%)" }}
              >
                <p className="mb-0.5 font-medium">{data[hover].label}</p>
                {series.map((s, k) => (
                  <p key={s.name} className="flex items-center gap-1.5 whitespace-nowrap text-muted-foreground">
                    <span className="size-2 rounded-full" style={{ background: s.color }} />
                    {s.name}: <span className="font-medium text-foreground">{fmt(data[hover].values[k])}</span>
                  </p>
                ))}
              </div>
            )}
          </div>
          <div className="mt-1.5 flex">
            {data.map((d, i) => (
              <span
                key={d.key}
                className={cn(
                  "min-w-0 flex-1 truncate text-center text-[11px] text-muted-foreground",
                  dense && i % 2 === 1 && "invisible"
                )}
              >
                {d.label}
              </span>
            ))}
          </div>
        </div>
      </div>
      <ScreenReaderTable
        caption="Chart data"
        head={["", ...series.map((s) => s.name)]}
        rows={data.map((d) => [d.label, ...d.values.map(String)])}
      />
      {active?.items && <Drill title={`${active.label} — ${drillNoun}`} items={active.items} onClose={() => setOpen(null)} />}
    </div>
  );
}

export function Legend({ series, className }: { series: { name: string; color: string }[]; className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-x-4 gap-y-1", className)}>
      {series.map((s) => (
        <span key={s.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="size-2.5 rounded-[3px]" style={{ background: s.color }} />
          {s.name}
        </span>
      ))}
    </div>
  );
}

// -------------------------------------------------------------- line chart

/** One line over time with a 10% area wash, an end dot and a crosshair tooltip. */
export function LineChart({
  points,
  color = SERIES[0],
  height = 180,
  name = "Total",
}: {
  points: { label: string; value: number }[];
  color?: string;
  height?: number;
  name?: string;
}) {
  const [hover, setHover] = React.useState<number | null>(null);
  const ref = React.useRef<HTMLDivElement>(null);
  const table = useViewMode() === "tables";
  const n = points.length;
  const max = niceMax(Math.max(0, ...points.map((p) => p.value)));
  const x = (i: number) => (n === 1 ? 50 : (i / (n - 1)) * 100);
  const y = (v: number) => 100 - (v / max) * 100;
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.value)}`).join(" ");
  const area = `${line} L${x(n - 1)},100 L${x(0)},100 Z`;
  const ticks = [max, max / 2, 0];
  const at = hover ?? n - 1;

  function onMove(e: React.MouseEvent) {
    const box = ref.current?.getBoundingClientRect();
    if (!box || n < 2) return;
    setHover(Math.min(n - 1, Math.max(0, Math.round(((e.clientX - box.left) / box.width) * (n - 1)))));
  }

  if (n === 0) return <Empty>No data yet.</Empty>;
  if (table) {
    return <DataTable head={["Period", name]} rows={points.map((p) => [p.label, fmt(p.value)])} />;
  }
  const labelEvery = Math.max(1, Math.ceil(n / 8));

  return (
    <div>
      <div className="flex">
        <div className="relative mr-2 w-8 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground" style={{ height }}>
          {ticks.map((t, i) => (
            <span key={i} className="absolute right-0 -translate-y-1/2" style={{ top: `${(1 - t / max) * 100}%` }}>
              {fmt(Math.round(t * 10) / 10)}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div ref={ref} className="relative" style={{ height }} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
            {ticks.map((t, i) => (
              <span key={i} className="absolute inset-x-0 h-px bg-border" style={{ top: `${(1 - t / max) * 100}%` }} />
            ))}
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden>
              <path d={area} fill={color} fillOpacity={0.1} />
              <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </svg>
            {hover !== null && <span className="absolute inset-y-0 w-px bg-foreground/25" style={{ left: `${x(at)}%` }} />}
            <span
              className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card"
              style={{ left: `${x(at)}%`, top: `${y(points[at].value)}%`, background: color }}
            />
            {hover !== null && (
              <div
                role="tooltip"
                className="pointer-events-none absolute z-10 whitespace-nowrap rounded-lg border bg-popover px-2.5 py-1.5 text-xs shadow-md"
                style={{ left: `${x(at)}%`, top: `${y(points[at].value)}%`, transform: `translate(${x(at) > 70 ? "-105%" : "10px"}, -120%)` }}
              >
                <p className="font-medium">{points[at].label}</p>
                <p className="text-muted-foreground">
                  {name}: <span className="font-medium text-foreground">{fmt(points[at].value)}</span>
                </p>
              </div>
            )}
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
            {points.map((p, i) => (
              <span key={i} className={cn("min-w-0 flex-1 truncate text-center", i % labelEvery !== 0 && "invisible")}>
                {p.label}
              </span>
            ))}
          </div>
        </div>
      </div>
      <ScreenReaderTable caption={name} head={["", name]} rows={points.map((p) => [p.label, String(p.value)])} />
    </div>
  );
}

// ------------------------------------------------------------------- donut

export type Slice = { key: string; label: string; value: number; color?: string; note?: string };

export function Donut({
  slices,
  centerValue,
  centerLabel,
}: {
  slices: Slice[];
  centerValue?: React.ReactNode;
  centerLabel?: string;
}) {
  const table = useViewMode() === "tables";
  const live = slices.filter((s) => s.value > 0);
  const total = live.reduce((n, s) => n + s.value, 0);
  const R = 40;
  const C = 2 * Math.PI * R;
  const gap = live.length > 1 ? 1.4 : 0;
  let offset = 0;

  if (total === 0) return <Empty>No data yet.</Empty>;
  if (table) {
    return (
      <DataTable
        head={["Item", "Count", "Share"]}
        rows={[...live.map((s) => [s.label, fmt(s.value), `${pct(s.value, total)}%`]), ["Total", fmt(total), "100%"]]}
      />
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
      <div className="relative size-40 shrink-0">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90" role="img" aria-label={live.map((s) => `${s.label} ${s.value}`).join(", ")}>
          <circle cx="50" cy="50" r={R} fill="none" stroke="var(--muted)" strokeWidth="12" />
          {live.map((s, i) => {
            const len = (s.value / total) * C;
            const el = (
              <circle
                key={s.key}
                cx="50"
                cy="50"
                r={R}
                fill="none"
                stroke={s.color ?? SERIES[i % SERIES.length]}
                strokeWidth="12"
                strokeDasharray={`${Math.max(0, len - gap)} ${C - Math.max(0, len - gap)}`}
                strokeDashoffset={-offset}
              >
                <title>{`${s.label}: ${fmt(s.value)} (${pct(s.value, total)}%)`}</title>
              </circle>
            );
            offset += len;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-semibold tracking-tight">{centerValue ?? fmt(total)}</span>
          {centerLabel && <span className="text-[11px] text-muted-foreground">{centerLabel}</span>}
        </div>
      </div>
      <ul className="min-w-[10rem] flex-1 space-y-1.5">
        {live.map((s, i) => (
          <li key={s.key} className="flex items-center gap-2.5 text-[13px]">
            <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: s.color ?? SERIES[i % SERIES.length] }} />
            <span className="min-w-0 flex-1 truncate">{s.label}</span>
            <span className="tabular-nums">{fmt(s.value)}</span>
            <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{pct(s.value, total)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ------------------------------------------------------- meters and gauges

/** A linear meter. The fill carries severity; the track is a lighter step of the same colour. */
export function Meter({ value, color, className }: { value: number; color?: string; className?: string }) {
  const c = color ?? scoreColor(value);
  return (
    <div
      role="meter"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-2 w-full overflow-hidden rounded-full", className)}
      style={{ background: `color-mix(in oklab, ${c} 20%, transparent)` }}
    >
      <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: c }} />
    </div>
  );
}

export function ScoreRing({ score, label }: { score: number; label: string }) {
  const R = 44;
  const C = 2 * Math.PI * R;
  const color = scoreColor(score);
  return (
    <div className="relative size-44 shrink-0">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" role="img" aria-label={`Health score ${score} out of 100, ${label}`}>
        <circle cx="50" cy="50" r={R} fill="none" strokeWidth="8" style={{ stroke: `color-mix(in oklab, ${color} 20%, transparent)` }} />
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          stroke={color}
          strokeDasharray={`${(score / 100) * C} ${C}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-semibold tracking-tight">{score}</span>
        <span className="text-xs text-muted-foreground">out of 100</span>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------- heatmap

export function Heatmap({
  weeks,
  max,
}: {
  weeks: ({ at: number; count: number } | null)[][];
  max: number;
}) {
  // Square-root scale: one huge day (say, the day the vault was imported) must
  // not flatten every ordinary day down to the palest step.
  const table = useViewMode() === "tables";
  const level = (count: number) => (count <= 0 ? 0 : Math.min(4, Math.ceil(Math.sqrt(count / Math.max(1, max)) * 4)));

  if (table) {
    // A grid of 365 squares has no useful table form, so the table view is month totals.
    const totals = new Map<string, { label: string; count: number; days: number }>();
    for (const week of weeks)
      for (const cell of week) {
        if (!cell) continue;
        const d = new Date(cell.at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const t = totals.get(key) ?? { label: d.toLocaleString("en", { month: "long", year: "numeric" }), count: 0, days: 0 };
        t.count += cell.count;
        if (cell.count > 0) t.days++;
        totals.set(key, t);
      }
    return <DataTable head={["Month", "Changes", "Active days"]} rows={[...totals.values()].map((t) => [t.label, fmt(t.count), fmt(t.days)])} />;
  }
  const fill = ["var(--muted)", "color-mix(in oklab, var(--viz-1) 28%, var(--card))", "color-mix(in oklab, var(--viz-1) 50%, var(--card))", "color-mix(in oklab, var(--viz-1) 75%, var(--card))", "var(--viz-1)"];
  let lastMonth = -1;
  return (
    <div className="overflow-x-auto pb-1">
      <div className="min-w-[44rem]">
        <div className="mb-1 flex pl-8 text-[11px] text-muted-foreground">
          {weeks.map((w, i) => {
            const first = w.find(Boolean);
            const month = first ? new Date(first.at).getMonth() : -1;
            const show = month !== lastMonth && month !== -1;
            if (show) lastMonth = month;
            return (
              <span key={i} className="min-w-0 flex-1 overflow-visible whitespace-nowrap">
                {show ? new Date(first!.at).toLocaleString("en", { month: "short" }) : ""}
              </span>
            );
          })}
        </div>
        <div className="flex gap-[3px]">
          <div className="mr-1 grid w-7 shrink-0 grid-rows-7 gap-[3px] text-[10px] text-muted-foreground">
            {["Mon", "", "Wed", "", "Fri", "", "Sun"].map((d, i) => (
              <span key={i} className="flex items-center">
                {d}
              </span>
            ))}
          </div>
          {weeks.map((w, wi) => (
            <div key={wi} className="grid min-w-0 flex-1 grid-rows-7 gap-[3px]">
              {w.map((cell, di) =>
                cell ? (
                  <span
                    key={di}
                    title={`${new Date(cell.at).toLocaleDateString("en", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}: ${cell.count} ${cell.count === 1 ? "change" : "changes"}`}
                    className="aspect-square rounded-[3px] hover:ring-2 hover:ring-foreground/40"
                    style={{ background: fill[level(cell.count)] }}
                  />
                ) : (
                  <span key={di} className="aspect-square" />
                )
              )}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-muted-foreground">
          Less
          {fill.map((f, i) => (
            <span key={i} className="size-3 rounded-[3px]" style={{ background: f }} />
          ))}
          More
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------- tables

/**
 * The chart's numbers as a table for screen readers. `sr-only` must sit on a
 * <div>, not on the <table>: tables ignore the overflow clipping it relies on
 * (and `w-full` would undo its 1px width), so a hidden table used to be laid
 * out at full size and stretched the whole page's scroll area.
 */
export function ScreenReaderTable(props: React.ComponentProps<typeof DataTable>) {
  return (
    <div className="sr-only">
      <DataTable {...props} />
    </div>
  );
}

export function DataTable({
  head,
  rows,
  caption,
  className,
}: {
  head: string[];
  rows: React.ReactNode[][];
  caption?: string;
  className?: string;
}) {
  return (
    <table className={cn("w-full text-[13px]", className)}>
      {caption && <caption className="sr-only">{caption}</caption>}
      <thead>
        <tr className="border-b text-left text-xs text-muted-foreground">
          {head.map((h, i) => (
            <th key={i} scope="col" className={cn("px-2 py-2 font-medium", i > 0 && "text-right")}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y">
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((c, k) => (
              <td key={k} className={cn("px-2 py-2", k > 0 && "text-right tabular-nums")}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Fraction bar with the numbers spelled out: "12 of 30 · 40%". */
export function Coverage({ label, value, of, hint }: { label: string; value: number; of: number; hint?: string }) {
  const p = pct(value, of);
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
        <span className="truncate">{label}</span>
        <span className="shrink-0 tabular-nums text-muted-foreground">
          {fmt(value)} of {fmt(of)} · <span className="font-medium text-foreground">{p}%</span>
        </span>
      </div>
      <Meter value={p} />
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
