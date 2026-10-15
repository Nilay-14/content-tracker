import { isValid, parse } from "date-fns";
import { toISODate, type ISODate } from "@/lib/ist";
import { normalizeTitle } from "@/lib/suggest";
import type { ContentType, Festival } from "@/lib/types";

/**
 * Turns one brand tab of the old Google Sheet (downloaded as CSV) into
 * entries. Rules: BUILD_PROMPTS.md, step 12. Safe to import from the browser.
 */

export type ImportStatus = "posted" | "skipped" | "planned";

export type ImportRow = {
  /** Row number in the file, for messages. */
  line: number;
  post_date: ISODate;
  title: string;
  notes: string | null;
  content_type: ContentType;
  slide_count: number | null;
  status: ImportStatus;
  festival_id: string | null;
};

export type SkippedRow = { line: number; reason: string; text: string };

export const IMPORT_SKIP_REASON = "Not posted (imported)";
export const MAX_IMPORT_ROWS = 400;

/** Splits CSV text into rows of cells (handles quotes, commas and line breaks in cells). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

const DATE_FORMATS = ["dd-MMM-yyyy", "d-MMM-yyyy", "dd-MMM-yy", "yyyy-MM-dd", "dd/MM/yyyy", "d/M/yyyy", "d MMM yyyy"];

/** "01-Sep-2026 (Tue)" or "01-Sep-2026" → "2026-09-01"; null if not a date. */
export function parseSheetDate(value: string): ISODate | null {
  const text = value.replace(/\(.*\)/, "").trim();
  if (!text) return null;
  for (const f of DATE_FORMATS) {
    const d = parse(text, f, new Date(2000, 0, 1));
    if (isValid(d) && d.getFullYear() > 2000) return toISODate(d);
  }
  return null;
}

/** "Cocoland Toys - Video 3", "Plush - Post 5", "Creative post 1": a label with a number, not real content. */
export function isPlaceholder(content: string): boolean {
  return /^(?:[^-–]+\s[-–]\s*)?(?:video|post|reel|creative post|static post)\s*\d+$/i.test(content.trim());
}

/** Reel unless the text says carousel or static. */
export function guessType(text: string): ContentType {
  const t = text.toLowerCase();
  if (/car+ou?sel|crou?sel/.test(t)) return "carousel";
  if (/static|creative post|poster|offer post/.test(t)) return "static";
  return "reel";
}

/** "Crousel post including 12 post" → 12. Only for carousels; 1 to 20. */
export function guessPages(text: string): number | null {
  const m = text.match(/(\d{1,2})\s*(?:posts?|pages?|slides?|images?|pics?|photos?)\b/i);
  const n = m ? Number(m[1]) : NaN;
  return n >= 1 && n <= 20 ? n : null;
}

const FESTIVAL_ALIASES: Record<string, string[]> = {
  "ganesh chaturthi": ["ganpati", "ganapati", "ganesh"],
  diwali: ["deepavali"],
  "new year": ["newyear"],
};

/** A festival named in the text (longest name wins), with Ganpati → Ganesh Chaturthi. */
export function guessFestival(text: string, festivals: Festival[]): string | null {
  const t = text.toLowerCase();
  let best: { id: string; len: number } | null = null;
  for (const f of festivals) {
    const name = f.name.toLowerCase();
    const words = [name, ...(FESTIVAL_ALIASES[name] ?? [])];
    for (const w of words) {
      if (t.includes(w) && (!best || w.length > best.len)) best = { id: f.id, len: w.length };
    }
  }
  return best?.id ?? null;
}

function statusFrom(posted: string): ImportStatus | null {
  const v = posted.trim().toLowerCase();
  if (!v) return null;
  if (["true", "done", "yes", "posted", "y", "✓", "✔"].includes(v)) return "posted";
  if (["false", "no", "n", "not posted"].includes(v)) return "skipped";
  return null;
}

export type SheetResult = {
  rows: ImportRow[];
  skipped: SkippedRow[];
  /** The text above the header row, e.g. "Cocoland Toys — September 2026", to guess the brand. */
  heading: string;
  error?: string;
};

/** Reads one brand tab. Nothing is saved here. */
export function readSheet(text: string, festivals: Festival[]): SheetResult {
  const table = parseCsv(text);
  const clean = (s: string | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
  const headerAt = table.findIndex(
    (r) => r.some((c) => clean(c).toLowerCase() === "date") && r.some((c) => /content/i.test(c)),
  );
  if (headerAt < 0) {
    return {
      rows: [],
      skipped: [],
      heading: "",
      error: "This doesn't look like a brand tab: no header row with Date and Video / Content.",
    };
  }
  const header = table[headerAt].map((c) => clean(c).toLowerCase());
  const col = {
    date: header.indexOf("date"),
    content: header.findIndex((c) => c.includes("content")),
    posted: header.findIndex((c) => c.startsWith("posted")),
    notes: header.findIndex((c) => c.startsWith("note")),
  };
  const heading = table
    .slice(0, headerAt)
    .map((r) => r.join(" "))
    .join(" ");

  const rows: ImportRow[] = [];
  const skipped: SkippedRow[] = [];
  const seen = new Set<string>();

  table.slice(headerAt + 1).forEach((r, i) => {
    const line = headerAt + i + 2;
    const raw = r.map(clean);
    const text = raw.filter(Boolean).join(" · ");
    if (!text) return; // blank line
    if (raw.some((c) => c.includes("#REF!"))) {
      skipped.push({ line, reason: "Contains #REF!", text });
      return;
    }
    const content = raw[col.content] ?? "";
    const notes = col.notes >= 0 ? (raw[col.notes] ?? "") : "";
    const posted = col.posted >= 0 ? (raw[col.posted] ?? "") : "";
    if (!content && !notes) {
      skipped.push({ line, reason: "Empty row", text });
      return;
    }
    const post_date = parseSheetDate(raw[col.date] ?? "");
    if (!post_date) {
      skipped.push({ line, reason: "Date not understood", text });
      return;
    }

    const placeholder = !content || isPlaceholder(content);
    const title = placeholder ? notes || content : content;
    const keptNotes = placeholder ? null : notes || null;
    const both = `${content} ${notes}`;
    const content_type = guessType(both);
    const status = statusFrom(posted) ?? "planned";

    const key = `${post_date}|${normalizeTitle(title)}`;
    if (seen.has(key)) {
      skipped.push({ line, reason: "Same date and title earlier in this file", text });
      return;
    }
    seen.add(key);

    rows.push({
      line,
      post_date,
      title: title.slice(0, 300),
      notes: keptNotes,
      content_type,
      slide_count: content_type === "carousel" ? guessPages(both) : null,
      status,
      festival_id: guessFestival(both, festivals),
    });
  });

  return { rows, skipped, heading };
}
