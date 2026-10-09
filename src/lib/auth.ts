import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PIN_COOKIE, pinEnabled, verifySessionToken } from "@/lib/pin-session";

export type AllowedUser = {
  id: string;
  email: string;
};

const DEV_USER_ID = "00000000-0000-0000-0000-000000000001";

// Local-dev bypass for before Google OAuth is wired up in the shared
// Supabase project's Auth settings. Gated on NODE_ENV, not just the env
// var, so it's structurally impossible for a Vercel production build
// (which always sets NODE_ENV=production) to skip the sign-in gate no
// matter what SKIP_AUTH is left set to. Read live, not hoisted to a
// module-level constant, so a dev server already running before
// SKIP_AUTH was set doesn't get stuck on a stale value.
function isDevBypass() {
  return process.env.SKIP_AUTH === "true" && process.env.NODE_ENV !== "production";
}

// Belt-and-suspenders: middleware already redirects unauthenticated/
// disallowed requests to /login, but Server Actions can be invoked
// directly (they're just POST endpoints), so every one of them calls this
// first rather than trusting the page it was rendered from.
//
// Wrapped in React `cache` so the layout, page and any actions in one
// request share a single Supabase Auth round trip instead of one each.
export const requireUser = cache(async function requireUser(): Promise<AllowedUser> {
  // Login-PIN mode (LOCKER_PIN set): a valid signed PIN cookie is the whole
  // login. It maps to the same fixed user id the SKIP_AUTH bypass uses, so the
  // cards already in the database stay visible. Checked before SKIP_AUTH so
  // that flag can't be used to skip the PIN.
  if (pinEnabled()) {
    if (!(await verifySessionToken((await cookies()).get(PIN_COOKIE)?.value))) redirect("/login");
    return {
      id: process.env.DEV_USER_ID ?? DEV_USER_ID,
      email: process.env.ALLOWED_EMAIL ?? "dev@localhost",
    };
  }

  if (isDevBypass()) {
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
});
