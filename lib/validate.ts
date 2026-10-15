import { assertUnlocked } from "@/lib/lock";
import { isValidISODate } from "@/lib/stats";
import {
  CONTENT_TYPES,
  METRIC_LABEL,
  METRICS,
  POST_STATUSES,
  type ActionResult,
  type ContentType,
  type PostInput,
  type PostStatus,
} from "@/lib/types";

/**
 * Input checks for Server Actions. Actions are public POST endpoints, so
 * every value from the browser is checked here before it reaches the database.
 */

export class InputError extends Error {}

export function text(value: unknown, label: string, opts: { required?: boolean; max?: number } = {}) {
  const s = typeof value === "string" ? value.trim() : "";
  if (opts.required && !s) throw new InputError(`${label} is required.`);
  if (s.length > (opts.max ?? 500)) throw new InputError(`${label} is too long.`);
  return s || null;
}

export function requiredText(value: unknown, label: string, max = 500): string {
  return text(value, label, { required: true, max }) as string;
}

export function wholeNumber(value: unknown, label: string, max = 100000): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n) || n < 0 || n > max) {
    throw new InputError(`${label} must be a whole number from 0 to ${max}.`);
  }
  return n;
}

/** A count that may be left empty, e.g. views. */
export function optionalCount(value: unknown, label: string): number | null {
  if (value === null || value === undefined || value === "") return null;
  return wholeNumber(value, label, 2_000_000_000);
}

/** Pages in a carousel: empty, or 1 to 20 (Instagram's limit). */
export function optionalPages(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = wholeNumber(value, "Pages", 20);
  if (n < 1) throw new InputError("Pages must be from 1 to 20.");
  return n;
}

export function optionalDate(value: unknown, label: string): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || !isValidISODate(value)) {
    throw new InputError(`${label} is not a valid date.`);
  }
  return value;
}

export function uuid(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^[0-9a-f-]{36}$/i.test(value)) {
    throw new InputError(`${label} is missing.`);
  }
  return value;
}

export function optionalUuid(value: unknown, label: string): string | null {
  if (value === null || value === undefined || value === "") return null;
  return uuid(value, label);
}

export function hexColor(value: unknown): string {
  if (typeof value !== "string" || !/^#[0-9a-f]{6}$/i.test(value)) {
    throw new InputError("Pick a colour.");
  }
  return value.toUpperCase();
}

export function weekdays(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const days = [...new Set(value.map(Number))].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  return days.sort((a, b) => a - b);
}

export function postInput(raw: Partial<Record<keyof PostInput, unknown>>): PostInput {
  const status = raw.status as PostStatus;
  if (!POST_STATUSES.includes(status)) throw new InputError("Pick a status.");
  const content_type = raw.content_type as ContentType;
  if (!CONTENT_TYPES.includes(content_type)) throw new InputError("Pick a type.");
  const post_date = optionalDate(raw.post_date, "Date");
  if (!post_date && status !== "idea") throw new InputError("Pick a date.");
  const people = Array.isArray(raw.people)
    ? [...new Set(raw.people.map((p) => String(p).trim()).filter(Boolean))].slice(0, 30)
    : [];
  const input: PostInput = {
    brand_id: uuid(raw.brand_id, "Brand"),
    post_date,
    title: requiredText(raw.title, "Content / product", 300),
    content_type,
    slide_count: content_type === "carousel" ? optionalPages(raw.slide_count) : null,
    status,
    skip_reason: status === "skipped" ? text(raw.skip_reason, "Reason") : null,
    festival_id: optionalUuid(raw.festival_id, "Festival"),
    post_url: text(raw.post_url, "Post link", { max: 1000 }),
    people,
    notes: text(raw.notes, "Notes", { max: 4000 }),
    rescheduled_from: optionalDate(raw.rescheduled_from, "Rescheduled from"),
  };
  // Results are only sent when they were edited, so other saves never wipe them.
  if (METRICS.some((m) => m in raw)) {
    for (const m of METRICS) input[m] = optionalCount(raw[m], METRIC_LABEL[m]);
    input.metrics_updated_at = new Date().toISOString();
  }
  return input;
}

/**
 * Runs an action body and turns any thrown error into `{ ok: false }`.
 * Refuses when the app is PIN-locked on this device.
 */
export async function attempt<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    await assertUnlocked();
    return { ok: true, data: await fn() };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong.";
    console.error("[action]", message);
    return { ok: false, error: message };
  }
}
