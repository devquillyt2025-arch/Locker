"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";

// The app router has no route-change events, so this starts on any click of
// an internal link (or the "locker:navstart" event, for programmatic
// router.push calls) and finishes when the URL actually changes.
export const NAV_START_EVENT = "locker:navstart";

export function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams().toString();

  const [progress, setProgress] = React.useState(0);
  const [visible, setVisible] = React.useState(false);
  const active = React.useRef(false);
  const trickle = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const safety = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const hide = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = React.useCallback(() => {
    if (trickle.current) clearInterval(trickle.current);
    if (safety.current) clearTimeout(safety.current);
    trickle.current = safety.current = null;
  }, []);

  const finish = React.useCallback(() => {
    if (!active.current) return;
    active.current = false;
    clearTimers();
    setProgress(100);
    hide.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 280);
  }, [clearTimers]);

  const start = React.useCallback(() => {
    if (active.current) return;
    active.current = true;
    if (hide.current) clearTimeout(hide.current);
    setVisible(true);
    setProgress(10);
    // Ease toward 90% but never reach it; finish() takes it the rest of the way.
    trickle.current = setInterval(() => setProgress((p) => p + (90 - p) * 0.09), 180);
    // If the navigation never lands (aborted, error), don't hang forever.
    safety.current = setTimeout(finish, 12000);
  }, [finish]);

  // URL changed -> navigation is done.
  React.useEffect(() => {
    finish();
  }, [pathname, search, finish]);

  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Same URL = no navigation, so no completion signal would ever come.
      if (url.pathname + url.search === window.location.pathname + window.location.search) return;
      start();
    }
    document.addEventListener("click", onClick);
    window.addEventListener(NAV_START_EVENT, start);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener(NAV_START_EVENT, start);
      clearTimers();
      if (hide.current) clearTimeout(hide.current);
    };
  }, [start, clearTimers]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px]"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 250ms ease" }}
    >
      <div
        className="h-full rounded-r-full bg-primary shadow-[0_0_10px_var(--primary)]"
        style={{
          width: `${progress}%`,
          transition: progress === 0 ? "none" : "width 220ms ease-out",
        }}
      />
    </div>
  );
}
