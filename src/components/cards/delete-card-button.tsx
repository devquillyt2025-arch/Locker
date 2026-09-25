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
          <Trash2 className="size-4" /> Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete &quot;{title}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the card, its fields, and anything
            linked to it (files, reminders, vault entries). This can&apos;t
            be undone.
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
        {pending ? "Deleting..." : "Delete"}
      </button>
    </AlertDialogAction>
  );
}
