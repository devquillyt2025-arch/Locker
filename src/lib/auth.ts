import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AllowedUser = {
  id: string;
  email: string;
};

// Local-dev bypass for before Google OAuth is wired up in the shared
// Supabase project's Auth settings. Gated on NODE_ENV, not just the env
// var, so it's structurally impossible for a Vercel production build
// (which always sets NODE_ENV=production) to skip the sign-in gate no
// matter what SKIP_AUTH is left set to.
const DEV_BYPASS = process.env.SKIP_AUTH === "true" && process.env.NODE_ENV !== "production";
const DEV_USER_ID = "00000000-0000-0000-0000-000000000001";

// Belt-and-suspenders: middleware already redirects unauthenticated/
// disallowed requests to /login, but Server Actions can be invoked
// directly (they're just POST endpoints), so every one of them calls this
// first rather than trusting the page it was rendered from.
export async function requireUser(): Promise<AllowedUser> {
  if (DEV_BYPASS) {
    return {
      id: process.env.DEV_USER_ID ?? DEV_USER_ID,
      email: process.env.ALLOWED_EMAIL ?? "dev@localhost",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const allowedEmail = process.env.ALLOWED_EMAIL;

  if (!user || !user.email || (allowedEmail && user.email !== allowedEmail)) {
    redirect("/login");
  }

  return { id: user.id, email: user.email };
}
