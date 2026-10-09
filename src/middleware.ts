import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { matchAppRoute } from "@/lib/app-routes";

function isDevBypass() {
  // See src/lib/auth.ts for the matching requireUser() bypass and why this
  // is safe against accidentally shipping to production. Read live (not
  // hoisted to a module-level constant) so a dev server that was already
  // running before SKIP_AUTH was set doesn't get stuck on a stale value.
  return process.env.SKIP_AUTH === "true" && process.env.NODE_ENV !== "production";
}

// URLs that exist outside the app shell's own pages.
const OTHER_ROUTES = ["/login", "/auth/", "/api/drive/", "/files/", "/_next/", "/__nextjs"];

function isKnownPath(pathname: string) {
  if (OTHER_ROUTES.some((r) => pathname === r || pathname.startsWith(r))) return true;
  try {
    return matchAppRoute(pathname.split("/").filter(Boolean).map(decodeURIComponent)) !== null;
  } catch {
    return false; // malformed %-escape
  }
}

export async function middleware(request: NextRequest) {
  const response = isDevBypass() ? NextResponse.next() : await updateSession(request);

  // Sign-in redirects (and anything else that isn't a plain pass-through)
  // win. Otherwise, an unknown URL must answer 404. The app's catch-all page
  // can't do this itself: it streams a loading screen first, so by the time
  // it knows the URL is bad the 200 status has already been sent.
  const passthrough = !response.headers.has("location");
  if (passthrough && !isKnownPath(request.nextUrl.pathname)) {
    const notFound = NextResponse.rewrite(new URL("/_not-found", request.url), { status: 404 });
    // keep any refreshed session cookies from updateSession
    for (const cookie of response.cookies.getAll()) notFound.cookies.set(cookie);
    return notFound;
  }
  return response;
}

export const config = {
  matcher: [
    // Skip static assets and the PWA manifest/service worker; run on
    // everything else, including API/Server Action routes.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
