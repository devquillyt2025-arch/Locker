import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { addLinkToCard, cardLinkState, deleteLinkRows, linkRowsByUrl } from "@/lib/cards";
import { DOCS_ROOT, resolveAnyDocFile } from "@/lib/docs-fs";
import { fileUrlFromRelPath, type TrashedDoc } from "@/lib/docs-types";

// Trash for document FILES.
//
// "Move to Trash" never deletes anything: the file is moved to
//   docs/.trash/files/<id>/<original name>
// and everything needed to undo it is written to docs/.trash/index.json —
// where the file was, its description, and which cards linked to it. Restoring
// puts the file back (and re-attaches it to those cards). Only purge()
// really deletes, and only for files that are already in the Trash.
//
// docs/ is git-ignored and hidden folders are never listed, served or uploaded.

const TRASH_DIR = path.join(DOCS_ROOT, ".trash");
const FILES_DIR = path.join(TRASH_DIR, "files");
const INDEX_FILE = path.join(TRASH_DIR, "index.json");
const MANIFEST_FILE = path.join(DOCS_ROOT, ".manifest.json");

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------- small IO helpers

async function writeJsonAtomic(file: string, data: unknown) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmp, file);
}

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch {
    return null;
  }
}

const exists = (p: string) =>
  fs.access(p).then(
    () => true,
    () => false
  );

// One writer at a time: index.json is read-modify-written.
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

async function readIndex(): Promise<TrashedDoc[]> {
  return (await readJson<{ items?: TrashedDoc[] }>(INDEX_FILE))?.items ?? [];
}
const writeIndex = (items: TrashedDoc[]) => writeJsonAtomic(INDEX_FILE, { items });

type ManifestEntry = { path: string; what?: string; orig?: string };
type Manifest = { entries: ManifestEntry[]; notes?: string[] };

async function readManifest(): Promise<Manifest | null> {
  return readJson<Manifest>(MANIFEST_FILE);
}

// ------------------------------------------------------------------------ public API

export type DocTrashResult = { ok: true; doc: TrashedDoc } | { ok: false; error: string };
export type DocRestoreResult =
  | { ok: true; restoredTo: string; renamed: boolean; linksRestored: number }
  | { ok: false; error: string };

/** Files currently in the Trash, newest first. Entries whose file vanished are dropped from the list. */
export async function listTrashedDocs(): Promise<TrashedDoc[]> {
  const items = await readIndex();
  const present = await Promise.all(items.map((i) => exists(path.join(FILES_DIR, i.id, i.name))));
  return items.filter((_, n) => present[n]).sort((a, b) => b.trashedAt.localeCompare(a.trashedAt));
}

export function trashDoc(userId: string, rel: string): Promise<DocTrashResult> {
  return serial(async () => {
    const resolved = await resolveAnyDocFile(rel);
    if (!resolved) return { ok: false, error: "That file isn't in the documents folder." };
    const relPath = resolved.rel;

    const stat = await fs.stat(resolved.file);
    const name = path.basename(relPath);
    const url = fileUrlFromRelPath(relPath);
    const linkRows = await linkRowsByUrl(userId, url);
    const manifest = await readManifest();
    const entry = manifest?.entries.find((e) => e.path === relPath) ?? null;

    const id = randomUUID();
    const doc: TrashedDoc = {
      id,
      originalPath: relPath,
      name,
      trashedAt: new Date().toISOString(),
      size: stat.size,
      description: entry?.what ?? "",
      original: entry?.orig ?? null,
      links: linkRows.map((l) => ({
        cardId: l.cardId,
        label: l.label,
        kind: l.kind,
        source: l.source,
      })),
    };

    // 1) record the undo information first, 2) move the file, 3) detach it from
    // cards, 4) drop its manifest entry. If a step fails, the earlier ones are undone.
    const items = await readIndex();
    await writeIndex([...items, doc]);
    const dest = path.join(FILES_DIR, id, name);
    try {
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.rename(resolved.file, dest);
    } catch (err) {
      await writeIndex(items);
      await fs.rm(path.dirname(dest), { recursive: true, force: true });
      console.error("trashDoc: move failed", err);
      return { ok: false, error: "Couldn't move the file to the Trash. Nothing was changed." };
    }
    try {
      await deleteLinkRows(userId, linkRows.map((l) => l.id));
    } catch (err) {
      await fs.rename(dest, resolved.file).catch(() => undefined);
      await writeIndex(items);
      await fs.rm(path.dirname(dest), { recursive: true, force: true });
      console.error("trashDoc: detaching links failed", err);
      return { ok: false, error: "Couldn't detach the file from its cards. Nothing was changed." };
    }
    if (manifest && entry) {
      manifest.entries = manifest.entries.filter((e) => e.path !== relPath);
      await writeJsonAtomic(MANIFEST_FILE, manifest).catch((e) => console.error("trashDoc: manifest update failed", e));
    }
    return { ok: true, doc };
  });
}

export function restoreDoc(userId: string, trashId: string): Promise<DocRestoreResult> {
  return serial(async () => {
    if (!UUID.test(trashId)) return { ok: false, error: "That item isn't in the Trash." };
    const items = await readIndex();
    const doc = items.find((i) => i.id === trashId);
    if (!doc) return { ok: false, error: "That item isn't in the Trash." };

    const stored = path.join(FILES_DIR, doc.id, doc.name);
    if (!(await exists(stored))) return { ok: false, error: "The trashed file is missing from disk." };

    // Where to put it back: the original spot, or a "(restored)" name if that's taken.
    const dir = path.posix.dirname(doc.originalPath);
    const ext = path.posix.extname(doc.name);
    const base = path.posix.basename(doc.name, ext);
    let finalRel = doc.originalPath;
    let n = 0;
    while (await exists(path.join(DOCS_ROOT, ...finalRel.split("/")))) {
      n += 1;
      const candidate = `${base} (restored${n > 1 ? " " + n : ""})${ext}`;
      finalRel = dir === "." ? candidate : `${dir}/${candidate}`;
    }
    const target = path.join(DOCS_ROOT, ...finalRel.split("/"));
    // Belt and braces: never write outside docs/.
    if (!target.startsWith(DOCS_ROOT + path.sep)) return { ok: false, error: "Invalid original location." };

    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.rename(stored, target);

    // Re-attach to the cards that had it (skipping cards deleted for good, or already linked).
    const url = fileUrlFromRelPath(finalRel);
    let linksRestored = 0;
    for (const l of doc.links) {
      try {
        const st = await cardLinkState(userId, l.cardId, url);
        if (!st.exists || st.hasUrl) continue;
        await addLinkToCard(
          userId,
          l.cardId,
          { label: l.label, url, source: l.source ?? "other", driveFileId: null, kind: l.kind },
          { allowTrashed: true }
        );
        linksRestored += 1;
      } catch (err) {
        console.error("restoreDoc: re-linking failed", err);
      }
    }

    await writeIndex(items.filter((i) => i.id !== doc.id));
    await fs.rm(path.join(FILES_DIR, doc.id), { recursive: true, force: true });

    const manifest = await readManifest();
    if (manifest && (doc.description || doc.original) && !manifest.entries.some((e) => e.path === finalRel)) {
      manifest.entries.push({ path: finalRel, what: doc.description, orig: doc.original ?? doc.name });
      await writeJsonAtomic(MANIFEST_FILE, manifest).catch((e) => console.error("restoreDoc: manifest update failed", e));
    }
    return { ok: true, restoredTo: finalRel, renamed: finalRel !== doc.originalPath, linksRestored };
  });
}

/** Permanently deletes one trashed file. Only ever touches docs/.trash/files/<id>. */
export function purgeDoc(trashId: string): Promise<{ ok: boolean; error?: string }> {
  return serial(async () => {
    if (!UUID.test(trashId)) return { ok: false, error: "That item isn't in the Trash." };
    const items = await readIndex();
    if (!items.some((i) => i.id === trashId)) return { ok: false, error: "That item isn't in the Trash." };
    await fs.rm(path.join(FILES_DIR, trashId), { recursive: true, force: true });
    await writeIndex(items.filter((i) => i.id !== trashId));
    return { ok: true };
  });
}

/** Permanently deletes every trashed file. Returns how many. */
export function emptyDocTrash(): Promise<number> {
  return serial(async () => {
    const items = await readIndex();
    for (const i of items) {
      if (UUID.test(i.id)) await fs.rm(path.join(FILES_DIR, i.id), { recursive: true, force: true });
    }
    await writeIndex([]);
    return items.length;
  });
}
