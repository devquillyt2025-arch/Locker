"use client";

import * as React from "react";
import {
  BookOpen,
  Briefcase,
  Check,
  ChevronDown,
  ChevronRight,
  Cloud,
  Copy,
  ExternalLink,
  File as FileIcon,
  FileImage,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderOpen,
  FolderTree,
  GraduationCap,
  HeartPulse,
  Home,
  IdCard,
  Inbox,
  Landmark,
  Search,
  ShoppingBag,
  TriangleAlert,
  Wallet,
  X,
  Banknote,
} from "lucide-react";
import { toast } from "sonner";
import { AppLink } from "@/components/shell/app-link";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { useCards } from "@/components/cards/cards-store";
import { useDocs } from "@/components/docs/docs-store";
import { allFolderPaths, buildTree, filterTree, SECTION_INFO, type TreeFolder } from "@/lib/docs-tree";
import { relPathFromFileUrl, type DocFile } from "@/lib/docs-types";
import { TrashDocButton } from "@/components/trash/trash-doc-button";
import { useMounted } from "@/lib/use-mounted";
import { cn } from "@/lib/utils";

const SECTION_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  Identity: IdCard,
  Education: GraduationCap,
  "Government Certificates": Landmark,
  Banking: Banknote,
  Finance: Wallet,
  Medical: HeartPulse,
  Housing: Home,
  Purchases: ShoppingBag,
  Career: Briefcase,
  Reference: BookOpen,
  Inbox: Inbox,
  "Needs Review": TriangleAlert,
};

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

type CardRef = { id: string; title: string };

export function StructureView() {
  const docs = useDocs();
  const { cards } = useCards();
  const [query, setQuery] = React.useState("");
  // Sections start open one level (so you see the sub-folders), everything else closed.
  const [open, setOpen] = React.useState<Set<string>>(new Set());
  const mounted = useMounted();
  const searching = query.trim() !== "";

  const tree = React.useMemo(() => buildTree(docs.files), [docs.files]);
  const visible = React.useMemo(() => filterTree(tree, query), [tree, query]);
  const paths = React.useMemo(() => allFolderPaths(tree), [tree]);

  const cardsByFile = React.useMemo(() => {
    const map = new Map<string, CardRef[]>();
    for (const card of cards) {
      for (const link of card.links) {
        const rel = relPathFromFileUrl(link.url);
        if (!rel) continue;
        const list = map.get(rel) ?? [];
        if (!list.some((c) => c.id === card.id)) list.push({ id: card.id, title: card.title });
        map.set(rel, list);
      }
    }
    return map;
  }, [cards]);

  const isOpen = (path: string) => searching || open.has(path);
  const toggle = (path: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });

  function focusSection(name: string) {
    setQuery("");
    setOpen((prev) => new Set(prev).add(name));
    // wait a frame so the section is expanded before scrolling to it
    requestAnimationFrame(() =>
      document.getElementById(`section-${name}`)?.scrollIntoView({ behavior: "smooth", block: "start" })
    );
  }

  if (!docs.available) {
    return (
      <PageContainer>
        <PageHeader title="Structure" description="How your documents are organized." />
        <div className="flex flex-col items-center rounded-2xl border border-dashed px-6 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <TriangleAlert className="size-5" />
          </span>
          <p className="mt-4 font-serif text-xl">No documents folder here</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            This page draws the <span className="font-mono">docs</span> folder of the project, which only exists on the
            computer that holds your documents.
          </p>
        </div>
      </PageContainer>
    );
  }

  const folderCount = paths.length;

  return (
    <PageContainer>
      <PageHeader
        title="Structure"
        description="How your documents are organized — every section, every folder, and where each file lives."
        actions={
          <button
            type="button"
            onClick={() => copy(docs.root, "Folder path")}
            title="Copy the path of the docs folder"
            className="flex h-9 items-center gap-2 rounded-lg border bg-card px-3 text-sm transition-colors hover:bg-muted"
          >
            <FolderOpen className="size-4 text-muted-foreground" />
            <span className="hidden max-w-[22rem] truncate font-mono text-xs text-muted-foreground sm:inline">{docs.root}</span>
            <Copy className="size-3.5 text-muted-foreground" />
          </button>
        }
      />

      {/* ------------------------------------------------------------ map
          Drawn in the browser only. Folder/file names here are exactly the kind
          of plain text a browser extension (price trackers, translators, ad
          blockers) scans and wraps in its own <span> before React hydrates —
          "Karnataka Bank" as a folder name has been seen rewritten by a stock
          extension that matches it against a ticker. That edits the server HTML
          out from under React and is reported as a hydration error, even though
          our own output is deterministic. The tree below has the same fix. */}
      {!mounted ? (
        <div aria-hidden className="mb-10 min-h-[22rem]" />
      ) : (
        <section aria-label="Overview" className="mb-10">
          <div className="mx-auto flex w-fit items-center gap-3 rounded-2xl border bg-card px-5 py-3 shadow-xs">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <FolderTree className="size-5" />
            </span>
            <div>
              <p className="font-serif text-xl leading-tight">Documents</p>
              <p className="text-xs text-muted-foreground">
                {docs.files.length} files · {tree.length} sections · {folderCount} folders
              </p>
            </div>
          </div>
          {/* trunk connecting the root to its sections */}
          <div className="mx-auto h-6 w-px bg-border" />
          <div className="relative">
            <div className="pointer-events-none absolute inset-x-0 top-0 hidden h-px bg-border lg:block" style={{ left: "6%", right: "6%" }} />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {tree.map((section) => {
                const Icon = SECTION_ICON[section.name] ?? Folder;
                const review = section.name === "Needs Review";
                return (
                  <button
                    key={section.path}
                    type="button"
                    onClick={() => focusSection(section.name)}
                    className={cn(
                      "group relative flex flex-col rounded-2xl border bg-card p-4 pt-4 text-left shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md",
                      review && "border-amber-500/25"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-xl",
                          review ? "bg-amber-500/12 text-amber-600 dark:text-amber-400" : "bg-primary/10 text-primary"
                        )}
                      >
                        <Icon className="size-[18px]" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium leading-tight group-hover:text-primary">{section.name}</p>
                        <p className="text-xs tabular-nums text-muted-foreground">
                          {section.count} {section.count === 1 ? "file" : "files"}
                        </p>
                      </div>
                    </div>
                    <p className="mt-2.5 line-clamp-2 text-xs text-muted-foreground">{SECTION_INFO[section.name] ?? ""}</p>
                    {section.children.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {section.children.slice(0, 4).map((c) => (
                          <span key={c.path} className="rounded-full bg-muted px-2 py-px text-[11px] text-muted-foreground">
                            {c.name} <span className="tabular-nums">{c.count}</span>
                          </span>
                        ))}
                        {section.children.length > 4 && (
                          <span className="rounded-full px-1.5 py-px text-[11px] text-muted-foreground">
                            +{section.children.length - 4} more
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ----------------------------------------------------------- tree */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 basis-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a folder or file — e.g. “payslip”, “loan”, “2019”"
            aria-label="Search the folder tree"
            className="h-10 w-full rounded-xl border bg-card pl-10 pr-10 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              title="Clear search"
              className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2 text-sm">
          <button
            type="button"
            onClick={() => setOpen(new Set(paths))}
            className="rounded-lg border bg-card px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Expand all
          </button>
          <button
            type="button"
            onClick={() => setOpen(new Set())}
            className="rounded-lg border bg-card px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Collapse all
          </button>
        </div>
      </div>

      {/* Tree drawn in the browser only (see the note in documents-view.tsx). */}
      {!mounted ? (
        <div aria-hidden className="min-h-[60vh]" />
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed px-6 py-12 text-center">
          <p className="font-serif text-xl">Nothing matches “{query}”</p>
          <p className="mt-1 text-sm text-muted-foreground">Try a different word.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((section) => (
            <div
              key={section.path}
              id={`section-${section.name}`}
              className={cn(
                "scroll-mt-4 overflow-hidden rounded-2xl border bg-card shadow-xs",
                section.name === "Needs Review" && "border-amber-500/25"
              )}
            >
              <FolderNode
                node={section}
                depth={0}
                isOpen={isOpen}
                toggle={toggle}
                rootPath={docs.root}
                cardsByFile={cardsByFile}
                uploads={docs.uploads}
              />
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}

function FolderNode({
  node,
  depth,
  isOpen,
  toggle,
  rootPath,
  cardsByFile,
  uploads,
}: {
  node: TreeFolder;
  depth: number;
  isOpen: (path: string) => boolean;
  toggle: (path: string) => void;
  rootPath: string;
  cardsByFile: Map<string, CardRef[]>;
  uploads: Record<string, { url: string }>;
}) {
  const open = isOpen(node.path);
  const Icon = depth === 0 ? (SECTION_ICON[node.name] ?? Folder) : open ? FolderOpen : Folder;
  const review = node.path.startsWith("Needs Review");
  const absFolder = rootPath + (rootPath.includes("\\") ? "\\" : "/") + node.path.split("/").join(rootPath.includes("\\") ? "\\" : "/");

  return (
    <div>
      <div className={cn("group flex items-center", depth === 0 && open && "border-b")}>
        <button
          type="button"
          onClick={() => toggle(node.path)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2 py-2.5 pr-2 text-left transition-colors hover:bg-muted/40"
          style={{ paddingLeft: `${12 + depth * 20}px` }}
        >
          {open ? (
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          )}
          <Icon className={cn("size-4 shrink-0", review ? "text-amber-500" : "text-primary")} />
          <span className={cn("truncate text-sm", depth === 0 ? "font-medium" : "")}>{node.name}</span>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{node.count}</span>
          {depth === 0 && SECTION_INFO[node.name] && (
            <span className="ml-2 hidden truncate text-xs text-muted-foreground xl:inline">{SECTION_INFO[node.name]}</span>
          )}
        </button>
        <button
          type="button"
          onClick={() => copy(absFolder, "Folder path")}
          title={`Copy folder path\n${absFolder}`}
          className="mr-2 flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Copy className="size-3.5" />
        </button>
      </div>

      {open && (
        <div className={depth === 0 ? "" : "border-l"} style={depth === 0 ? undefined : { marginLeft: `${12 + depth * 20 + 8}px` }}>
          {node.children.map((c) => (
            <FolderNode
              key={c.path}
              node={c}
              depth={depth + 1}
              isOpen={isOpen}
              toggle={toggle}
              rootPath={rootPath}
              cardsByFile={cardsByFile}
              uploads={uploads}
            />
          ))}
          {node.files.map((f) => (
            <FileRow key={f.path} file={f} cards={cardsByFile.get(f.path) ?? []} onDrive={uploads[f.path]} review={review} />
          ))}
        </div>
      )}
    </div>
  );
}

function FileRow({
  file,
  cards,
  onDrive,
  review,
}: {
  file: DocFile;
  cards: CardRef[];
  onDrive: { url: string } | undefined;
  review: boolean;
}) {
  const [copied, setCopied] = React.useState(false);
  const Icon =
    file.kind === "image" ? FileImage : file.kind === "pdf" || file.kind === "text" ? FileText : file.kind === "office" ? FileSpreadsheet : FileIcon;

  return (
    <div className="group flex items-center gap-2 py-1.5 pr-2 transition-colors hover:bg-muted/30" style={{ paddingLeft: "14px" }}>
      <Icon className={cn("size-4 shrink-0", review ? "text-amber-500/80" : "text-muted-foreground")} />
      <div className="min-w-0 flex-1">
        {file.url ? (
          <a
            href={file.url}
            target="_blank"
            rel="noreferrer noopener"
            title={file.description || file.name}
            className="block truncate text-[13px] hover:text-primary hover:underline"
          >
            {file.name}
          </a>
        ) : (
          <span className="block truncate text-[13px]" title={file.description || file.name}>
            {file.name}
          </span>
        )}
        {(cards.length > 0 || onDrive) && (
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            {cards.map((c) => (
              <AppLink
                key={c.id}
                href={`/cards/${c.id}`}
                className="rounded-full bg-primary/10 px-1.5 py-px text-[10.5px] text-foreground transition-colors hover:bg-primary/20"
              >
                Card: {c.title}
              </AppLink>
            ))}
            {onDrive && (
              <a
                href={onDrive.url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-1.5 py-px text-[10.5px] text-emerald-700 dark:text-emerald-300"
              >
                <Cloud className="size-2.5" /> On Drive
              </a>
            )}
          </div>
        )}
      </div>
      <span className="hidden shrink-0 text-[11px] tabular-nums text-muted-foreground sm:inline">{formatSize(file.size)}</span>
      <div className="flex shrink-0 items-center opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        {file.url && (
          <a
            href={file.url}
            target="_blank"
            rel="noreferrer noopener"
            title="Open"
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ExternalLink className="size-3.5" />
          </a>
        )}
        <button
          type="button"
          title={`Copy full path\n${file.absolutePath}`}
          onClick={async () => {
            await copy(file.absolutePath, "File path");
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
        </button>
        <TrashDocButton rel={file.path} name={file.name} cardCount={cards.length} className="size-7" />
      </div>
    </div>
  );
}
