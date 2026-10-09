import { readFile } from "node:fs/promises";
import path from "node:path";
import { requireUser } from "@/lib/auth";
import { resolveDocFile } from "@/lib/docs-fs";

// Serves the documents in <project>/docs at /files/<path>, so cards can link
// to files that live on this machine (the docs folder is git-ignored and
// never leaves it). Locker itself still stores only the link.
//
// Guarded three ways: a signed-in user (same check as every Server Action),
// a whitelist of file extensions, and a resolved-path check so nothing
// outside docs/ — via "..", a drive letter, or a symlink — can be read.
// (The checks live in lib/docs-fs.ts, shared with the Drive upload.)

const notFound = () => new Response("Not found", { status: 404 });

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  await requireUser();

  const { path: segments } = await params;
  const doc = await resolveDocFile(segments);
  if (!doc) return notFound();

  let body: Buffer;
  try {
    body = await readFile(doc.file);
  } catch {
    return notFound();
  }

  const download = new URL(request.url).searchParams.get("download") === "1";
  const filename = encodeURIComponent(path.basename(doc.file));

  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": doc.contentType,
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${filename}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=300",
    },
  });
}
