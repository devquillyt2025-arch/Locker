import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Lock, ExternalLink, Download, FolderOpen } from "lucide-react";
import { getCard } from "@/lib/cards";
import { CARD_TYPE_META } from "@/lib/card-types";
import { driveDownloadUrl, driveOpenUrl } from "@/lib/drive-url";
import { requireUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeleteCardButton } from "@/components/cards/delete-card-button";
import { CopyLinkButton } from "@/components/cards/copy-link-button";

const KIND_ICON = {
  image: ExternalLink,
  pdf: ExternalLink,
  doc: ExternalLink,
  folder: FolderOpen,
};

export default async function CardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const card = await getCard(user.id, id);
  if (!card) notFound();

  const meta = CARD_TYPE_META[card.type];
  const Icon = meta.icon;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
        <Link href="/cards">
          <ArrowLeft className="size-4" /> Back to cards
        </Link>
      </Button>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
            <Icon className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">{card.title}</h1>
            <p className="text-sm text-muted-foreground">{meta.label}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/cards/${id}/edit`}>
              <Pencil className="size-4" /> Edit
            </Link>
          </Button>
          <DeleteCardButton id={id} title={card.title} />
        </div>
      </div>

      {card.aliases.length > 0 && (
        <p className="mt-4 text-sm text-muted-foreground">
          Also known as: {card.aliases.join(", ")}
        </p>
      )}

      {card.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {card.tags.map((t) => (
            <Badge key={t} variant="secondary">
              {t}
            </Badge>
          ))}
        </div>
      )}

      {card.fields.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Fields</h2>
          <div className="divide-y rounded-lg border">
            {card.fields.map((f) => (
              <div key={f.id} className="flex items-center justify-between px-4 py-2.5">
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  {f.isSecret && <Lock className="size-3.5 text-amber-500" />}
                  {f.key}
                </span>
                <span className="font-mono text-sm">{f.value}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Fields marked <Lock className="inline size-3 text-amber-500" /> will
            be encrypted in your browser once phase 2 lands — shown in plain
            text for now.
          </p>
        </div>
      )}

      {card.links.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Links</h2>
          <div className="space-y-2">
            {card.links.map((link) => {
              const openUrl = link.driveFileId ? driveOpenUrl(link.driveFileId) : link.url;
              const downloadUrl = link.driveFileId ? driveDownloadUrl(link.driveFileId) : null;
              const KindIcon = KIND_ICON[link.kind];
              return (
                <div key={link.id} className="flex items-center gap-2 rounded-lg border px-4 py-2.5">
                  <KindIcon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {link.label || "Untitled link"}
                  </span>
                  <Badge variant="outline" className="shrink-0 text-xs capitalize">
                    {link.source}
                  </Badge>
                  <Button variant="ghost" size="icon" asChild title="Open">
                    <a href={openUrl} target="_blank" rel="noreferrer noopener">
                      <ExternalLink className="size-4" />
                    </a>
                  </Button>
                  {downloadUrl && (
                    <Button variant="ghost" size="icon" asChild title="Download">
                      <a href={downloadUrl}>
                        <Download className="size-4" />
                      </a>
                    </Button>
                  )}
                  <CopyLinkButton url={link.url} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {card.notes && (
        <div className="mt-6 whitespace-pre-wrap rounded-lg border bg-card p-4 text-sm text-card-foreground">
          {card.notes}
        </div>
      )}
    </div>
  );
}
