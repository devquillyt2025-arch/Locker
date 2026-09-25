import { cookies } from "next/headers";
import { listCards } from "@/lib/cards";
import { requireUser } from "@/lib/auth";
import { withRetry } from "@/lib/retry";
import { AppShell } from "@/components/shell/app-shell";
import { CardsProvider } from "@/components/cards/cards-store";

// The whole vault is loaded once here and handed to the client (see
// CardsProvider). This layout reads the collapsed-sidebar cookie and the
// session, so it renders per request — but it does NOT re-run when you
// navigate between pages, only on a full load or after a save/delete
// revalidates it.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [cards, cookieStore] = await Promise.all([
    withRetry(() => listCards(user.id)),
    cookies(),
  ]);

  return (
    <CardsProvider cards={cards}>
      <AppShell
        email={user.email}
        defaultCollapsed={cookieStore.get("locker_sidebar")?.value === "collapsed"}
      >
        {children}
      </AppShell>
    </CardsProvider>
  );
}
