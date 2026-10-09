import { DOC_TOP_ORDER, type DocFile } from "@/lib/docs-types";

// Turns the flat list of documents into the folder tree the Structure page
// draws. Pure functions, no I/O — safe on the client.

export type TreeFolder = {
  name: string;
  /** Folder path relative to docs/ ("" never occurs; loose files use LOOSE). */
  path: string;
  children: TreeFolder[];
  /** Files sitting directly in this folder. */
  files: DocFile[];
  /** Files in this folder and everything below it. */
  count: number;
};

export const LOOSE = "(loose files)";

const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

export function buildTree(files: DocFile[]): TreeFolder[] {
  const root: TreeFolder = { name: "", path: "", children: [], files: [], count: 0 };

  for (const file of files) {
    const segments = file.folder ? file.folder.split("/") : [LOOSE];
    let node = root;
    let path = "";
    for (const seg of segments) {
      path = path ? `${path}/${seg}` : seg;
      let child = node.children.find((c) => c.name === seg);
      if (!child) {
        child = { name: seg, path, children: [], files: [], count: 0 };
        node.children.push(child);
      }
      node = child;
    }
    node.files.push(file);
  }

  const rank = (name: string) => {
    const i = (DOC_TOP_ORDER as readonly string[]).indexOf(name);
    return i === -1 ? DOC_TOP_ORDER.length : i;
  };

  function finish(node: TreeFolder, top: boolean): number {
    node.files.sort((a, b) => collator.compare(a.name, b.name));
    node.children.sort((a, b) =>
      top ? rank(a.name) - rank(b.name) || collator.compare(a.name, b.name) : collator.compare(a.name, b.name)
    );
    node.count = node.files.length + node.children.reduce((n, c) => n + finish(c, false), 0);
    return node.count;
  }
  finish(root, true);
  return root.children;
}

/**
 * Keeps only the files that match every search word (in name, path or
 * description), and only the folders that still contain a match. Counts are
 * recomputed for what's left.
 */
export function filterTree(folders: TreeFolder[], query: string): TreeFolder[] {
  const tokens = norm(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return folders;

  const keep = (f: TreeFolder): TreeFolder | null => {
    const files = f.files.filter((file) => {
      const hay = norm(`${file.path} ${file.description} ${file.original ?? ""}`);
      return tokens.every((t) => hay.includes(t));
    });
    const children = f.children.map(keep).filter((c): c is TreeFolder => c !== null);
    if (files.length === 0 && children.length === 0) return null;
    return { ...f, files, children, count: files.length + children.reduce((n, c) => n + c.count, 0) };
  };
  return folders.map(keep).filter((f): f is TreeFolder => f !== null);
}

/** Every folder path in the tree (used for "expand all"). */
export function allFolderPaths(folders: TreeFolder[]): string[] {
  const out: string[] = [];
  const walk = (f: TreeFolder) => {
    out.push(f.path);
    f.children.forEach(walk);
  };
  folders.forEach(walk);
  return out;
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** One-line "what lives here" for each top-level section. */
export const SECTION_INFO: Record<string, string> = {
  Identity: "Who you are on paper — Aadhaar, PAN, driving licence, photos and signature.",
  Education: "School and degree certificates, MBA exams, CET/KEA counselling, scholarships and courses.",
  "Government Certificates": "Caste and income certificates.",
  Banking: "Passbooks, statements, mandate forms and family accounts.",
  Finance: "Loans and credit reports.",
  Medical: "Health papers and prescriptions.",
  Housing: "PG and rent receipts.",
  Purchases: "Invoices, warranties and offers.",
  Career: "Resumes, job applications and each employer's documents.",
  Reference: "Reading material that isn't yours — books, public lists, legal notices.",
  Inbox: "Drop new files here; they get sorted into the right place.",
  "Needs Review": "Duplicates, other people's papers and sensitive items — waiting for your decision.",
};
