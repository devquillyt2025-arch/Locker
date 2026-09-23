import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

function isDevBypass() {
  // See src/lib/auth.ts for the matching requireUser() bypass and why this
  // is safe against accidentally shipping to production. Read live (not
  // hoisted to a module-level constant) so a dev server that was already
  // running before SKIP_AUTH was set doesn't get stuck on a stale value.
  return process.env.SKIP_AUTH === "true" && process.env.NODE_ENV !== "production";
}

export async function middleware(request: NextRequest) {
  if (isDevBypass()) return NextResponse.next();
  return updateSession(request);
}

export const config = {
  matcher: [
    // Skip static assets and the PWA manifest/service worker; run on
    // everything else, including API/Server Action routes.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
