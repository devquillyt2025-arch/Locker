"use client";

import { CloudUpload, Loader2 } from "lucide-react";
import { useDocs } from "@/components/docs/docs-store";
import { useDriveUpload } from "@/components/docs/use-drive-upload";
import { Button } from "@/components/ui/button";
import { isDriveEligiblePath, relPathFromFileUrl } from "@/lib/docs-types";

// "Upload to Drive" for a card's local-file link. Shown only when Drive is
// connected, the file is allowed to go up, and it isn't on Drive already.
export function DriveUploadButton({ url }: { url: string }) {
  const docs = useDocs();
  const { busy, uploadOne } = useDriveUpload();

  const rel = relPathFromFileUrl(url);
  if (!rel || !docs.drive.connected || !isDriveEligiblePath(rel) || docs.uploads[rel]) return null;
  const working = busy.has(rel);

  return (
    <Button
      variant="ghost"
      size="icon"
      title="Upload to Google Drive and add the link to this card"
      disabled={working}
      onClick={() => void uploadOne(rel)}
    >
      {working ? <Loader2 className="animate-spin" /> : <CloudUpload />}
    </Button>
  );
}
