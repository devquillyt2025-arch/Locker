import { realpath } from "node:fs/promises";
import path from "node:path";

// One place that decides "is this a file we may read from the docs folder?",
// shared by the /files route (serving) and the Drive upload (sending).
// Three guards: a whitelist of extensions, a resolved-path check so nothing
// outside docs/ is reachable (via "..", a drive letter, or a symlink), and
// the file must actually exist.

export const DOCS_ROOT = path.resolve(process.cwd(), "docs");

export const CONTENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".txt": "text/plain; charset=utf-8",
  // Office files: the browser downloads these rather than displaying them.
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".xls": "application/vnd.ms-excel",
};

export type ResolvedDoc = {
  /** Real absolute path on disk. */
  file: string;
  contentType: string;
  /** Path relative to docs/, "/"-separated. */
  rel: string;
};

// Housekeeping lives in dot-folders/files (.trash, .manifest.json, .gitkeep):
// they are never documents and must not be reachable as one.
const hasHiddenSegment = (segments: string[]) => segments.some((s) => s === "" || s.startsWith("."));

/** Returns the file's real path and type, or null if it isn't allowed / doesn't exist. */
export async function resolveDocFile(segments: string[]): Promise<ResolvedDoc | null> {
  if (segments.length === 0 || hasHiddenSegment(segments)) return null;
  const requested = path.resolve(DOCS_ROOT, ...segments);

  const contentType = CONTENT_TYPES[path.extname(requested).toLowerCase()];
  if (!contentType) return null;

  try {
    // realpath resolves symlinks, so a link pointing outside docs/ is caught.
    const [root, real] = await Promise.all([realpath(DOCS_ROOT), realpath(requested)]);
    if (!real.startsWith(root + path.sep)) return null;
    return {
      file: real,
      contentType,
      rel: path.relative(root, real).split(path.sep).join("/"),
    };
  } catch {
    return null;
  }
}

/**
 * Like resolveDocFile, but for ANY file type (used by the Trash, which may
 * move a file of a type the /files route doesn't serve). Still refuses hidden
 * paths, anything outside docs/, symlinks that leave docs/, and non-files.
 */
export async function resolveAnyDocFile(rel: string): Promise<{ file: string; rel: string } | null> {
  if (typeof rel !== "string" || rel === "" || rel.includes("\\") || rel.startsWith("/")) return null;
  const segments = rel.split("/");
  if (segments.some((s) => s === "." || s === "..") || hasHiddenSegment(segments)) return null;
  // The folder's own README/INDEX are housekeeping, not documents.
  if (segments.length === 1 && ["README.md", "INDEX.md"].includes(segments[0])) return null;
  try {
    const { stat } = await import("node:fs/promises");
    const [root, real] = await Promise.all([realpath(DOCS_ROOT), realpath(path.resolve(DOCS_ROOT, ...segments))]);
    if (!real.startsWith(root + path.sep)) return null;
    if (!(await stat(real)).isFile()) return null;
    return { file: real, rel: path.relative(root, real).split(path.sep).join("/") };
  } catch {
    return null;
  }
}
