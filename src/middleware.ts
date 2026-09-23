import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// See src/lib/auth.ts for the matching requireUser() bypass and why this
// is safe against accidentally shipping to production.
const DEV_BYPASS = process.env.SKIP_AUTH === "true" && process.env.NODE_ENV !== "production";

export async function middleware(request: NextRequest) {
  if (DEV_BYPASS) return NextResponse.next();
  return updateSession(request);
}

export const config = {
  matcher: [
    // Skip static assets and the PWA manifest/service worker; run on
    // everything else, including API/Server Action routes.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
