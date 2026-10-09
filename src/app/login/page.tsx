import { Lock } from "lucide-react";
import { pinEnabled } from "@/lib/pin-session";
import { LoginButton } from "./login-button";
import { PinForm } from "./pin-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const usePin = pinEnabled();

  return (
    <div className="flex min-h-dvh items-center justify-center bg-sidebar px-6">
      <div className="w-full max-w-sm rounded-3xl border bg-card p-8 text-center shadow-sm">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Lock className="size-6" />
        </span>
        <h1 className="mt-5 font-serif text-3xl font-medium tracking-tight">Locker</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {usePin ? "Enter your PIN to unlock." : "Your private index of documents, accounts and details."}
        </p>
        {!usePin && error === "not_allowed" && (
          <p className="mt-5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            That Google account isn&apos;t allowed to access this Locker.
          </p>
        )}
        <div className={usePin ? "mt-6" : "mt-6 flex justify-center"}>{usePin ? <PinForm /> : <LoginButton />}</div>
      </div>
    </div>
  );
}
