"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Menu, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sidebar } from "./sidebar";
import { NavProgress } from "./nav-progress";
import { GlobalSearch } from "@/components/search/global-search";
import { useAppSearch } from "@/components/search/app-search-provider";

const COOKIE = "locker_sidebar";

export function AppShell({
  email,
  defaultCollapsed,
  children,
}: {
  email: string;
  defaultCollapsed: boolean;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const mainRef = React.useRef<HTMLElement>(null);
  const pathname = usePathname();
  const { isOpen: searchOpen, setOpen: setSearchOpen } = useAppSearch();

  // Persisted in a cookie (not localStorage) so the server renders the
  // right width on first paint — no expand->collapse flash on reload.
  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${COOKIE}=${next ? "collapsed" : "expanded"}; path=/; max-age=31536000; samesite=lax`;
  }

  // The scroll container is <main>, not the window, so a client-side route
  // change has to reset its scroll itself.
  React.useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  React.useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background">
      <NavProgress />
      {/* Mobile backdrop */}
      <div
        aria-hidden
        onClick={() => setMobileOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] transition-opacity md:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 border-r border-sidebar-border transition-transform duration-200 md:static md:z-auto md:translate-x-0 md:transition-[width]",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "md:w-14" : "md:w-64 lg:w-72"
        )}
      >
        <Sidebar
          email={email}
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
          onCloseMobile={() => setMobileOpen(false)}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3 md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            title="Open menu"
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            <Menu className="size-5" />
          </button>
          <span className="flex items-center gap-2 font-serif text-lg font-medium">
            <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Lock className="size-3.5" />
            </span>
            Locker
          </span>
        </header>

        <main ref={mainRef} className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
