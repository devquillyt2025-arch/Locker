import { promises as fs } from "node:fs";
import type { DriveStatus } from "@/lib/docs-types";
import {
  deleteToken,
  readToken,
  readUploads,
  updateUploads,
  writeToken,
  type UploadRecord,
} from "@/lib/drive-store";

// Google Drive uploads over the plain REST API — no SDK.
//
// Scope is `drive.file`: the app can only see and touch files IT created
// (never the rest of your Drive). Files are uploaded private (owner-only) into
// a "Locker Documents" folder that mirrors the docs/ folder structure.
//
// The endpoint URLs can be overridden with env vars; that exists purely so the
// whole flow can be tested against a local fake of Google.

export type DriveErrorCode = "not_configured" | "not_connected" | "auth" | "api";

export class DriveError extends Error {
  constructor(
    public code: DriveErrorCode,
    message: string
  ) {
    super(message);
    this.name = "DriveError";
  }
}

const cfg = () => ({
  clientId: process.env.GOOGLE_CLIENT_ID ?? "",
  clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  authUrl: process.env.GOOGLE_AUTH_URL ?? "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: process.env.GOOGLE_TOKEN_URL ?? "https://oauth2.googleapis.com/token",
  userinfoUrl: process.env.GOOGLE_USERINFO_URL ?? "https://openidconnect.googleapis.com/v1/userinfo",
  revokeUrl: process.env.GOOGLE_REVOKE_URL ?? "https://oauth2.googleapis.com/revoke",
  driveApi: process.env.GOOGLE_DRIVE_API ?? "https://www.googleapis.com/drive/v3",
  uploadApi: process.env.GOOGLE_DRIVE_UPLOAD_API ?? "https://www.googleapis.com/upload/drive/v3",
});

export const DRIVE_ROOT_FOLDER = "Locker Documents";
const SCOPES = "https://www.googleapis.com/auth/drive.file openid email";

export const driveOpenUrl = (fileId: string) => `https://drive.google.com/file/d/${fileId}/view`;

export const isDriveConfigured = () => {
  const c = cfg();
  return Boolean(c.clientId && c.clientSecret);
};

export async function getDriveStatus(): Promise<DriveStatus> {
  const token = await readToken();
  return { configured: isDriveConfigured(), connected: Boolean(token), email: token?.email ?? null };
}

// ------------------------------------------------------------------- sign-in

export const redirectUriFor = (origin: string) => `${origin}/api/drive/callback`;

export function buildAuthUrl(origin: string, state: string): string {
  const c = cfg();
  if (!c.clientId || !c.clientSecret) throw new DriveError("not_configured", "Google credentials aren't set up yet.");
  const url = new URL(c.authUrl);
  url.search = new URLSearchParams({
    client_id: c.clientId,
    redirect_uri: redirectUriFor(origin),
    response_type: "code",
    scope: SCOPES,
    access_type: "offline", // we need a refresh token
    prompt: "consent", // always issue a fresh one, even on reconnect
    include_granted_scopes: "true",
    state,
  }).toString();
  return url.toString();
}

async function postForm(url: string, params: Record<string, string>) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { res, json };
}

// Exchanges the ?code from Google's redirect for a refresh token and stores it.
export async function connectWithCode(origin: string, code: string): Promise<{ email: string | null }> {
  const c = cfg();
  const { res, json } = await postForm(c.tokenUrl, {
    code,
    client_id: c.clientId,
    client_secret: c.clientSecret,
    redirect_uri: redirectUriFor(origin),
    grant_type: "authorization_code",
  });
  if (!res.ok) {
    throw new DriveError("auth", `Google rejected the sign-in (${json.error_description ?? json.error ?? res.status}).`);
  }
  const refreshToken = json.refresh_token as string | undefined;
  const accessToken = json.access_token as string | undefined;
  if (!refreshToken || !accessToken) {
    throw new DriveError(
      "auth",
      "Google didn't return a refresh token. Remove Locker at myaccount.google.com/permissions and connect again."
    );
  }

  let email: string | null = null;
  try {
    const info = await fetch(c.userinfoUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (info.ok) email = ((await info.json()) as { email?: string }).email ?? null;
  } catch {
    // The email is only shown in the UI; not worth failing the connection over.
  }

  await writeToken({ refreshToken, email, connectedAt: new Date().toISOString() });
  cached = { token: accessToken, expires: Date.now() + Number(json.expires_in ?? 3600) * 1000 };
  return { email };
}

export async function disconnect() {
  const token = await readToken();
  if (token) {
    try {
      await postForm(cfg().revokeUrl, { token: token.refreshToken }); // best effort
    } catch {
      // Offline or already revoked — still forget it locally.
    }
  }
  cached = null;
  await deleteToken();
}

// ------------------------------------------------------------ access tokens

let cached: { token: string; expires: number } | null = null;

async function getAccessToken(force = false): Promise<string> {
  const c = cfg();
  if (!c.clientId || !c.clientSecret) throw new DriveError("not_configured", "Google credentials aren't set up yet.");
  const stored = await readToken();
  if (!stored) throw new DriveError("not_connected", "Google Drive isn't connected.");

  if (!force && cached && cached.expires > Date.now() + 60_000) return cached.token;

  const { res, json } = await postForm(c.tokenUrl, {
    client_id: c.clientId,
    client_secret: c.clientSecret,
    refresh_token: stored.refreshToken,
    grant_type: "refresh_token",
  });
  if (!res.ok) {
    if (json.error === "invalid_grant") {
      // Revoked, or expired (Google expires tokens after 7 days while the OAuth
      // app is still in "Testing"). Forget it so the UI offers "Connect" again.
      await deleteToken();
      cached = null;
      throw new DriveError("auth", "Google Drive access expired or was revoked. Connect it again.");
    }
    throw new DriveError("api", `Google token error (${json.error_description ?? json.error ?? res.status}).`);
  }
  cached = { token: json.access_token as string, expires: Date.now() + Number(json.expires_in ?? 3600) * 1000 };
  return cached.token;
}

// Authenticated fetch that refreshes the token once on a 401.
async function driveFetch(url: string, init: RequestInit = {}, retried = false): Promise<Response> {
  const token = await getAccessToken(retried);
  const res = await fetch(url, { ...init, headers: { ...(init.headers as Record<string, string>), Authorization: `Bearer ${token}` } });
  if (res.status === 401 && !retried) return driveFetch(url, init, true);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new DriveError("api", `Drive error ${res.status}: ${body.error?.message ?? res.statusText}`);
  }
  return res;
}

// ------------------------------------------------------------------ folders

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

async function findOrCreateFolder(name: string, parentId: string | null): Promise<string> {
  const c = cfg();
  const q = `mimeType='application/vnd.google-apps.folder' and name='${esc(name)}' and trashed=false and '${parentId ?? "root"}' in parents`;
  const found = await driveFetch(`${c.driveApi}/files?${new URLSearchParams({ q, fields: "files(id,name)", pageSize: "1", spaces: "drive" })}`);
  const existing = ((await found.json()) as { files?: { id: string }[] }).files?.[0];
  if (existing) return existing.id;

  const created = await driveFetch(`${c.driveApi}/files?fields=id`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      ...(parentId ? { parents: [parentId] } : {}),
    }),
  });
  return ((await created.json()) as { id: string }).id;
}

// "Locker Documents" / "Education" / "SSLC (10th Standard)" … — created once, then remembered.
// A remembered folder is re-checked: if you deleted or trashed it on Drive, the
// stale id is dropped and the folder is created again.
async function ensureFolderPath(segments: string[]): Promise<string> {
  const state = await readUploads();
  const leafKey = segments.join("/");
  const cachedLeaf = state.folders[leafKey];
  if (cachedLeaf && !(await isLive(cachedLeaf))) {
    await updateUploads((s) => {
      for (const k of Object.keys(s.folders)) {
        if (k === leafKey || k.startsWith(leafKey + "/")) delete s.folders[k];
      }
      // Files recorded inside that folder are gone from Drive with it.
      // Match whole path segments: "Education" must not also take "Education 2".
      for (const rel of Object.keys(s.files)) {
        const folder = [DRIVE_ROOT_FOLDER, ...rel.split("/").slice(0, -1)].join("/");
        if (folder === leafKey || folder.startsWith(leafKey + "/")) delete s.files[rel];
      }
    });
  }

  const fresh = await readUploads();
  let parentId: string | null = null;
  for (let i = 0; i < segments.length; i++) {
    const key = segments.slice(0, i + 1).join("/");
    let id: string | undefined = fresh.folders[key];
    if (!id) {
      id = await findOrCreateFolder(segments[i], parentId);
      const known = id;
      await updateUploads((s) => {
        s.folders[key] = known;
      });
    }
    parentId = id;
  }
  return parentId!;
}

// ------------------------------------------------------------------ uploading

export type UploadOutcome = {
  fileId: string;
  url: string;
  reused: boolean;
  /** Set when a previous upload of this file had been deleted on Drive and was replaced. */
  replacedFileId?: string;
};

// Uploads run strictly one at a time. Two at once would race on the upload
// record (a lost update) and on "find or create this Drive folder" (two
// identical folders).
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined); // a failure must not block the next upload
  return run;
}

// Does this Drive file/folder still exist and sit outside the trash?
async function isLive(id: string): Promise<boolean> {
  const c = cfg();
  try {
    const res = await driveFetch(`${c.driveApi}/files/${encodeURIComponent(id)}?fields=id,trashed`);
    return !((await res.json()) as { trashed?: boolean }).trashed;
  } catch (err) {
    // 404 = deleted for good. Any other error (network, quota) must not be
    // mistaken for "gone" — that would re-upload everything.
    if (err instanceof DriveError && / 404:/.test(err.message)) return false;
    throw err;
  }
}

// Resumable upload: works for any size, and never leaves a half-created file
// behind if the transfer fails (Drive only creates it when the data arrives).
export function uploadLocalFile(rel: string, absPath: string, mimeType: string): Promise<UploadOutcome> {
  return serial(() => uploadLocalFileNow(rel, absPath, mimeType));
}

async function uploadLocalFileNow(rel: string, absPath: string, mimeType: string): Promise<UploadOutcome> {
  const stat = await fs.stat(absPath);
  const uploads = await readUploads();
  const already = uploads.files[rel];
  let replacedFileId: string | undefined;
  if (already && already.size === stat.size) {
    // Only trust the record if the file is still on Drive (you may have deleted it there).
    if (await isLive(already.fileId)) return { fileId: already.fileId, url: already.url, reused: true };
    replacedFileId = already.fileId;
    await updateUploads((s) => {
      delete s.files[rel];
    });
  }

  const c = cfg();
  const segments = rel.split("/");
  const name = segments[segments.length - 1];
  const folderId = await ensureFolderPath([DRIVE_ROOT_FOLDER, ...segments.slice(0, -1)]);

  const init = await driveFetch(`${c.uploadApi}/files?uploadType=resumable&fields=id`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": mimeType,
      "X-Upload-Content-Length": String(stat.size),
    },
    body: JSON.stringify({ name, parents: [folderId] }),
  });
  const location = init.headers.get("location");
  if (!location) throw new DriveError("api", "Drive didn't return an upload address.");

  const data = await fs.readFile(absPath);
  const put = await driveFetch(location, {
    method: "PUT",
    headers: { "Content-Type": mimeType, "Content-Length": String(data.byteLength) },
    body: new Uint8Array(data),
  });
  const fileId = ((await put.json()) as { id?: string }).id;
  if (!fileId) throw new DriveError("api", "Drive accepted the upload but returned no file id.");

  const record: UploadRecord = { fileId, url: driveOpenUrl(fileId), size: stat.size, uploadedAt: new Date().toISOString() };
  await updateUploads((s) => {
    s.files[rel] = record;
  });
  return { fileId, url: record.url, reused: false, replacedFileId };
}
