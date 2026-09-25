"use client";

import { CardForm } from "@/components/cards/card-form";
import { updateCardAction } from "@/app/actions";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { VaultLoader } from "@/components/shell/vault-loader";
import { useCard } from "@/components/cards/use-card";
import { CardNotFound } from "@/components/views/card-not-found";

export function EditCardView({ id }: { id: string }) {
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

  return (
    <PageContainer className="pb-0 lg:pb-0">
      <PageHeader title="Edit card" description={card.title} />
      <CardForm
        // Re-mount if the card is refreshed from the server so the form
        // never shows stale defaults.
        key={+card.updatedAt}
        action={updateCardAction.bind(null, id)}
        card={card}
        cancelHref={`/cards/${id}`}
      />
    </PageContainer>
  );
}
