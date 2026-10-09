import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { DriveError, connectWithCode } from "@/lib/drive";

// Step 2: Google sends the browser back here with ?code=…&state=….
const STATE_COOKIE = "locker_drive_state";

export async function GET(request: Request) {
  await requireUser();
  const url = new URL(request.url);
  const origin = process.env.APP_ORIGIN ?? url.origin;
  const back = (drive: string) => {
    const res = NextResponse.redirect(new URL(`/documents?drive=${drive}`, origin));
    res.cookies.set(STATE_COOKIE, "", { path: "/api/drive", maxAge: 0 });
    return res;
  };

  // The user pressed "Cancel" on Google's page (or Google reported an error).
  if (url.searchParams.get("error")) return back("denied");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = request.headers
    .get("cookie")
    ?.split(/;\s*/)
    .find((c) => c.startsWith(`${STATE_COOKIE}=`))
    ?.slice(STATE_COOKIE.length + 1);

  if (!code || !state || !cookieState || state !== cookieState) return back("bad_state");

  try {
    await connectWithCode(origin, code);
  } catch (err) {
    console.error("Drive connect failed", err);
    return back(err instanceof DriveError && err.code === "auth" ? "auth" : "error");
  }

  revalidatePath("/", "layout");
  return back("connected");
}
