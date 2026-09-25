"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

// Catches failures in any page under the (app) shell (e.g. the database is
// briefly unreachable) so the sidebar stays usable and there's a way back.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <TriangleAlert className="size-6" />
      </span>
      <h1 className="mt-5 font-serif text-3xl font-medium tracking-tight">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Locker couldn&apos;t load this page. Your data is safe — this is usually a brief
        connection hiccup.
      </p>
      <Button
        size="lg"
        className="mt-6"
        disabled={pending}
        onClick={() =>
          startTransition(() => {
            router.refresh();
            reset();
          })
        }
      >
        <RefreshCw className={pending ? "animate-spin" : undefined} />
        {pending ? "Retrying..." : "Try again"}
      </Button>
    </div>
  );
}
