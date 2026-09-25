"use client";

import * as React from "react";

// In-app navigation without a server round trip.
//
// Every page in the app is a client view over data the layout already
// loaded (see CardsProvider / AppRoutes), so there's nothing for the server
// to do on a click. Next.js patches history.pushState/replaceState to sync
// usePathname()/useSearchParams(), which lets us switch views instantly.
// Anything unusual (new tab, modifier keys, click before hydration) falls
// through to a normal link, so it degrades to a regular page load.

export function navigate(href: string, opts?: { replace?: boolean }) {
  const current = window.location.pathname + window.location.search;
  if (href === current) return;
  if (opts?.replace) window.history.replaceState(null, "", href);
  else window.history.pushState(null, "", href);
}

export function AppLink({
  href,
  replace,
  onClick,
  target,
  ...props
}: Omit<React.ComponentProps<"a">, "href"> & { href: string; replace?: boolean }) {
  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    onClick?.(e);
    if (
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey ||
      (target && target !== "_self")
    ) {
      return;
    }
    e.preventDefault();
    navigate(href, { replace });
  }

  return <a href={href} target={target} onClick={handleClick} {...props} />;
}
