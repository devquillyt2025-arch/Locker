"use client";

import { useActionState, useEffect, useRef } from "react";
import { unlockAction, type UnlockState } from "@/app/pin-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PinForm() {
  const [state, action, pending] = useActionState<UnlockState, FormData>(unlockAction, {});
  const input = useRef<HTMLInputElement>(null);

  // React clears the field after a submit; put the cursor back so a mistyped PIN can be retyped at once.
  useEffect(() => {
    if (state.error) input.current?.focus();
  }, [state]);

  return (
    <form action={action} className="space-y-3">
      <Input
        ref={input}
        name="pin"
        type="password"
        inputMode="numeric"
        autoComplete="current-password"
        aria-label="PIN"
        aria-invalid={state.error ? true : undefined}
        aria-describedby={state.error ? "pin-error" : undefined}
        autoFocus
        required
        maxLength={64}
        className="h-12 text-center text-2xl tracking-[0.5em]"
      />
      {state.error && (
        <p
          id="pin-error"
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Unlocking..." : "Unlock"}
      </Button>
    </form>
  );
}
