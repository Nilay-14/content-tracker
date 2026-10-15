import { differenceInCalendarDays } from "date-fns";
import { formatShortDate, fromISODate, type ISODate } from "@/lib/ist";
import type { PostStatus } from "@/lib/types";

/**
 * Typing help for the entry form: earlier titles and people to pick from,
 * and the 30-day repeat warning. Safe to import from client components.
 */

/** One earlier entry of a brand, newest first. Just what the hints need. */
export type HistoryRow = {
  id: string;
  title: string;
  post_date: ISODate | null;
  status: PostStatus;
};

export type EntryHints = {
  /** This brand's entries from the last year, newest first. */
  history: HistoryRow[];
  /** People from every brand's entries, most used first. */
  people: string[];
};

export const REPEAT_WINDOW_DAYS = 30;

/** Titles match ignoring case and extra spaces. */
export function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Earlier titles for this brand matching what's typed: starts-with first, then contains. */
export function titleSuggestions(history: HistoryRow[], typed: string, limit = 5): string[] {
  const q = normalizeTitle(typed);
  if (!q) return [];
  const seen = new Set<string>();
  const starts: string[] = [];
  const contains: string[] = [];
  for (const row of history) {
    const key = normalizeTitle(row.title);
    if (seen.has(key) || key === q) continue;
    seen.add(key);
    if (key.startsWith(q)) starts.push(row.title.trim());
    else if (key.includes(q)) contains.push(row.title.trim());
  }
  return [...starts, ...contains].slice(0, limit);
}

/** People matching what's typed (or the most used ones), minus those already added. */
export function peopleSuggestions(people: string[], typed: string, chosen: string[], limit = 6): string[] {
  const q = typed.trim().toLowerCase();
  const taken = new Set(chosen.map((p) => p.toLowerCase()));
  return people
    .filter((p) => !taken.has(p.toLowerCase()) && (!q || p.toLowerCase().includes(q)))
    .slice(0, limit);
}

/**
 * "Last posted 13-Sep (21 days ago)" when the same title was posted for this
 * brand in the 30 days up to `date`. Never blocks saving.
 */
export function repeatWarning(
  history: HistoryRow[],
  title: string,
  date: ISODate,
  excludeId?: string,
): string | null {
  const key = normalizeTitle(title);
  if (!key) return null;
  const last = history.find(
    (row) =>
      row.id !== excludeId &&
      row.status === "posted" &&
      row.post_date &&
      row.post_date <= date &&
      normalizeTitle(row.title) === key &&
      differenceInCalendarDays(fromISODate(date), fromISODate(row.post_date)) <= REPEAT_WINDOW_DAYS,
  );
  if (!last?.post_date) return null;
  const days = differenceInCalendarDays(fromISODate(date), fromISODate(last.post_date));
  const ago = days === 0 ? "same day" : days === 1 ? "1 day ago" : `${days} days ago`;
  return `Last posted ${formatShortDate(last.post_date)} (${ago})`;
}
