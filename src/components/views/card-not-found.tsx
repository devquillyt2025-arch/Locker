import { AppLink as Link } from "@/components/shell/app-link";
import { SearchX } from "lucide-react";
import { PageContainer } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";

export function CardNotFound() {
  return (
    <PageContainer>
      <div className="flex flex-col items-center py-24 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <SearchX className="size-6" />
        </span>
        <h1 className="mt-5 font-serif text-3xl font-medium tracking-tight">Card not found</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          It may have been deleted, or the link is wrong.
        </p>
        <Button asChild size="lg" className="mt-6">
          <Link href="/cards">Back to all cards</Link>
        </Button>
      </div>
    </PageContainer>
  );
}
