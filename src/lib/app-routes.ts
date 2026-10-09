// The one place that says which URLs are real pages inside the app shell.
// Used by the server (so an unknown URL is a real 404, not a 200) and by the
// client router (so both always agree).

export type AppRoute =
  | { kind: "home" }
  | { kind: "cards" }
  | { kind: "new-card" }
  | { kind: "card"; id: string }
  | { kind: "edit-card"; id: string }
  | { kind: "recents" }
  | { kind: "documents" }
  | { kind: "structure" }
  | { kind: "reports" }
  | { kind: "trash" };

// Card ids are UUIDs; anything else can't be a card.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `parts` = the URL path split on "/", already decoded, with empty parts removed. */
export function matchAppRoute(parts: string[]): AppRoute | null {
  if (parts.length === 0) return { kind: "home" };
  const [a, b, c] = parts;

  if (a === "recents" && parts.length === 1) return { kind: "recents" };
  if (a === "documents" && parts.length === 1) return { kind: "documents" };
  if (a === "structure" && parts.length === 1) return { kind: "structure" };
  if (a === "reports" && parts.length === 1) return { kind: "reports" };
  if (a === "trash" && parts.length === 1) return { kind: "trash" };

  if (a === "cards") {
    if (parts.length === 1) return { kind: "cards" };
    if (parts.length === 2 && b === "new") return { kind: "new-card" };
    if (parts.length === 2 && UUID.test(b)) return { kind: "card", id: b };
    if (parts.length === 3 && c === "edit" && UUID.test(b)) return { kind: "edit-card", id: b };
  }
  return null;
}
