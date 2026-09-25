"use client";

import { useSearchParams } from "next/navigation";
import { CardForm } from "@/components/cards/card-form";
import { createCardAction } from "@/app/actions";
import { CARD_TYPES } from "@/db/schema";
import { PageContainer, PageHeader } from "@/components/shell/page-header";

export function NewCardView() {
  const type = useSearchParams().get("type");
  const defaultType = CARD_TYPES.find((t) => t === type);

  return (
    <PageContainer className="pb-0 lg:pb-0">
      <PageHeader
        title="New card"
        description="Details you want to find fast, plus links to the real files."
      />
      <CardForm key={defaultType ?? "none"} action={createCardAction} defaultType={defaultType} />
    </PageContainer>
  );
}
