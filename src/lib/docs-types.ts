export type DocFile = {
  /** Path relative to the docs folder, always with "/" separators. */
  path: string;
  name: string;
  /** Folder part of `path` ("" if the file sits at the top level). */
  folder: string;
  /** First folder segment, e.g. "Education". */
  top: string;
  ext: string;
  kind: "pdf" | "image" | "text" | "office" | "other";
  size: number;
  /** Last-modified time, ms since epoch. */
  modified: number;
  description: string;
  /** Name the file had before it was organized, if known. */
  original: string | null;
  /** Full path on this computer, in the OS's own format (paste into Explorer). */
  absolutePath: string;
  /** Where the app serves it from (/files/...), or null for types it doesn't serve. */
  url: string | null;
};

export type DocsIndex = {
  /** False when there is no docs folder on this machine (e.g. a deployed copy). */
  available: boolean;
  /** Full path of the docs folder itself. */
  root: string;
  files: DocFile[];
};

// Display order of the top-level folders (anything else sorts after these).
export const DOC_TOP_ORDER = [
  "Identity",
  "Education",
  "Government Certificates",
  "Banking",
  "Finance",
  "Medical",
  "Housing",
  "Purchases",
  "Career",
  "Reference",
  "Inbox",
  "Needs Review",
] as const;

// ------------------------------------------------------------------ Google Drive

export type DriveStatus = {
  /** GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are set in .env.local. */
  configured: boolean;
  /** A refresh token is stored — uploads will work. */
  connected: boolean;
  /** The Google account that was connected. */
  email: string | null;
};

/** What the app remembers about a file already uploaded to Drive. */
export type DriveUpload = { fileId: string; url: string };

/** Everything the Documents page (and card pages) need, from the layout. */
export type DocsContextValue = DocsIndex & {
  drive: DriveStatus;
  /** relative path -> where it lives on Drive */
  uploads: Record<string, DriveUpload>;
};

// Files in these top-level folders are never uploaded (duplicates, other
// people's papers, the password photo, reading material, unsorted files).
export const DRIVE_EXCLUDED_TOPS = ["Needs Review", "Inbox", "Reference"] as const;

export function isDriveEligiblePath(rel: string) {
  const top = rel.split("/")[0];
  return !(DRIVE_EXCLUDED_TOPS as readonly string[]).includes(top);
}

/** "/files/A%20B/c.pdf" -> "A B/c.pdf" (null if it isn't a local-file link). */
export function relPathFromFileUrl(url: string): string | null {
  if (!url.startsWith("/files/")) return null;
  try {
    return url
      .slice("/files/".length)
      .split("?")[0]
      .split("/")
      .map(decodeURIComponent)
      .join("/");
  } catch {
    return null;
  }
}

/** "A B/c.pdf" -> "/files/A%20B/c.pdf" — the exact form stored in card links. */
export function fileUrlFromRelPath(rel: string): string {
  return "/files/" + rel.split("/").map(encodeURIComponent).join("/");
}

// ------------------------------------------------------------------------ Trash

/** A document file sitting in docs/.trash, with what is needed to restore it. */
export type TrashedDoc = {
  id: string;
  /** Where it lived, relative to docs/. */
  originalPath: string;
  name: string;
  /** ISO timestamp. */
  trashedAt: string;
  size: number;
  description: string;
  /** The name it had before it was organized, if known. */
  original: string | null;
  /** Cards that linked to it (their links are removed while it's in the Trash). */
  links: { cardId: string; label: string; kind: "image" | "pdf" | "doc" | "folder"; source?: "drive" | "digilocker" | "other" }[];
};

/** Everything the Trash page needs. */
export type TrashData = {
  cards: import("@/lib/cards").TrashedCard[];
  docs: TrashedDoc[];
};
