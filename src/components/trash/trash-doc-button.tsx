"use client";

import * as React from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { restoreDocAction, trashDocAction } from "@/app/trash-actions";
import { cn } from "@/lib/utils";

// "Move to Trash" for one document file. Reversible, so there is no confirm
// dialog — the toast has an Undo instead (and the Trash tab keeps it).
export function TrashDocButton({
  rel,
  name,
  cardCount,
  className,
}: {
  rel: string;
  name: string;
  cardCount: number;
  className?: string;
}) {
  const [busy, setBusy] = React.useState(false);

  async function trash() {
    setBusy(true);
    try {
      const result = await trashDocAction(rel);
      if (!result.ok) {
        toast.error(result.error, { description: name });
        return;
      }
      const trashId = result.id;
      toast.success("Moved to Trash", {
        description: cardCount > 0 ? `${name} — removed from ${cardCount} ${cardCount === 1 ? "card" : "cards"}` : name,
        duration: 10000,
        action: trashId
          ? {
              label: "Undo",
              onClick: async () => {
                try {
                  const back = await restoreDocAction(trashId);
                  if (back.ok) toast.success(back.message ?? "Restored");
                  else toast.error(back.error);
                } catch {
                  toast.error("Couldn't undo. You can restore it from the Trash tab.");
                }
              },
            }
          : undefined,
      });
    } catch {
      toast.error("Couldn't reach the app. Check that it's running and try again.", { description: name });
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void trash()}
      disabled={busy}
      title="Move to Trash (you can restore it later)"
      className={cn(
        "flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-60",
        className
      )}
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
    </button>
  );
}
