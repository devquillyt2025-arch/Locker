import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { EntryForm } from "@/components/entries/entry-form";
import { updateEntryAction } from "@/app/actions";
import { getEntry } from "@/lib/entries";
import { Button } from "@/components/ui/button";

export default async function EditEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const entry = getEntry(id);
  if (!entry) notFound();

  const boundAction = updateEntryAction.bind(null, id);

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
        <Link href={`/entries/${id}`}>
          <ArrowLeft className="size-4" /> Back to entry
        </Link>
      </Button>
      <h1 className="mb-6 text-2xl font-semibold">Edit entry</h1>
      <EntryForm action={boundAction} entry={entry} />
    </div>
  );
}
