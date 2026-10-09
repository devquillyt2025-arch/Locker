"use client";

import { AppLink as Link } from "@/components/shell/app-link";
import { format } from "date-fns";
import {
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Pencil,
  StickyNote,
} from "lucide-react";
import { CARD_TYPE_META } from "@/lib/card-types";
import { driveDownloadUrl, driveOpenUrl } from "@/lib/drive-url";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeleteCardButton } from "@/components/cards/delete-card-button";
import { CopyLinkButton } from "@/components/cards/copy-link-button";
import { DriveUploadButton } from "@/components/docs/drive-upload-button";
import { FieldValue } from "@/components/cards/field-value";
import { TypeIcon } from "@/components/cards/card-tile";
import { PageContainer } from "@/components/shell/page-header";
import { VaultLoader } from "@/components/shell/vault-loader";
import { useCard } from "@/components/cards/use-card";
import { CardNotFound } from "@/components/views/card-not-found";
import { cn } from "@/lib/utils";

const KIND_ICON = {
  image: ImageIcon,
  pdf: FileText,
  doc: FileText,
  folder: FolderOpen,
};

export function CardDetailView({ id }: { id: string }) {
  const { card, status } = useCard(id);

  if (!card) {
    return status === "loading" ? (
      <div className="flex min-h-[70vh] items-center justify-center">
        <VaultLoader size={96} />
      </div>
    ) : (
      <CardNotFound />
    );
  }

  const meta = CARD_TYPE_META[card.type];

  return (
    // On desktop the page fills the pane instead of growing with its content:
    // the header stays put and only the Files & links list scrolls (see below).
    <PageContainer className="lg:flex lg:h-full lg:flex-col lg:pb-6">
      <nav className="mb-5 flex shrink-0 items-center gap-1 text-sm text-muted-foreground">
        <Link href="/cards" className="hover:text-foreground">
          All cards
        </Link>
        <ChevronRight className="size-3.5" />
        <Link href={`/cards?type=${card.type}`} className="hover:text-foreground">
          {meta.plural}
        </Link>
      </nav>

      <div className="mb-8 flex shrink-0 flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <TypeIcon type={card.type} className="size-14 rounded-2xl [&_svg]:size-7" />
          <div className="min-w-0">
            <h1 className="truncate font-serif text-3xl font-medium tracking-tight sm:text-4xl">
              {card.title}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span>{meta.label}</span>
              {card.aliases.length > 0 && <span>Also: {card.aliases.join(", ")}</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="lg" asChild>
            <Link href={`/cards/${id}/edit`}>
              <Pencil /> Edit
            </Link>
          </Button>
          <DeleteCardButton id={id} title={card.title} />
        </div>
      </div>

      {card.tags.length > 0 && (
        <div className="-mt-4 mb-8 flex shrink-0 flex-wrap gap-2">
          {card.tags.map((t) => (
            <Badge key={t} variant="secondary" className="h-6 px-2.5">
              {t}
            </Badge>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] xl:gap-8">
        {/* Left: files & links + meta. The list inside scrolls on its own (see below). */}
        <div className="space-y-6 lg:flex lg:min-h-0 lg:flex-col">
          <Panel title="Files & links" count={card.links.length} className="flex flex-col lg:min-h-0">
            {card.links.length === 0 ? (
              <Empty>No links yet. Edit the card to add a Drive or DigiLocker link.</Empty>
            ) : (
              // The one scrollable area: capped on small screens (where the page scrolls as usual), fills what's left of the pane on desktop.
              <div className="max-h-[60vh] min-h-0 divide-y overflow-y-auto lg:max-h-none">
                {card.links.map((link) => {
                  const openUrl = link.driveFileId ? driveOpenUrl(link.driveFileId) : link.url;
                  const isLocalFile = link.url.startsWith("/files/");
                  const downloadUrl = link.driveFileId
                    ? driveDownloadUrl(link.driveFileId)
                    : isLocalFile
                      ? `${link.url}?download=1`
                      : null;
                  const KindIcon = KIND_ICON[link.kind];
                  return (
                    <div key={link.id} className="flex items-center gap-3 px-5 py-3">
                      {/* The icon and name open the file too, not just the button on the right. */}
                      <a
                        href={openUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        title={`Open ${link.label || "file"}`}
                        className="group flex min-w-0 flex-1 items-center gap-3 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                          <KindIcon className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium group-hover:text-primary group-hover:underline">
                            {link.label || "Untitled link"}
                          </p>
                          <p className="text-xs text-muted-foreground">{isLocalFile ? "On this computer" : <span className="capitalize">{link.source}</span>}</p>
                        </div>
                      </a>
                      <Button variant="ghost" size="icon" asChild title="Open">
                        <a href={openUrl} target="_blank" rel="noreferrer noopener">
                          <ExternalLink />
                        </a>
                      </Button>
                      {downloadUrl && (
                        <Button variant="ghost" size="icon" asChild title="Download">
                          <a href={downloadUrl}>
                            <Download />
                          </a>
                        </Button>
                      )}
                      {isLocalFile && <DriveUploadButton url={link.url} />}
                      <CopyLinkButton url={link.url} />
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          <div className="shrink-0 rounded-2xl border bg-card px-5 py-4 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Created</span>
              <span>{format(card.createdAt, "d MMM yyyy, h:mm a")}</span>
            </div>
            <div className="mt-1.5 flex justify-between">
              <span>Updated</span>
              <span>{format(card.updatedAt, "d MMM yyyy, h:mm a")}</span>
            </div>
          </div>
        </div>

        {/* Right: details and notes. Scrolls only as a safety net if a card has an unusually long list of details. */}
        <div className="space-y-6 lg:min-h-0 lg:overflow-y-auto">
          <Panel title="Details" count={card.fields.length}>
            {card.fields.length === 0 ? (
              <Empty>No fields on this card.</Empty>
            ) : (
              <dl className="divide-y">
                {card.fields.map((f) => (
                  <div
                    key={f.id}
                    className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] items-center gap-4 px-5 py-3 sm:grid-cols-[12rem_minmax(0,1fr)]"
                  >
                    <dt className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                      {f.key}
                    </dt>
                    <dd>
                      <FieldValue value={f.value} isSecret={f.isSecret} />
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </Panel>

          {card.notes && (
            <Panel title="Notes" icon={StickyNote}>
              <p className="whitespace-pre-wrap px-5 py-4 text-sm leading-relaxed">{card.notes}</p>
            </Panel>
          )}
        </div>
      </div>
    </PageContainer>
  );
}

function Panel({
  title,
  count,
  icon: Icon,
  className,
  children,
}: {
  title: string;
  count?: number;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("overflow-hidden rounded-2xl border bg-card shadow-xs", className)}>
      <header className="flex shrink-0 items-center gap-2 border-b px-5 py-3">
        {Icon && <Icon className="size-4 text-muted-foreground" />}
        <h2 className="text-sm font-medium">{title}</h2>
        {count !== undefined && count > 0 && (
          <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
        )}
      </header>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-5 py-6 text-sm text-muted-foreground">{children}</p>;
}
