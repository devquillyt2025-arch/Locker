import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { DriveError, buildAuthUrl } from "@/lib/drive";

// Step 1 of "Connect Google Drive": send the browser to Google's consent page.
// A random `state` (also kept in a short-lived cookie) ties the callback to
// this request, so a forged callback can't connect someone else's Drive.

// Route files may only export handlers, so the cookie name is repeated in
// callback/route.ts.
const STATE_COOKIE = "locker_drive_state";

export async function GET(request: Request) {
  await requireUser();
  const origin = process.env.APP_ORIGIN ?? new URL(request.url).origin;

  const state = randomBytes(16).toString("hex");
  let authUrl: string;
  try {
    authUrl = buildAuthUrl(origin, state);
  } catch (err) {
    const reason = err instanceof DriveError ? err.code : "error";
    return NextResponse.redirect(new URL(`/documents?drive=${reason}`, origin));
  }

  const res = NextResponse.redirect(authUrl);
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/api/drive",
    maxAge: 600,
  });
  return res;
}
