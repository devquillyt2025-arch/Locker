import { promises as fs } from "node:fs";
import path from "node:path";
import { CONTENT_TYPES } from "@/lib/docs-fs";
import { DOC_TOP_ORDER, type DocFile, type DocsIndex } from "@/lib/docs-types";

// Lists the documents in <project>/docs so the app can show where each one
// lives. The folder is git-ignored personal data, so it only exists on this
// machine — anywhere else this quietly returns "not available".
//
// Descriptions come from docs/.manifest.json (written when the files were
// organized); a file that isn't in it (say, something just dropped into
// Inbox) still shows up, just without a description.

const ROOT = path.resolve(process.cwd(), "docs");

// Same whitelist as the /files route (shared), so "Open" only appears for files it can serve.
const SERVED = new Set(Object.keys(CONTENT_TYPES));
const KIND: Record<string, DocFile["kind"]> = {
  ".pdf": "pdf",
  ".jpg": "image",
  ".jpeg": "image",
  ".png": "image",
  ".webp": "image",
  ".gif": "image",
  ".txt": "text",
  ".docx": "office",
  ".xlsx": "office",
  ".xls": "office",
  ".pptx": "office",
};

// Housekeeping files at the top of docs/, not documents.
const SKIP_AT_ROOT = new Set(["README.md", "INDEX.md"]);

type ManifestEntry = { path: string; what?: string; orig?: string };

async function readManifest(): Promise<Map<string, ManifestEntry>> {
  try {
    const raw = await fs.readFile(path.join(ROOT, ".manifest.json"), "utf8");
    const parsed = JSON.parse(raw) as { entries?: ManifestEntry[] };
    return new Map((parsed.entries ?? []).map((e) => [e.path, e]));
  } catch {
    return new Map();
  }
}

async function walk(dir: string, rel: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue; // .manifest.json, .gitkeep, .staging …
    if (rel === "" && SKIP_AT_ROOT.has(entry.name)) continue;
    const childRel = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...(await walk(path.join(dir, entry.name), childRel)));
    else if (entry.isFile()) out.push(childRel);
  }
  return out;
}

// Descriptions are written in light Markdown (**bold**, `paths`); show them plain.
const plain = (s: string) => s.replace(/\*\*/g, "").replace(/`/g, "");

const topRank = (top: string) => {
  const i = (DOC_TOP_ORDER as readonly string[]).indexOf(top);
  return i === -1 ? DOC_TOP_ORDER.length : i;
};

export async function listDocuments(): Promise<DocsIndex> {
  try {
    await fs.access(ROOT);
  } catch {
    return { available: false, root: ROOT, files: [] };
  }

  try {
    const [paths, manifest] = await Promise.all([walk(ROOT, ""), readManifest()]);

    const files = await Promise.all(
      paths.map(async (rel): Promise<DocFile> => {
        const abs = path.join(ROOT, ...rel.split("/"));
        const stat = await fs.stat(abs);
        const segments = rel.split("/");
        const name = segments[segments.length - 1];
        const ext = path.extname(name).toLowerCase();
        const meta = manifest.get(rel);
        return {
          path: rel,
          name,
          folder: segments.slice(0, -1).join("/"),
          top: segments.length > 1 ? segments[0] : "",
          ext,
          kind: KIND[ext] ?? "other",
          size: stat.size,
          modified: stat.mtimeMs,
          description: meta?.what ? plain(meta.what) : "",
          original: meta?.orig ?? null,
          absolutePath: abs,
          url: SERVED.has(ext) ? "/files/" + segments.map(encodeURIComponent).join("/") : null,
        };
      })
    );

    files.sort(
      (a, b) =>
        topRank(a.top) - topRank(b.top) ||
        a.folder.localeCompare(b.folder) ||
        a.name.localeCompare(b.name)
    );
    return { available: true, root: ROOT, files };
  } catch (err) {
    console.error("listDocuments failed", err);
    return { available: false, root: ROOT, files: [] };
  }
}
