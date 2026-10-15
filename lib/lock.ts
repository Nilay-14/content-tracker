import "server-only";
import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";

/**
 * The optional PIN lock. When a PIN is set (on Setup), every page and every
 * save needs this device to have been unlocked once. Share links don't.
 *
 * Only a salted scrypt hash of the PIN is stored. The device remembers it with
 * an httpOnly cookie signed with the server's secret key; changing or removing
 * the PIN makes every old cookie stop working.
 */

export const UNLOCK_COOKIE = "ct_unlock";
const MAX_TRIES = 5;
const WAIT_MINUTES = 15;

type LockRow = {
  pin_hash: string | null;
  pin_salt: string | null;
  failed_attempts: number;
  locked_until: string | null;
};

/** The settings row, once per request. Null if the table isn't there yet (no lock). */
export const getLock = cache(async (): Promise<LockRow | null> => {
  const { data, error } = await db()
    .from("app_settings")
    .select("pin_hash, pin_salt, failed_attempts, locked_until")
    .eq("id", 1)
    .maybeSingle();
  if (error) {
    // Migration 0003 not run yet: behave as "no PIN".
    if (error.code === "42P01" || error.code === "PGRST205") return null;
    throw new Error(`Loading the PIN setting: ${error.message}`);
  }
  return data;
});

function secret(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Server secret missing.");
  return key;
}

function cookieValue(pinHash: string): string {
  return createHmac("sha256", secret()).update(`unlock:${pinHash}`).digest("base64url");
}

function same(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function hashPin(pin: string, salt: string): Promise<string> {
  return new Promise((resolve, reject) =>
    scrypt(pin, salt, 32, (err, key) => (err ? reject(err) : resolve(key.toString("base64url")))),
  );
}

export function newSalt(): string {
  return randomBytes(16).toString("base64url");
}

export async function hasPin(): Promise<boolean> {
  return Boolean((await getLock())?.pin_hash);
}

/** True when there's no PIN, or this device has unlocked with the current one. */
export async function isUnlocked(): Promise<boolean> {
  const lock = await getLock();
  if (!lock?.pin_hash) return true;
  const value = (await cookies()).get(UNLOCK_COOKIE)?.value;
  return Boolean(value) && same(value!, cookieValue(lock.pin_hash));
}

/** For pages: go to the PIN screen when locked. */
export async function requireUnlocked() {
  if (!(await isUnlocked())) redirect("/unlock");
}

/** For saves: refuse when locked. */
export async function assertUnlocked() {
  if (!(await isUnlocked())) throw new Error("The app is locked. Reopen it and enter your PIN.");
}

/** Remembers on this device that it's unlocked (for a year). Server Functions only. */
export async function rememberDevice(pinHash: string) {
  (await cookies()).set(UNLOCK_COOKIE, cookieValue(pinHash), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function forgetDevice() {
  (await cookies()).delete(UNLOCK_COOKIE);
}

export type PinCheck = { ok: true } | { ok: false; reason: "wrong" | "wait"; minutes?: number; triesLeft?: number };

/** Checks a PIN, counting wrong tries: after 5 in a row, wait 15 minutes. */
export async function checkPin(pin: string): Promise<PinCheck> {
  const lock = await getLock();
  if (!lock?.pin_hash || !lock.pin_salt) return { ok: true };
  const now = Date.now();
  if (lock.locked_until && new Date(lock.locked_until).getTime() > now) {
    return { ok: false, reason: "wait", minutes: Math.ceil((new Date(lock.locked_until).getTime() - now) / 60000) };
  }
  const ok = same(await hashPin(pin, lock.pin_salt), lock.pin_hash);
  if (ok) {
    if (lock.failed_attempts > 0 || lock.locked_until) {
      await db().from("app_settings").update({ failed_attempts: 0, locked_until: null }).eq("id", 1);
    }
    return { ok: true };
  }
  const tries = lock.failed_attempts + 1;
  const blocked = tries >= MAX_TRIES;
  await db()
    .from("app_settings")
    .update({
      failed_attempts: blocked ? 0 : tries,
      locked_until: blocked ? new Date(now + WAIT_MINUTES * 60000).toISOString() : null,
    })
    .eq("id", 1);
  return blocked
    ? { ok: false, reason: "wait", minutes: WAIT_MINUTES }
    : { ok: false, reason: "wrong", triesLeft: MAX_TRIES - tries };
}

/** Saves a new PIN (or removes it with null) and returns the new hash. */
export async function savePin(pin: string | null): Promise<string | null> {
  const salt = pin ? newSalt() : null;
  const pin_hash = pin ? await hashPin(pin, salt!) : null;
  const { error } = await db()
    .from("app_settings")
    .upsert({ id: 1, pin_hash, pin_salt: salt, failed_attempts: 0, locked_until: null });
  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") {
      throw new Error("The PIN needs a database update first: run supabase/migrations/0003 in Supabase.");
    }
    throw new Error(`Saving the PIN: ${error.message}`);
  }
  return pin_hash;
}
