import { getDaysInMonth } from "date-fns";
import {
  addDaysISO,
  fromISODate,
  monthStartISO,
  toISODate,
  type ISODate,
} from "@/lib/ist";
import {
  CONTENT_TYPES,
  IN_PROGRESS_STATUSES,
  type Brand,
  type BrandMonthTarget,
  type ContentType,
  type Post,
} from "@/lib/types";

/**
 * Every number the app shows is calculated here, from raw rows, on each page
 * load. See CLAUDE.md → Definitions. Never store totals in the database.
 */

// --- Months -----------------------------------------------------------------

/** "2026-10" (URL form) → "2026-10-01". Falls back to `fallback` if invalid. */
export function parseMonthParam(value: string | undefined, fallback: ISODate): ISODate {
  if (value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return `${value}-01`;
  return monthStartISO(fallback);
}

/** "2026-10-01" → "2026-10" (URL form). */
export function monthParam(month: ISODate): string {
  return month.slice(0, 7);
}

export function monthEndISO(month: ISODate): ISODate {
  const start = fromISODate(month);
  return toISODate(new Date(start.getFullYear(), start.getMonth(), getDaysInMonth(start)));
}

export function shiftMonth(month: ISODate, delta: number): ISODate {
  const start = fromISODate(month);
  return toISODate(new Date(start.getFullYear(), start.getMonth() + delta, 1));
}

export function daysOfMonth(month: ISODate): ISODate[] {
  const count = getDaysInMonth(fromISODate(month));
  return Array.from({ length: count }, (_, i) => addDaysISO(month, i));
}

export type MonthKind = "past" | "current" | "future";

export function monthKind(month: ISODate, today: ISODate): MonthKind {
  const current = monthStartISO(today);
  if (month < current) return "past";
  if (month > current) return "future";
  return "current";
}

/** 0 = Sunday … 6 = Saturday. */
export function weekday(date: ISODate): number {
  return fromISODate(date).getDay();
}

export function isValidISODate(value: string | undefined): value is ISODate {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(fromISODate(value).getTime()));
}

// --- Monthly numbers --------------------------------------------------------

/** The month's target: the one-month override if set, else the brand default. */
export function targetFor(
  brand: Brand,
  month: ISODate,
  overrides: BrandMonthTarget[],
): number {
  const override = overrides.find((o) => o.brand_id === brand.id && o.month === month);
  return override ? override.target : brand.monthly_target;
}

export type Pace =
  | { kind: "on-track" }
  | { kind: "behind"; by: number }
  | { kind: "done" }
  | { kind: "short"; by: number }
  | { kind: "none" };

export function computePace(
  target: number,
  posted: number,
  month: ISODate,
  today: ISODate,
): Pace {
  const kind = monthKind(month, today);
  if (kind === "future") return { kind: "none" };
  if (kind === "past") {
    return posted >= target ? { kind: "done" } : { kind: "short", by: target - posted };
  }
  const day = fromISODate(today).getDate();
  const days = getDaysInMonth(fromISODate(month));
  const expected = Math.round((target * day) / days);
  return posted >= expected
    ? { kind: "on-track" }
    : { kind: "behind", by: expected - posted };
}

export function paceLabel(pace: Pace): string {
  switch (pace.kind) {
    case "on-track":
      return "On track";
    case "behind":
      return `Behind by ${pace.by}`;
    case "done":
      return "Done";
    case "short":
      return `Short by ${pace.by}`;
    case "none":
      return "—";
  }
}

/** good / warn / neutral, for colouring the pace badge. */
export function paceTone(pace: Pace): "good" | "warn" | "neutral" {
  if (pace.kind === "on-track" || pace.kind === "done") return "good";
  if (pace.kind === "behind" || pace.kind === "short") return "warn";
  return "neutral";
}

/**
 * The monthly target counts posted REELS only. Statics, carousels, stories and
 * festival posts are counted and shown, but don't count toward the target.
 */
export type MonthNumbers = {
  target: number;
  /** Posted reels: what counts toward the target. */
  reels: number;
  /** Every posted entry, of any type. */
  posted: number;
  byType: Record<ContentType, number>;
  /** Pages across all posted carousels. They also count as statics (see `typeCount`). */
  carouselPages: number;
  festival: number;
  /** Target − reels, never below 0. */
  pending: number;
  /** Reels ÷ Target × 100, or null when the target is 0. */
  pct: number | null;
  pace: Pace;
};

function emptyByType(): Record<ContentType, number> {
  return Object.fromEntries(CONTENT_TYPES.map((t) => [t, 0])) as Record<ContentType, number>;
}

function finish(
  target: number,
  posted: number,
  byType: Record<ContentType, number>,
  carouselPages: number,
  festival: number,
  month: ISODate,
  today: ISODate,
): MonthNumbers {
  const reels = byType.reel;
  return {
    target,
    reels,
    posted,
    byType,
    carouselPages,
    festival,
    pending: Math.max(target - reels, 0),
    pct: target > 0 ? (reels / target) * 100 : null,
    pace: computePace(target, reels, month, today),
  };
}

/**
 * Numbers for one brand in one month. `posts` may contain other brands and
 * dates; only this brand's posted entries dated in `month` are counted.
 */
export function monthNumbers(
  brand: Brand,
  month: ISODate,
  posts: Post[],
  overrides: BrandMonthTarget[],
  today: ISODate,
): MonthNumbers {
  const end = monthEndISO(month);
  const byType = emptyByType();
  let posted = 0;
  let carouselPages = 0;
  let festival = 0;
  for (const p of posts) {
    if (p.brand_id !== brand.id || p.status !== "posted") continue;
    if (!p.post_date || p.post_date < month || p.post_date > end) continue;
    posted += 1;
    byType[p.content_type] += 1;
    if (p.content_type === "carousel") carouselPages += p.slide_count ?? 0;
    if (p.festival_id) festival += 1;
  }
  return finish(targetFor(brand, month, overrides), posted, byType, carouselPages, festival, month, today);
}

/** The Total row: sums across brands, with % and pace worked out from the sums. */
export function totalNumbers(rows: MonthNumbers[], month: ISODate, today: ISODate): MonthNumbers {
  const byType = emptyByType();
  let target = 0;
  let posted = 0;
  let carouselPages = 0;
  let festival = 0;
  for (const r of rows) {
    target += r.target;
    posted += r.posted;
    carouselPages += r.carouselPages;
    festival += r.festival;
    for (const t of CONTENT_TYPES) byType[t] += r.byType[t];
  }
  return finish(target, posted, byType, carouselPages, festival, month, today);
}

/**
 * The number shown for a type. Statics = single static posts plus every page
 * of the posted carousels (5 carousels of 7 pages and 3 statics → 38 statics).
 */
export function typeCount(n: MonthNumbers, type: ContentType): number {
  return type === "static" ? n.byType.static + n.carouselPages : n.byType[type];
}

export function formatPct(pct: number | null): string {
  return pct === null ? "—" : `${pct.toFixed(1)}%`;
}

// --- Performance results -------------------------------------------------------

/** A brand's posted entries dated in `month` that have views, most views first. */
export function topPosts(posts: Post[], brandId: string, month: ISODate, limit = 5): Post[] {
  const end = monthEndISO(month);
  return posts
    .filter(
      (p) =>
        p.brand_id === brandId &&
        p.status === "posted" &&
        p.views !== null &&
        p.post_date &&
        p.post_date >= month &&
        p.post_date <= end,
    )
    .sort((a, b) => b.views! - a.views! || (b.likes ?? 0) - (a.likes ?? 0))
    .slice(0, limit);
}

const compact = new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 });

/** 1234 → "1.2K", 150000 → "1.5L". */
export function formatCount(n: number | null): string {
  return n === null ? "—" : compact.format(n);
}

// --- Preferred days, missed and due ------------------------------------------

export function hasPreferredDays(brand: Brand): boolean {
  return brand.preferred_days.length > 0;
}

export function isPreferredDay(brand: Brand, date: ISODate): boolean {
  return brand.preferred_days.includes(weekday(date));
}

/**
 * A missed day: a preferred day before today with no posted or skipped entry
 * for the brand, and no entry pointing to it through `rescheduled_from`.
 * `posts` should hold the brand's entries for the month, plus any entries
 * whose `rescheduled_from` falls in the month.
 */
export function isMissedDay(brand: Brand, date: ISODate, posts: Post[], today: ISODate): boolean {
  if (date >= today || !isPreferredDay(brand, date)) return false;
  return !posts.some(
    (p) =>
      p.brand_id === brand.id &&
      ((p.post_date === date && (p.status === "posted" || p.status === "skipped")) ||
        p.rescheduled_from === date),
  );
}

export function missedDays(brand: Brand, month: ISODate, posts: Post[], today: ISODate): ISODate[] {
  if (!hasPreferredDays(brand)) return [];
  return daysOfMonth(month).filter((d) => isMissedDay(brand, d, posts, today));
}

/** Today is a preferred day and nothing is posted yet. */
export function isDueToday(brand: Brand, posts: Post[], today: ISODate): boolean {
  return (
    isPreferredDay(brand, today) &&
    !posts.some((p) => p.brand_id === brand.id && p.post_date === today && p.status === "posted")
  );
}

// --- Calendar day states ------------------------------------------------------

export type DayState =
  /** A reel was posted: counts toward the target. */
  | "reel"
  /** Something was posted, but no reel (static, carousel, story…). */
  | "other"
  | "in-progress"
  | "idea"
  | "skipped"
  | "missed"
  | "rescheduled"
  | "due"
  | "empty";

export function dayState(brand: Brand, date: ISODate, posts: Post[], today: ISODate): DayState {
  const onDay = posts.filter((p) => p.brand_id === brand.id && p.post_date === date);
  if (onDay.some((p) => p.status === "posted" && p.content_type === "reel")) return "reel";
  if (onDay.some((p) => p.status === "posted")) return "other";
  if (onDay.some((p) => p.status === "skipped")) return "skipped";
  if (posts.some((p) => p.brand_id === brand.id && p.rescheduled_from === date)) {
    return "rescheduled";
  }
  if (isMissedDay(brand, date, posts, today)) return "missed";
  if (onDay.some((p) => IN_PROGRESS_STATUSES.includes(p.status))) return "in-progress";
  if (onDay.some((p) => p.status === "idea")) return "idea";
  if (date === today && isPreferredDay(brand, date)) return "due";
  return "empty";
}
