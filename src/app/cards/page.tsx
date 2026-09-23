import Link from "next/link";
import { Plus, ArrowLeft } from "lucide-react";
import { listCards } from "@/lib/cards";
import { CARD_TYPE_META } from "@/lib/card-types";
import { requireUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function CardsPage() {
  const user = await requireUser();
  const cards = await listCards(user.id);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
            <Link href="/">
              <ArrowLeft className="size-4" /> Home
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">All cards</h1>
          <p className="text-sm text-muted-foreground">{cards.length} total</p>
        </div>
        <Button asChild>
          <Link href="/cards/new">
            <Plus className="size-4" /> New card
          </Link>
        </Button>
      </div>

      {cards.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No cards yet.{" "}
          <Link href="/cards/new" className="underline underline-offset-2">
            Create your first one
          </Link>
          .
        </div>
      ) : (
        <div className="divide-y rounded-lg border">
          {cards.map((card) => {
            const meta = CARD_TYPE_META[card.type];
            const Icon = meta.icon;
            return (
              <Link
                key={card.id}
                href={`/cards/${card.id}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{card.title}</p>
                  <p className="text-xs text-muted-foreground">{meta.label}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {card.tags.slice(0, 3).map((t) => (
                    <Badge key={t} variant="secondary" className="text-xs">
                      {t}
                    </Badge>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
