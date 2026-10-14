import { addDays, format, parseISO, startOfMonth } from "date-fns";

/**
 * Date helpers that always work in India time (Asia/Kolkata).
 *
 * Dates are passed around as "yyyy-MM-dd" strings, the same shape as a
 * Postgres `date` column. Never use `new Date().toISOString()` for "today":
 * Vercel runs in UTC, so between 00:00 and 05:30 IST that gives yesterday.
 */

export const IST_TIME_ZONE = "Asia/Kolkata";

/** A calendar date with no time, e.g. "2026-10-14". */
export type ISODate = string;

const istParts = new Intl.DateTimeFormat("en-US", {
  timeZone: IST_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today's date in IST, e.g. "2026-10-14". */
export function todayIST(now: Date = new Date()): ISODate {
  const parts = Object.fromEntries(
    istParts.formatToParts(now).map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** Turns "2026-10-14" into a Date at local midnight, for date-fns maths. */
export function fromISODate(date: ISODate): Date {
  return parseISO(date);
}

/** Turns a Date back into "yyyy-MM-dd" using its calendar day. */
export function toISODate(date: Date): ISODate {
  return format(date, "yyyy-MM-dd");
}

/** "2026-10-14" → "14-Oct-2026 (Wed)", the style the old sheet used. */
export function formatDisplayDate(date: ISODate): string {
  return format(fromISODate(date), "dd-MMM-yyyy (EEE)");
}

/** "2026-10-05" → "5-Oct", for compact lists. */
export function formatShortDate(date: ISODate): string {
  return format(fromISODate(date), "d-MMM");
}

export function addDaysISO(date: ISODate, days: number): ISODate {
  return toISODate(addDays(fromISODate(date), days));
}

/** First day of the month containing `date`, e.g. "2026-10-01". */
export function monthStartISO(date: ISODate): ISODate {
  return toISODate(startOfMonth(fromISODate(date)));
}
