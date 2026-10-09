"use client";

import * as React from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Cloud,
  CloudUpload,
  Copy,
  ExternalLink,
  File as FileIcon,
  FileImage,
  FileText,
  FolderOpen,
  Search,
  TriangleAlert,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppLink } from "@/components/shell/app-link";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { useCards } from "@/components/cards/cards-store";
import { useDocs } from "@/components/docs/docs-store";
import { DrivePanel } from "@/components/docs/drive-panel";
import { TrashDocButton } from "@/components/trash/trash-doc-button";
import { useDriveUpload } from "@/components/docs/use-drive-upload";
import { DOC_TOP_ORDER, isDriveEligiblePath, type DocFile, type DriveUpload } from "@/lib/docs-types";
import { useMounted } from "@/lib/use-mounted";
import { cn } from "@/lib/utils";

const REVIEW = "Needs Review";
const INBOX = "Inbox";

// Lowercase + strip diacritics so search is forgiving.
const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function copy(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  } catch {
    toast.error("Couldn't copy");
  }
}

export function DocumentsView() {
  const docs = useDocs();
  const { cards } = useCards();

  const [query, setQuery] = React.useState("");
  const [top, setTop] = React.useState<string | null>(null);
  const [onlyUnlinked, setOnlyUnlinked] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());
  const { busy, uploadOne } = useDriveUpload();
  const mounted = useMounted();

  // file path -> cards whose links point at it
  const cardsByFile = React.useMemo(() => {
    const map = new Map<string, { id: string; title: string }[]>();
    for (const card of cards) {
      for (const link of card.links) {
        if (!link.url.startsWith("/files/")) continue;
        let rel: string;
        try {
          rel = link.url.slice("/files/".length).split("/").map(decodeURIComponent).join("/");
        } catch {
          continue;
        }
        const list = map.get(rel) ?? [];
        if (!list.some((c) => c.id === card.id)) list.push({ id: card.id, title: card.title });
        map.set(rel, list);
      }
    }
    return map;
  }, [cards]);

  const topCounts = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of docs.files) counts.set(f.top, (counts.get(f.top) ?? 0) + 1);
    const known = DOC_TOP_ORDER.filter((t) => counts.has(t));
    const extra = [...counts.keys()].filter((t) => !(DOC_TOP_ORDER as readonly string[]).includes(t));
    return [...known, ...extra].map((t) => ({ name: t, count: counts.get(t)! }));
  }, [docs.files]);

  const filtered = React.useMemo(() => {
    const tokens = norm(query).split(/\s+/).filter(Boolean);
    return docs.files.filter((f) => {
      if (top && f.top !== top) return false;
      if (onlyUnlinked && (cardsByFile.get(f.path)?.length ?? 0) > 0) return false;
      if (tokens.length === 0) return true;
      const hay = norm(`${f.path} ${f.description} ${f.original ?? ""}`);
      return tokens.every((t) => hay.includes(t));
    });
  }, [docs.files, query, top, onlyUnlinked, cardsByFile]);

  // group by folder, keeping the server's sort order
  const groups = React.useMemo(() => {
    const map = new Map<string, DocFile[]>();
    for (const f of filtered) {
      const key = f.folder || f.top || "(top level)";
      const list = map.get(key);
      if (list) list.push(f);
      else map.set(key, [f]);
    }
    return [...map.entries()].map(([folder, files]) => ({ folder, files }));
  }, [filtered]);

  // Files the Drive button would send: attached to a card, in an uploadable
  // folder, and not on Drive yet. (The server re-checks all of this.)
  const canUpload = (f: DocFile) => (cardsByFile.get(f.path)?.length ?? 0) > 0 && isDriveEligiblePath(f.path);
  const pendingUploads = docs.files.filter((f) => canUpload(f) && !docs.uploads[f.path]).map((f) => f.path);
  const onDriveCount = docs.files.filter((f) => docs.uploads[f.path]).length;

  const linkedCount = docs.files.filter((f) => (cardsByFile.get(f.path)?.length ?? 0) > 0).length;
  const reviewCount = docs.files.filter((f) => f.top === REVIEW).length;
  const inboxCount = docs.files.filter((f) => f.top === INBOX).length;
  const folderCount = new Set(docs.files.map((f) => f.folder)).size;
  const filtering = query.trim() !== "" || top !== null || onlyUnlinked;

  function toggle(folder: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(folder)) next.delete(folder);
      else next.add(folder);
      return next;
    });
  }

  if (!docs.available) {
    return (
      <PageContainer>
        <PageHeader
          title="Documents"
          description="Where each file lives on this computer."
        />
        <div className="flex flex-col items-center rounded-2xl border border-dashed px-6 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <TriangleAlert className="size-5" />
          </span>
          <p className="mt-4 font-serif text-xl">No documents folder here</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            This page lists the files in the <span className="font-mono">docs</span> folder of the
            project. It only exists on the computer that holds your documents.
          </p>
        </div>
      </PageContainer>
    );
  }

  const stats = [
    { label: "files", value: docs.files.length },
    { label: "folders", value: folderCount },
    { label: "linked to a card", value: linkedCount },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Documents"
        description="Every file and the exact folder it lives in — so you can always find it."
        actions={
          <button
            type="button"
            onClick={() => copy(docs.root, "Folder path")}
            title="Copy the path of the docs folder"
            className="flex h-9 items-center gap-2 rounded-lg border bg-card px-3 text-sm transition-colors hover:bg-muted"
          >
            <FolderOpen className="size-4 text-muted-foreground" />
            <span className="hidden max-w-[22rem] truncate font-mono text-xs text-muted-foreground sm:inline">
              {docs.root}
            </span>
            <Copy className="size-3.5 text-muted-foreground" />
          </button>
        }
      />

      <DrivePanel pending={pendingUploads} uploadedCount={onDriveCount} />

      {/* Summary */}
      <div className="mb-5 flex flex-wrap gap-2">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-2 rounded-full border bg-card px-3.5 py-1.5 text-sm">
            <span className="font-medium tabular-nums">{s.value}</span>
            <span className="text-muted-foreground">{s.label}</span>
          </div>
        ))}
        {reviewCount > 0 && (
          <div className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-sm">
            <span className="font-medium tabular-nums">{reviewCount}</span>
            <span className="text-muted-foreground">need review</span>
          </div>
        )}
        {inboxCount > 0 && (
          <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-sm">
            <span className="font-medium tabular-nums">{inboxCount}</span>
            <span className="text-muted-foreground">not filed yet</span>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, description or folder — e.g. “passbook”, “2019”, “SBI”"
          aria-label="Search documents"
          className="h-11 w-full rounded-xl border bg-card pl-10 pr-10 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            title="Clear search"
            className="absolute right-2.5 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Folder filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Chip active={top === null && !onlyUnlinked} onClick={() => { setTop(null); setOnlyUnlinked(false); }}>
          All <span className="text-muted-foreground">{docs.files.length}</span>
        </Chip>
        {topCounts.map((t) => (
          <Chip
            key={t.name}
            active={top === t.name}
            tone={t.name === REVIEW ? "amber" : undefined}
            onClick={() => setTop(top === t.name ? null : t.name)}
          >
            {t.name} <span className="text-muted-foreground">{t.count}</span>
          </Chip>
        ))}
        <Chip active={onlyUnlinked} onClick={() => setOnlyUnlinked((v) => !v)}>
          Not in any card
        </Chip>
        {groups.length > 1 && (
          <button
            type="button"
            onClick={() => setCollapsed(collapsed.size ? new Set() : new Set(groups.map((g) => g.folder)))}
            className="ml-auto text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {collapsed.size ? "Expand all" : "Collapse all"}
          </button>
        )}
      </div>

      {/* Results. Drawn in the browser only: the list is built entirely from data already
          on the client, and server HTML for it just weighs 1 MB+ and can be altered by
          browser extensions (translators etc.), which React reports as a hydration error. */}
      {!mounted ? (
        <div aria-hidden className="min-h-[60vh]" />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed px-6 py-14 text-center">
          <p className="font-serif text-xl">{filtering ? "No documents match" : "No documents yet"}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtering ? "Try a different word, or clear the filters." : "Drop files into the Inbox folder and ask Claude to organize them."}
          </p>
          {filtering && (
            <button
              type="button"
              onClick={() => { setQuery(""); setTop(null); setOnlyUnlinked(false); }}
              className="mt-4 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(({ folder, files }) => {
            const isClosed = collapsed.has(folder);
            const isReview = folder.startsWith(REVIEW);
            const segments = folder.split("/");
            const absFolder = files[0].absolutePath.slice(0, files[0].absolutePath.length - files[0].name.length - 1);
            return (
              <section
                key={folder}
                className={cn(
                  "overflow-hidden rounded-2xl border bg-card shadow-xs",
                  isReview && "border-amber-500/25"
                )}
              >
                <header className="flex items-center gap-1 border-b pr-2">
                  <button
                    type="button"
                    onClick={() => toggle(folder)}
                    aria-expanded={!isClosed}
                    className="flex min-w-0 flex-1 items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/40"
                  >
                    {isClosed ? (
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    <FolderOpen className={cn("size-4 shrink-0", isReview ? "text-amber-500" : "text-primary")} />
                    <span className="flex min-w-0 flex-wrap items-center gap-x-1 text-sm font-medium">
                      {segments.map((seg, i) => (
                        <React.Fragment key={i}>
                          {i > 0 && <ChevronRight className="size-3 shrink-0 text-muted-foreground" />}
                          <span className={cn(i < segments.length - 1 && "text-muted-foreground")}>{seg}</span>
                        </React.Fragment>
                      ))}
                    </span>
                    <span className="ml-1 shrink-0 text-xs tabular-nums text-muted-foreground">{files.length}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => copy(absFolder, "Folder path")}
                    title={`Copy folder path\n${absFolder}`}
                    className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Copy className="size-3.5" />
                  </button>
                </header>

                {!isClosed && (
                  <ul className="divide-y">
                    {files.map((f) => (
                      <DocRow
                        key={f.path}
                        file={f}
                        linked={cardsByFile.get(f.path) ?? []}
                        review={isReview}
                        drive={{
                          connected: docs.drive.connected,
                          uploaded: docs.uploads[f.path],
                          eligible: canUpload(f),
                          busy: busy.has(f.path),
                          upload: () => void uploadOne(f.path),
                        }}
                      />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}

function Chip({
  active,
  tone,
  onClick,
  children,
}: {
  active: boolean;
  tone?: "amber";
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors",
        active
          ? tone === "amber"
            ? "border-amber-500/50 bg-amber-500/15 font-medium text-foreground"
            : "border-primary/40 bg-primary/10 font-medium text-foreground"
          : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

type RowDrive = {
  connected: boolean;
  uploaded: DriveUpload | undefined;
  eligible: boolean;
  busy: boolean;
  upload: () => void;
};

const iconBoxClass = (review: boolean) =>
  cn(
    "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg",
    review ? "bg-amber-500/12 text-amber-600 dark:text-amber-400" : "bg-muted text-muted-foreground"
  );

function DocRow({
  file,
  linked,
  review,
  drive,
}: {
  file: DocFile;
  linked: { id: string; title: string }[];
  review: boolean;
  drive: RowDrive;
}) {
  const [copied, setCopied] = React.useState(false);
  const Icon = file.kind === "image" ? FileImage : file.kind === "pdf" || file.kind === "text" ? FileText : FileIcon;

  async function copyPath() {
    await copy(file.absolutePath, "File path");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <li className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/30">
      {/* The icon and the name open the file (same as on the card page), not just the button on the right.
          Only when the app can serve that file type; otherwise they stay plain. */}
      {file.url ? (
        <a
          href={file.url}
          target="_blank"
          rel="noreferrer noopener"
          tabIndex={-1}
          aria-hidden
          className={cn(iconBoxClass(review), "transition-colors hover:bg-primary/10 hover:text-primary")}
        >
          <Icon className="size-4" />
        </a>
      ) : (
        <span className={iconBoxClass(review)}>
          <Icon className="size-4" />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <p className="break-words text-sm font-medium" title={file.original ? `Originally: ${file.original}` : undefined}>
          {file.url ? (
            <a
              href={file.url}
              target="_blank"
              rel="noreferrer noopener"
              title={`Open ${file.name}`}
              className="rounded outline-none hover:text-primary hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {file.name}
            </a>
          ) : (
            file.name
          )}
        </p>
        {file.description && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{file.description}</p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="uppercase tracking-wide">{file.ext.replace(".", "") || "file"}</span>
          <span>{formatSize(file.size)}</span>
          {linked.length === 0 ? (
            <span className="rounded-full bg-muted px-2 py-px">Not in any card</span>
          ) : (
            linked.map((c) => (
              <AppLink
                key={c.id}
                href={`/cards/${c.id}`}
                className="rounded-full bg-primary/10 px-2 py-px text-foreground transition-colors hover:bg-primary/20"
              >
                Card: {c.title}
              </AppLink>
            ))
          )}
          {drive.uploaded && (
            <a
              href={drive.uploaded.url}
              target="_blank"
              rel="noreferrer noopener"
              title="Open on Google Drive"
              className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-px text-emerald-700 transition-colors hover:bg-emerald-500/20 dark:text-emerald-300"
            >
              <Cloud className="size-3" /> On Drive
            </a>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        {drive.connected && drive.eligible && !drive.uploaded && (
          <button
            type="button"
            onClick={drive.upload}
            disabled={drive.busy}
            title="Upload to Google Drive and add the link to the card"
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60"
          >
            {drive.busy ? <Loader2 className="size-4 animate-spin" /> : <CloudUpload className="size-4" />}
          </button>
        )}
        {file.url && (
          <a
            href={file.url}
            target="_blank"
            rel="noreferrer noopener"
            title="Open the file"
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ExternalLink className="size-4" />
          </a>
        )}
        <button
          type="button"
          onClick={copyPath}
          title={`Copy full path\n${file.absolutePath}`}
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
        </button>
        <TrashDocButton rel={file.path} name={file.name} cardCount={linked.length} />
      </div>
    </li>
  );
}
