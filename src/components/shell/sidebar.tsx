"use client";

import { AppLink as Link } from "@/components/shell/app-link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ChevronsUpDown,
  Home,
  LayoutGrid,
  LogOut,
  Monitor,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Sun,
  Lock,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import { CARD_TYPES } from "@/db/schema";
import { CARD_TYPE_META } from "@/lib/card-types";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/app/actions";
import { useAppSearch } from "@/components/search/app-search-provider";
import { useCards } from "@/components/cards/cards-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SidebarProps = {
  email: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onCloseMobile: () => void;
};

const RECENTS_LIMIT = 14;

export function Sidebar({
  email,
  collapsed,
  onToggleCollapsed,
  onCloseMobile,
}: SidebarProps) {
  const { cards, counts } = useCards();
  const pathname = usePathname();
  const activeType = useSearchParams().get("type");
  const { open: openSearch } = useAppSearch();
  const { theme, setTheme } = useTheme();

  // On desktop the rail collapses to icons; on mobile the drawer is always
  // full-width, so every "hide when collapsed" rule is scoped to md+.
  const hideWhenCollapsed = collapsed ? "md:hidden" : "";

  const isHome = pathname === "/";
  const isAllCards = pathname === "/cards" && !activeType;
  const activeCardId = pathname.startsWith("/cards/")
    ? pathname.split("/")[2]
    : undefined;

  const usedTypes = CARD_TYPES.filter((t) => (counts[t] ?? 0) > 0);
  const recents = cards.slice(0, RECENTS_LIMIT);
  const initial = (email[0] ?? "?").toUpperCase();

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <div
        className={cn(
          "flex h-14 shrink-0 items-center gap-2 px-3",
          collapsed && "md:justify-center md:px-0"
        )}
      >
        <Link
          href="/"
          onClick={onCloseMobile}
          className={cn(
            "flex items-center gap-2 rounded-lg px-1.5 py-1 font-serif text-xl font-medium tracking-tight",
            collapsed && "md:hidden"
          )}
        >
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Lock className="size-4" />
          </span>
          Locker
        </Link>
        <button
          type="button"
          onClick={onToggleCollapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "ml-auto hidden size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground md:flex",
            collapsed && "md:ml-0"
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-[18px]" />
          ) : (
            <PanelLeftClose className="size-[18px]" />
          )}
        </button>
        <button
          type="button"
          onClick={onCloseMobile}
          title="Close menu"
          className="ml-auto flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent md:hidden"
        >
          <X className="size-[18px]" />
        </button>
      </div>

      {/* Primary actions */}
      <div className={cn("space-y-0.5 px-2", collapsed && "md:px-2")}>
        <NavItem
          href="/cards/new"
          icon={Plus}
          label="New card"
          collapsed={collapsed}
          onNavigate={onCloseMobile}
          accent
        />
        <button
          type="button"
          onClick={() => {
            onCloseMobile();
            openSearch();
          }}
          title="Search (Ctrl K)"
          className={cn(
            "group flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm text-sidebar-foreground/85 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            collapsed && "md:justify-center md:px-0"
          )}
        >
          <Search className="size-[18px] shrink-0" />
          <span className={cn("flex-1 text-left", hideWhenCollapsed)}>Search</span>
          <kbd
            className={cn(
              "rounded border border-sidebar-border px-1.5 py-px font-mono text-[10px] text-muted-foreground",
              hideWhenCollapsed
            )}
          >
            Ctrl K
          </kbd>
        </button>
        <NavItem
          href="/"
          icon={Home}
          label="Home"
          active={isHome}
          collapsed={collapsed}
          onNavigate={onCloseMobile}
        />
        <NavItem
          href="/cards"
          icon={LayoutGrid}
          label="All cards"
          active={isAllCards}
          count={cards.length}
          collapsed={collapsed}
          onNavigate={onCloseMobile}
        />
      </div>

      {/* Scrollable lists */}
      <div className={cn("mt-4 min-h-0 flex-1 overflow-y-auto px-2 pb-3", collapsed && "md:hidden")}>
        {usedTypes.length > 0 && (
          <section className="mb-5">
            <SectionLabel>Categories</SectionLabel>
            <div className="space-y-0.5">
              {usedTypes.map((t) => {
                const meta = CARD_TYPE_META[t];
                return (
                  <NavItem
                    key={t}
                    href={`/cards?type=${t}`}
                    icon={meta.icon}
                    label={meta.plural}
                    count={counts[t]}
                    active={pathname === "/cards" && activeType === t}
                    collapsed={false}
                    onNavigate={onCloseMobile}
                    small
                  />
                );
              })}
            </div>
          </section>
        )}

        <section>
          <SectionLabel>Recents</SectionLabel>
          {recents.length === 0 ? (
            <p className="px-2.5 text-xs text-muted-foreground">
              Cards you add will show up here.
            </p>
          ) : (
            <div className="space-y-0.5">
              {recents.map((c) => (
                <Link
                  key={c.id}
                  href={`/cards/${c.id}`}
                  onClick={onCloseMobile}
                  title={c.title}
                  className={cn(
                    "block truncate rounded-lg px-2.5 py-1.5 text-[13px] text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    activeCardId === c.id &&
                      "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  )}
                >
                  {c.title}
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Spacer keeps the footer pinned when the rail is collapsed */}
      {collapsed && <div className="hidden flex-1 md:block" />}

      {/* Account */}
      <div className="shrink-0 border-t border-sidebar-border p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors hover:bg-sidebar-accent",
                collapsed && "md:justify-center"
              )}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-medium text-primary">
                {initial}
              </span>
              <span className={cn("min-w-0 flex-1", hideWhenCollapsed)}>
                <span className="block truncate text-[13px] font-medium">{email}</span>
                <span className="block text-[11px] text-muted-foreground">Personal vault</span>
              </span>
              <ChevronsUpDown
                className={cn("size-4 shrink-0 text-muted-foreground", hideWhenCollapsed)}
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-60">
            <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
              {email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setTheme("light")}>
              <Sun /> Light {theme === "light" && <Check />}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setTheme("dark")}>
              <Moon /> Dark {theme === "dark" && <Check />}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setTheme("system")}>
              <Monitor /> System {theme === "system" && <Check />}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => void signOutAction()}>
              <LogOut /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function Check() {
  return <span className="ml-auto text-xs text-primary">●</span>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-1 px-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </h3>
  );
}

function NavItem({
  href,
  icon: Icon,
  label,
  count,
  active,
  accent,
  small,
  collapsed,
  onNavigate,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count?: number;
  active?: boolean;
  accent?: boolean;
  small?: boolean;
  collapsed: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      title={label}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors",
        small ? "h-8 text-[13px]" : "h-9",
        collapsed && "md:justify-center md:px-0",
        accent
          ? "font-medium text-foreground hover:bg-sidebar-accent"
          : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        active && "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
      )}
    >
      {accent ? (
        <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Icon className="size-3.5" />
        </span>
      ) : (
        <Icon className="size-[18px] shrink-0" />
      )}
      <span className={cn("flex-1 truncate", collapsed && "md:hidden")}>{label}</span>
      {count !== undefined && (
        <span className={cn("text-xs tabular-nums text-muted-foreground", collapsed && "md:hidden")}>
          {count}
        </span>
      )}
    </Link>
  );
}
