"use client";

import * as React from "react";
import { toast } from "sonner";
import { refreshAfterDriveAction, uploadDocToDriveAction, type DriveUploadResult } from "@/app/drive-actions";

export type BatchSummary = { uploaded: number; already: number; failed: { path: string; error: string }[]; stopped: boolean };

const fileName = (rel: string) => rel.split("/").pop() ?? rel;

// Client side of "upload to Drive". The server does one file per call, so a
// batch can show progress, be stopped, and keep going past a single failure.
export function useDriveUpload() {
  const [busy, setBusy] = React.useState<Set<string>>(new Set());
  const stopRef = React.useRef(false);

  const setOne = (rel: string, on: boolean) =>
    setBusy((prev) => {
      const next = new Set(prev);
      if (on) next.add(rel);
      else next.delete(rel);
      return next;
    });

  // A thrown error here means the request never reached the server (offline,
  // server restarting) — report it like any other failure instead of crashing.
  const call = React.useCallback(async (rel: string): Promise<DriveUploadResult> => {
    try {
      return await uploadDocToDriveAction(rel);
    } catch {
      return { ok: false, code: "api", error: "Couldn't reach the app. Check that it's running and try again." };
    }
  }, []);

  const uploadOne = React.useCallback(
    async (rel: string) => {
      setOne(rel, true);
      const result = await call(rel);
      setOne(rel, false);
      if (result.ok) {
        toast.success(
          result.status === "already-on-drive" ? "Already on Drive" : "Uploaded to Drive",
          { description: fileName(rel) }
        );
      } else {
        toast.error(result.error, { description: fileName(rel) });
      }
      await refreshAfterDriveAction().catch(() => {});
      return result;
    },
    [call]
  );

  const uploadMany = React.useCallback(
    async (paths: string[], onProgress: (done: number, total: number, current: string) => void): Promise<BatchSummary> => {
      stopRef.current = false;
      const summary: BatchSummary = { uploaded: 0, already: 0, failed: [], stopped: false };

      for (let i = 0; i < paths.length; i++) {
        if (stopRef.current) {
          summary.stopped = true;
          break;
        }
        const rel = paths[i];
        onProgress(i, paths.length, rel);
        setOne(rel, true);
        const result = await call(rel);
        setOne(rel, false);

        if (result.ok) {
          if (result.status === "already-on-drive") summary.already++;
          else summary.uploaded++;
        } else {
          summary.failed.push({ path: rel, error: result.error });
          // The connection itself is broken — every remaining file would fail the same way.
          if (result.code === "auth" || result.code === "not_connected" || result.code === "not_configured") {
            summary.stopped = true;
            break;
          }
        }
      }

      onProgress(paths.length, paths.length, "");
      await refreshAfterDriveAction().catch(() => {});
      return summary;
    },
    [call]
  );

  const stop = React.useCallback(() => {
    stopRef.current = true;
  }, []);

  return { busy, uploadOne, uploadMany, stop };
}
