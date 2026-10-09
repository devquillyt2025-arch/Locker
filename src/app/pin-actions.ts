"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { checkPin } from "@/lib/pin";
import { PIN_COOKIE, PIN_SESSION_SECONDS, createSessionToken, pinEnabled } from "@/lib/pin-session";

export type UnlockState = { error?: string };

// The login form posts here. On the right PIN it sets the signed session cookie
// (see lib/pin-session.ts) and sends the browser into the app.
export async function unlockAction(_prev: UnlockState, formData: FormData): Promise<UnlockState> {
  if (!pinEnabled()) return { error: "PIN login isn't set up on this server." };

  const pin = formData.get("pin");
  const result = checkPin(typeof pin === "string" ? pin : "");
  if (!result.ok) return { error: result.error };

  const store = await cookies();
  store.set(PIN_COOKIE, await createSessionToken(), {
    httpOnly: true,
    // "lax", not "strict": the Google Drive consent screen redirects back to
    // /api/drive/callback from another site, and that request must still carry
    // the cookie.
    sameSite: "lax",
    secure: (await headers()).get("x-forwarded-proto") === "https",
    path: "/",
    maxAge: PIN_SESSION_SECONDS,
  });
  redirect("/");
}
