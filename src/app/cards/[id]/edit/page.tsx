import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CardForm } from "@/components/cards/card-form";
import { updateCardAction } from "@/app/actions";
import { getCard } from "@/lib/cards";
import { requireUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default async function EditCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const card = await getCard(user.id, id);
  if (!card) notFound();

  const boundAction = updateCardAction.bind(null, id);

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
        <Link href={`/cards/${id}`}>
          <ArrowLeft className="size-4" /> Back to card
        </Link>
      </Button>
      <h1 className="mb-6 text-2xl font-semibold">Edit card</h1>
      <CardForm action={boundAction} card={card} />
    </div>
  );
}
