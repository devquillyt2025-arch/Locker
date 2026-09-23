import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EntryForm } from "@/components/entries/entry-form";
import { createEntryAction } from "@/app/actions";
import { Button } from "@/components/ui/button";

export default function NewEntryPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
        <Link href="/entries">
          <ArrowLeft className="size-4" /> Back to entries
        </Link>
      </Button>
      <h1 className="mb-6 text-2xl font-semibold">New entry</h1>
      <EntryForm action={createEntryAction} />
    </div>
  );
}
