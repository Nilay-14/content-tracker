"use server";

import { changed } from "@/lib/changed";
import { assertUnlocked, checkPin, forgetDevice, getLock, rememberDevice, savePin } from "@/lib/lock";
import type { ActionResult } from "@/lib/types";

function cleanPin(value: unknown): string {
  const pin = typeof value === "string" ? value.trim() : "";
  if (!/^\d{4,8}$/.test(pin)) throw new Error("The PIN is 4 to 8 digits.");
  return pin;
}

async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

function pinError(check: Awaited<ReturnType<typeof checkPin>>): string {
  if (check.ok) return "";
  if (check.reason === "wait") return `Too many wrong tries. Try again in ${check.minutes} min.`;
  return `Wrong PIN. ${check.triesLeft} ${check.triesLeft === 1 ? "try" : "tries"} left.`;
}

/** The PIN screen: on the right PIN, this device stays unlocked for a year. */
export async function unlock(pin: string): Promise<ActionResult> {
  return run(async () => {
    const check = await checkPin(cleanPin(pin));
    if (!check.ok) throw new Error(pinError(check));
    const lock = await getLock();
    if (lock?.pin_hash) await rememberDevice(lock.pin_hash);
  });
}

/**
 * Sets or changes the PIN (Setup). Changing needs the current PIN.
 * This device stays unlocked; every other device has to enter the new PIN.
 */
export async function setPin(newPin: string, currentPin: string | null): Promise<ActionResult> {
  const result = await run(async () => {
    await assertUnlocked();
    const pin = cleanPin(newPin);
    const lock = await getLock();
    if (lock?.pin_hash) {
      const check = await checkPin(cleanPin(currentPin ?? ""));
      if (!check.ok) throw new Error(pinError(check));
    }
    const hash = await savePin(pin);
    await rememberDevice(hash!);
  });
  changed();
  return result;
}

/** Turns the PIN lock off (needs the current PIN). */
export async function removePin(currentPin: string): Promise<ActionResult> {
  const result = await run(async () => {
    await assertUnlocked();
    const check = await checkPin(cleanPin(currentPin));
    if (!check.ok) throw new Error(pinError(check));
    await savePin(null);
    await forgetDevice();
  });
  changed();
  return result;
}

/** Locks this device: it needs the PIN again next time. */
export async function lockDevice(): Promise<ActionResult> {
  return run(async () => {
    await forgetDevice();
  });
}
