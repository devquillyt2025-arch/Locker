import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// false while rendering on the server and during hydration, true afterwards.
// Use it to render something only in the browser (React never compares the
// browser-only output with server HTML, so it can't produce a hydration
// mismatch — even if an extension has rewritten the server HTML).
export function useMounted(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
