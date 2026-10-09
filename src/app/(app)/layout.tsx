import { cookies } from "next/headers";
import { listCards, listTrashedCards } from "@/lib/cards";
import { listTrashedDocs } from "@/lib/docs-trash";
import { listDocuments } from "@/lib/docs";
import { getDriveStatus } from "@/lib/drive";
import { readUploads } from "@/lib/drive-store";
import { requireUser } from "@/lib/auth";
import { withRetry } from "@/lib/retry";
import { AppShell } from "@/components/shell/app-shell";
import { CardsProvider } from "@/components/cards/cards-store";
import { DocsProvider } from "@/components/docs/docs-store";
import { TrashProvider } from "@/components/trash/trash-store";

// The whole vault is loaded once here and handed to the client (see
// CardsProvider). This layout reads the collapsed-sidebar cookie and the
// session, so it renders per request — but it does NOT re-run when you
// navigate between pages, only on a full load or after a save/delete
// revalidates it.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [cards, trashedCards, trashedDocs, docsIndex, drive, uploadState, cookieStore] = await Promise.all([
    withRetry(() => listCards(user.id)),
    withRetry(() => listTrashedCards(user.id)),
    listTrashedDocs().catch(() => []), // the Trash folder is optional local data

    listDocuments(), // never throws: reports "not available" if there is no docs folder
    getDriveStatus(),
    readUploads(),
    cookies(),
  ]);
  const uploads = Object.fromEntries(
    Object.entries(uploadState.files).map(([rel, u]) => [rel, { fileId: u.fileId, url: u.url }])
  );
  const docs = { ...docsIndex, drive, uploads };

  return (
    <CardsProvider cards={cards}>
      <TrashProvider trash={{ cards: trashedCards, docs: trashedDocs }}>
      <DocsProvider docs={docs}>
        <AppShell
          email={user.email}
          defaultCollapsed={cookieStore.get("locker_sidebar")?.value === "collapsed"}
        >
          {children}
        </AppShell>
      </DocsProvider>
      </TrashProvider>
    </CardsProvider>
  );
}
