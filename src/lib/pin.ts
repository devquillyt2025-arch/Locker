import { createHash, timingSafeEqual } from "node:crypto";

// Login PIN, part 2: checking a guess, and slowing down wrong ones.
//
// A 4-digit PIN has only 10,000 possibilities, so on its own it would fall to a
// script in minutes. The defence is the lock-out below: after FREE_TRIES wrong
// guesses in a row, every further wrong guess doubles the wait (30 s, 1 min,
// 2 min ... capped at 15 min), and while locked the PIN isn't even compared, so
// the lock can't be used to probe for the right answer.
//
// The counter is kept in memory, once for the whole app (there is a single
// owner, and a per-IP key would be defeated by a spoofed header). That is
// exact on a local `npm run dev` / `next start`; on serverless hosting each
// instance counts for itself, so treat it as best-effort there.

export type PinCheck = { ok: true } | { ok: false; error: string };

const FREE_TRIES = 5;
const BASE_LOCK_S = 30;
const MAX_LOCK_S = 15 * 60;
const FORGET_AFTER_MS = 60 * 60 * 1000;
const MAX_INPUT = 64;

type Throttle = { fails: number; lastFail: number; lockedUntil: number };
const g = globalThis as typeof globalThis & { __lockerPinThrottle?: Throttle };
const throttle = () => (g.__lockerPinThrottle ??= { fails: 0, lastFail: 0, lockedUntil: 0 });

const digest = (s: string) => createHash("sha256").update(s).digest();

function wait(seconds: number): string {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? "" : "s"}`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

export function checkPin(input: string, now = Date.now()): PinCheck {
  const expected = process.env.LOCKER_PIN ?? "";
  if (!expected) return { ok: false, error: "PIN login isn't set up on this server." };

  const t = throttle();
  if (now - t.lastFail > FORGET_AFTER_MS) {
    t.fails = 0;
    t.lockedUntil = 0;
  }
  if (now < t.lockedUntil) {
    return { ok: false, error: `Too many wrong PINs. Try again in ${wait(Math.ceil((t.lockedUntil - now) / 1000))}.` };
  }

  // Hash both sides so the comparison is constant-time regardless of length.
  if (input.length <= MAX_INPUT && timingSafeEqual(digest(input), digest(expected))) {
    t.fails = 0;
    t.lockedUntil = 0;
    return { ok: true };
  }

  t.fails += 1;
  t.lastFail = now;
  if (t.fails >= FREE_TRIES) {
    const lock = Math.min(MAX_LOCK_S, BASE_LOCK_S * 2 ** (t.fails - FREE_TRIES));
    t.lockedUntil = now + lock * 1000;
    return { ok: false, error: `Wrong PIN. Locked for ${wait(lock)}.` };
  }
  const left = FREE_TRIES - t.fails;
  return { ok: false, error: `Wrong PIN. ${left} ${left === 1 ? "try" : "tries"} left before a short lock.` };
}
