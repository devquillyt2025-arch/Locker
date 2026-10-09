"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { addLinkToCard, cardIdsWithDriveFile, linksForLocalUrl, removeDriveLinks } from "@/lib/cards";
import { fileUrlFromRelPath, isDriveEligiblePath } from "@/lib/docs-types";
import { resolveDocFile } from "@/lib/docs-fs";
import { DriveError, disconnect, driveOpenUrl, uploadLocalFile } from "@/lib/drive";

export type DriveUploadResult =
  | { ok: true; status: "uploaded" | "already-on-drive"; url: string; cardsUpdated: number }
  | { ok: false; error: string; code: "not_configured" | "not_connected" | "auth" | "api" | "refused" };

// Uploads ONE local document to the connected Google Drive and adds the Drive
// link to every card that uses that file. The browser calls this once per file,
// so a bulk upload shows progress, survives a failure, and can be stopped.
//
// Refuses (never uploads) anything that is not attached to a card, or that
// sits in Needs Review / Inbox / Reference — the server enforces this, not
// just the UI.
export async function uploadDocToDriveAction(relPath: string): Promise<DriveUploadResult> {
  const user = await requireUser();

  if (typeof relPath !== "string" || relPath === "" || relPath.includes("\\") || relPath.startsWith("/")) {
    return { ok: false, code: "refused", error: "That isn't a valid document path." };
  }
  if (!isDriveEligiblePath(relPath)) {
    return { ok: false, code: "refused", error: "Files in Needs Review, Inbox and Reference are never uploaded." };
  }

  const doc = await resolveDocFile(relPath.split("/"));
  if (!doc || doc.rel !== relPath) {
    return { ok: false, code: "refused", error: "That file isn't in the documents folder." };
  }

  const attached = await linksForLocalUrl(user.id, fileUrlFromRelPath(relPath));
  if (attached.length === 0) {
    return { ok: false, code: "refused", error: "Only files that are attached to a card can be uploaded." };
  }

  try {
    const outcome = await uploadLocalFile(relPath, doc.file, doc.contentType.split(";")[0]);
    // The earlier copy was deleted on Drive: drop the dead links before adding the new one.
    if (outcome.replacedFileId) await removeDriveLinks(user.id, outcome.replacedFileId);
    const alreadyLinked = await cardIdsWithDriveFile(user.id, outcome.fileId);

    let cardsUpdated = 0;
    const seen = new Set<string>();
    for (const link of attached) {
      if (seen.has(link.cardId) || alreadyLinked.has(link.cardId)) continue;
      seen.add(link.cardId);
      await addLinkToCard(user.id, link.cardId, {
        label: `${link.label || "File"} — on Drive`,
        url: driveOpenUrl(outcome.fileId),
        source: "drive",
        driveFileId: outcome.fileId,
        kind: link.kind,
      });
      cardsUpdated++;
    }

    return {
      ok: true,
      status: outcome.reused && cardsUpdated === 0 ? "already-on-drive" : "uploaded",
      url: outcome.url,
      cardsUpdated,
    };
  } catch (err) {
    if (err instanceof DriveError) return { ok: false, code: err.code, error: err.message };
    console.error("uploadDocToDriveAction failed", err);
    return { ok: false, code: "api", error: "The upload failed unexpectedly. Try again." };
  }
}

// Called once after a batch (or a single upload) so every page picks up the new
// links and the "On Drive" badges.
export async function refreshAfterDriveAction(): Promise<void> {
  await requireUser();
  revalidatePath("/", "layout");
}

export async function disconnectDriveAction(): Promise<void> {
  await requireUser();
  await disconnect();
  revalidatePath("/", "layout");
}
