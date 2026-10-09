"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { FileImage, FileText, File as FileIcon, FileSpreadsheet, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  emptyTrashAction,
  purgeCardAction,
  purgeDocAction,
  restoreCardAction,
  restoreDocAction,
  type TrashActionResult,
} from "@/app/trash-actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { TypeIcon } from "@/components/cards/card-tile";
import { useTrash } from "@/components/trash/trash-store";
import { CARD_TYPE_META } from "@/lib/card-types";
import type { TrashedCard } from "@/lib/cards";
import type { TrashedDoc } from "@/lib/docs-types";
import { cn } from "@/lib/utils";

const ago = (d: Date | string) => formatDistanceToNow(new Date(d), { addSuffix: true });

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function report(result: TrashActionResult) {
  if (result.ok) toast.success(result.message ?? "Done");
  else toast.error(result.error);
}

// Runs a Trash action with a busy flag and turns a network failure into a message.
function useAction() {
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const run = React.useCallback(async (id: string, fn: () => Promise<TrashActionResult>) => {
    setBusyId(id);
    try {
      report(await fn());
    } catch {
      toast.error("Couldn't reach the app. Check that it's running and try again.");
    } finally {
      setBusyId(null);
    }
  }, []);
  return { busyId, run };
}

export function TrashView() {
  const trash = useTrash();
  const { busyId, run } = useAction();
  const total = trash.cards.length + trash.docs.length;

  return (
    <PageContainer>
      <PageHeader
        title="Trash"
        description={
          total === 0
            ? "Nothing here. Cards and files you delete wait here until you delete them forever."
            : `${total} ${total === 1 ? "item" : "items"} — restore anything you deleted by mistake. Nothing is removed until you delete it forever.`
        }
        actions={
          total > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="lg" className="text-destructive hover:text-destructive" disabled={busyId !== null}>
                  <Trash2 /> Empty Trash
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete everything in the Trash forever?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently deletes {trash.cards.length} {trash.cards.length === 1 ? "card" : "cards"} and{" "}
                    {trash.docs.length} {trash.docs.length === 1 ? "file" : "files"}. It can&apos;t be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep them</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void run("all", emptyTrashAction)}>Delete forever</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )
        }
      />

      {total === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed px-6 py-20 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Trash2 className="size-6" />
          </span>
          <p className="mt-4 font-serif text-2xl">The Trash is empty</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            When you delete a card or move a document to the Trash, it shows up here and can be put back with one click.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {trash.cards.length > 0 && (
            <Section title="Cards" count={trash.cards.length}>
              {trash.cards.map((c) => (
                <CardRow key={c.id} card={c} busy={busyId === c.id} anyBusy={busyId !== null} run={run} />
              ))}
            </Section>
          )}
          {trash.docs.length > 0 && (
            <Section title="Files" count={trash.docs.length}>
              {trash.docs.map((d) => (
                <DocRow key={d.id} doc={d} busy={busyId === d.id} anyBusy={busyId !== null} run={run} />
              ))}
            </Section>
          )}
        </div>
      )}
    </PageContainer>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        {title} <span className="tabular-nums">{count}</span>
      </h2>
      <ul className="divide-y overflow-hidden rounded-2xl border bg-card shadow-xs">{children}</ul>
    </section>
  );
}

function Actions({
  busy,
  anyBusy,
  onRestore,
  onPurge,
  what,
}: {
  busy: boolean;
  anyBusy: boolean;
  onRestore: () => void;
  onPurge: () => void;
  what: string;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <Button variant="outline" size="sm" disabled={anyBusy} onClick={onRestore}>
        {busy ? <Loader2 className="animate-spin" /> : <RotateCcw />} Restore
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm" disabled={anyBusy} className="text-destructive hover:text-destructive" title="Delete forever">
            <Trash2 /> <span className="hidden sm:inline">Delete forever</span>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete forever?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="break-words font-medium text-foreground">{what}</span> will be permanently deleted. This can&apos;t be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onPurge}>Delete forever</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CardRow({
  card,
  busy,
  anyBusy,
  run,
}: {
  card: TrashedCard;
  busy: boolean;
  anyBusy: boolean;
  run: (id: string, fn: () => Promise<TrashActionResult>) => Promise<void>;
}) {
  const meta = CARD_TYPE_META[card.type];
  return (
    <li className={cn("flex flex-wrap items-center gap-3 px-4 py-3", busy && "opacity-60")} data-trash-item="card">
      <TypeIcon type={card.type} />
      <div className="min-w-0 flex-1 basis-56">
        <p className="truncate font-medium">{card.title}</p>
        <p className="text-xs text-muted-foreground">
          {meta.label} · {card.fieldCount} {card.fieldCount === 1 ? "field" : "fields"} · {card.linkCount}{" "}
          {card.linkCount === 1 ? "link" : "links"} ·{" "}
          <span suppressHydrationWarning>deleted {ago(card.deletedAt)}</span>
        </p>
      </div>
      <Actions
        busy={busy}
        anyBusy={anyBusy}
        what={`the card “${card.title}”, with its fields and links`}
        onRestore={() => void run(card.id, () => restoreCardAction(card.id))}
        onPurge={() => void run(card.id, () => purgeCardAction(card.id))}
      />
    </li>
  );
}

function DocRow({
  doc,
  busy,
  anyBusy,
  run,
}: {
  doc: TrashedDoc;
  busy: boolean;
  anyBusy: boolean;
  run: (id: string, fn: () => Promise<TrashActionResult>) => Promise<void>;
}) {
  const ext = doc.name.split(".").pop()?.toLowerCase() ?? "";
  const Icon = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext)
    ? FileImage
    : ext === "pdf" || ext === "txt"
      ? FileText
      : ["xlsx", "xls", "pptx", "docx"].includes(ext)
        ? FileSpreadsheet
        : FileIcon;
  const folder = doc.originalPath.split("/").slice(0, -1).join(" › ") || "Top level";
  return (
    <li className={cn("flex flex-wrap items-center gap-3 px-4 py-3", busy && "opacity-60")} data-trash-item="file">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1 basis-56">
        <p className="break-words font-medium">{doc.name}</p>
        {doc.description && <p className="line-clamp-1 text-xs text-muted-foreground">{doc.description}</p>}
        <p className="mt-0.5 text-xs text-muted-foreground">
          From {folder} · {formatSize(doc.size)} · <span suppressHydrationWarning>trashed {ago(doc.trashedAt)}</span>
          {doc.links.length > 0 && ` · was attached to ${doc.links.length} ${doc.links.length === 1 ? "card" : "cards"}`}
        </p>
      </div>
      <Actions
        busy={busy}
        anyBusy={anyBusy}
        what={`the file “${doc.name}”`}
        onRestore={() => void run(doc.id, () => restoreDocAction(doc.id))}
        onPurge={() => void run(doc.id, () => purgeDocAction(doc.id))}
      />
    </li>
  );
}
