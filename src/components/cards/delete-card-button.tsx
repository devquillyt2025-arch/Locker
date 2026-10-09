"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteCardAction } from "@/app/actions";

export function DeleteCardButton({ id, title }: { id: string; title: string }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="lg" className="text-destructive hover:text-destructive">
          <Trash2 className="size-4" /> Move to Trash
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Move &quot;{title}&quot; to the Trash?</AlertDialogTitle>
          <AlertDialogDescription>
            The card goes to the Trash with all its fields and links. You can restore it any time from the
            Trash tab — nothing is erased.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <form action={deleteCardAction.bind(null, id)}>
            <ConfirmDeleteButton />
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Inside the <form> so useFormStatus can see the pending server action; the
// button disables itself so a double click can't delete twice.
function ConfirmDeleteButton() {
  const { pending } = useFormStatus();
  return (
    <AlertDialogAction asChild>
      <button type="submit" disabled={pending} className="w-full">
        {pending && <Loader2 className="animate-spin" />}
        {pending ? "Moving..." : "Move to Trash"}
      </button>
    </AlertDialogAction>
  );
}
