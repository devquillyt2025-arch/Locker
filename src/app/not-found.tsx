import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <SearchX className="size-6" />
      </span>
      <h1 className="mt-5 font-serif text-3xl font-medium tracking-tight">Page not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">That page doesn&apos;t exist in your Locker.</p>
      <Button asChild size="lg" className="mt-6">
        <Link href="/">Go home</Link>
      </Button>
    </div>
  );
}
