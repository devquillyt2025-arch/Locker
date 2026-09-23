import type { LinkKind, LinkSource } from "@/db/schema";

// Matches Google Drive file/view/open URLs and extracts the file id:
//   https://drive.google.com/file/d/<id>/view
//   https://drive.google.com/open?id=<id>
//   https://drive.google.com/uc?id=<id>&export=download
//   https://docs.google.com/document/d/<id>/edit
const DRIVE_ID_PATTERNS = [/\/d\/([-\w]{10,})/, /[?&]id=([-\w]{10,})/];

export function parseLinkUrl(rawUrl: string): {
  source: LinkSource;
  driveFileId: string | null;
  kind: LinkKind;
} {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { source: "other", driveFileId: null, kind: "doc" };
  }

  const host = url.hostname.replace(/^www\./, "");

  if (host === "drive.google.com" || host === "docs.google.com") {
    let driveFileId: string | null = null;
    for (const pattern of DRIVE_ID_PATTERNS) {
      const match = url.pathname.match(pattern) ?? url.search.match(pattern);
      if (match) {
        driveFileId = match[1];
        break;
      }
    }
    const kind: LinkKind = url.pathname.includes("/folders/") ? "folder" : "doc";
    return { source: "drive", driveFileId, kind };
  }

  if (host === "digilocker.gov.in" || host.endsWith(".digilocker.gov.in")) {
    return { source: "digilocker", driveFileId: null, kind: "doc" };
  }

  return { source: "other", driveFileId: null, kind: "doc" };
}

export function driveOpenUrl(driveFileId: string): string {
  return `https://drive.google.com/file/d/${driveFileId}/view`;
}

export function driveDownloadUrl(driveFileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${driveFileId}`;
}
