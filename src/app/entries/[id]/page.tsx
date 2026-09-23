import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Lock } from "lucide-react";
import { getEntry } from "@/lib/entries";
import { ENTRY_TYPE_META } from "@/lib/entry-types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeleteEntryButton } from "@/components/entries/delete-entry-button";

export default async function EntryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const entry = getEntry(id);
  if (!entry) notFound();

  const tags = JSON.parse(entry.tags) as string[];
  const meta = ENTRY_TYPE_META[entry.type];
  const Icon = meta.icon;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
        <Link href="/entries">
          <ArrowLeft className="size-4" /> Back to entries
        </Link>
      </Button>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
            <Icon className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">{entry.title}</h1>
            <p className="text-sm text-muted-foreground">{meta.label}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/entries/${id}/edit`}>
              <Pencil className="size-4" /> Edit
            </Link>
          </Button>
          <DeleteEntryButton id={id} title={entry.title} />
        </div>
      </div>

      {tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {tags.map((t) => (
            <Badge key={t} variant="secondary">
              {t}
            </Badge>
          ))}
        </div>
      )}

      {entry.body && (
        <div className="mt-6 whitespace-pre-wrap rounded-lg border bg-card p-4 text-sm text-card-foreground">
          {entry.body}
        </div>
      )}

      {entry.fields.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Fields</h2>
          <div className="divide-y rounded-lg border">
            {entry.fields.map((f) => (
              <div key={f.id} className="flex items-center justify-between px-4 py-2.5">
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  {f.sensitive && <Lock className="size-3.5 text-amber-500" />}
                  {f.key}
                </span>
                <span className="font-mono text-sm">{f.value}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Fields marked <Lock className="inline size-3 text-amber-500" /> will
            move into the encrypted vault in phase 2 — shown in plain text for now.
          </p>
        </div>
      )}
    </div>
  );
}
