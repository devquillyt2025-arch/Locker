import { promises as fs } from "node:fs";
import path from "node:path";

// Small local state for the Google Drive integration. It lives in <project>/data
// (git-ignored), NOT in the database: the refresh token is a credential, and
// this app runs on one machine.
//
//   data/google-drive.json   the refresh token + which Google account
//   data/drive-uploads.json  which local files are already on Drive, and the
//                            Drive folder ids (so re-running never duplicates)
//
// LOCKER_DATA_DIR overrides the folder (used by tests).

const dataDir = () => process.env.LOCKER_DATA_DIR ?? path.join(process.cwd(), "data");
const tokenFile = () => path.join(dataDir(), "google-drive.json");
const uploadsFile = () => path.join(dataDir(), "drive-uploads.json");

export type StoredToken = { refreshToken: string; email: string | null; connectedAt: string };

export type UploadRecord = { fileId: string; url: string; size: number; uploadedAt: string };
export type UploadsState = {
  /** Drive folder ids by mirrored path, e.g. "Locker Documents/Education". */
  folders: Record<string, string>;
  /** Upload records by path relative to docs/. */
  files: Record<string, UploadRecord>;
};

// Write via a temp file + rename so a crash can't leave half a JSON file.
async function writeJson(file: string, data: unknown, mode?: number) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), { encoding: "utf8", mode });
  await fs.rename(tmp, file);
}

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch {
    return null;
  }
}

export const readToken = () => readJson<StoredToken>(tokenFile());
export const writeToken = (t: StoredToken) => writeJson(tokenFile(), t, 0o600);
export async function deleteToken() {
  await fs.rm(tokenFile(), { force: true });
}

export async function readUploads(): Promise<UploadsState> {
  const state = await readJson<Partial<UploadsState>>(uploadsFile());
  return { folders: state?.folders ?? {}, files: state?.files ?? {} };
}

// Read-modify-write. Uploads run one at a time, so there is no concurrent writer.
export async function updateUploads(fn: (state: UploadsState) => void): Promise<UploadsState> {
  const state = await readUploads();
  fn(state);
  await writeJson(uploadsFile(), state);
  return state;
}
