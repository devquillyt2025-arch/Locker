import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AllowedUser = {
  id: string;
  email: string;
};

// Belt-and-suspenders: middleware already redirects unauthenticated/
// disallowed requests to /login, but Server Actions can be invoked
// directly (they're just POST endpoints), so every one of them calls this
// first rather than trusting the page it was rendered from.
export async function requireUser(): Promise<AllowedUser> {
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
