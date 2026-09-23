import Link from "next/link";

export default function AuthCodeErrorPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold">Sign-in failed</h1>
      <p className="text-sm text-muted-foreground">
        The sign-in link was invalid or expired.
      </p>
      <Link href="/login" className="text-sm underline underline-offset-2">
        Try again
      </Link>
    </div>
  );
}
