import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CardForm } from "@/components/cards/card-form";
import { createCardAction } from "@/app/actions";
import { Button } from "@/components/ui/button";

export default function NewCardPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
        <Link href="/cards">
          <ArrowLeft className="size-4" /> Back to cards
        </Link>
      </Button>
      <h1 className="mb-6 text-2xl font-semibold">New card</h1>
      <CardForm action={createCardAction} />
    </div>
  );
}
