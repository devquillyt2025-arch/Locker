// Login PIN, part 1: the signed "I entered the PIN" cookie.
//
// The middleware runs on the Edge runtime, so this file uses Web Crypto only
// (no node:crypto) and is safe to import from there, from Server Actions and
// from route handlers alike. Checking a PIN guess and throttling wrong ones is
// Node-side work and lives in pin.ts.
//
// The PIN itself comes from the LOCKER_PIN env var — never from source, because
// this repository is public. When LOCKER_PIN is empty the PIN gate is off and
// the original sign-in flow (Google / SKIP_AUTH) applies.

export const PIN_COOKIE = "locker_pin";
export const PIN_SESSION_SECONDS = 30 * 24 * 60 * 60;

export function pinEnabled(): boolean {
  return (process.env.LOCKER_PIN ?? "").length > 0;
}

const enc = new TextEncoder();

// The signing key mixes the optional PIN_SESSION_SECRET with the PIN, so
// changing the PIN immediately invalidates every cookie signed with the old one.
function signingKey(usage: KeyUsage) {
  const material = `${process.env.PIN_SESSION_SECRET ?? ""}\n${process.env.LOCKER_PIN ?? ""}`;
  return crypto.subtle.importKey("raw", enc.encode(material), { name: "HMAC", hash: "SHA-256" }, false, [usage]);
}

const payload = (expires: string) => enc.encode(`locker-pin.${expires}`);

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> | null {
  if (hex.length === 0 || hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/** A cookie value of the form `<expiry ms>.<hmac hex>`. */
export async function createSessionToken(now = Date.now()): Promise<string> {
  const expires = String(now + PIN_SESSION_SECONDS * 1000);
  const sig = await crypto.subtle.sign("HMAC", await signingKey("sign"), payload(expires));
  return `${expires}.${toHex(sig)}`;
}

/** True only for an unexpired cookie signed with the current PIN (compared in constant time by Web Crypto). */
export async function verifySessionToken(token: string | undefined, now = Date.now()): Promise<boolean> {
  if (!token || !pinEnabled()) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [expires, sig] = parts;
  if (!/^\d{1,15}$/.test(expires) || Number(expires) <= now) return false;
  const bytes = fromHex(sig);
  if (!bytes) return false;
  return crypto.subtle.verify("HMAC", await signingKey("verify"), bytes, payload(expires));
}
