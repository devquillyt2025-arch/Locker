import { LoginButton } from "./login-button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold">Locker</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your private, hosted document & info index.
        </p>
      </div>
      {error === "not_allowed" && (
        <p className="max-w-sm rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          That Google account isn&apos;t allowed to access this Locker.
        </p>
      )}
      <LoginButton />
    </div>
  );
}
