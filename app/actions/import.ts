"use server";

import { refresh } from "next/cache";
import * as posts from "@/lib/db/posts";
import { IMPORT_SKIP_REASON, MAX_IMPORT_ROWS, type ImportRow } from "@/lib/import";
import { normalizeTitle } from "@/lib/suggest";
import type { ActionResult } from "@/lib/types";
import { attempt, InputError, postInput, uuid } from "@/lib/validate";

export type ImportResult = {
  imported: number;
  /** Rows already in the app (same brand, date and title). */
  duplicates: { line: number; title: string; post_date: string }[];
};

/** Saves the previewed rows of one brand tab. Rows already in the app are skipped. */
export async function importPosts(brandId: string, rows: ImportRow[]): Promise<ActionResult<ImportResult>> {
  const result = await attempt(async () => {
    const brand_id = uuid(brandId, "Brand");
    if (!Array.isArray(rows) || rows.length === 0) throw new InputError("There's nothing to import.");
    if (rows.length > MAX_IMPORT_ROWS) throw new InputError(`Import at most ${MAX_IMPORT_ROWS} rows at a time.`);

    const checked = rows.map((r) => {
      const status = r.status === "posted" || r.status === "skipped" ? r.status : "planned";
      return {
        line: Number(r.line) || 0,
        input: postInput({
          brand_id,
          post_date: r.post_date,
          title: r.title,
          content_type: r.content_type,
          slide_count: r.slide_count,
          status,
          skip_reason: status === "skipped" ? IMPORT_SKIP_REASON : null,
          festival_id: r.festival_id,
          post_url: null,
          people: [],
          notes: r.notes,
        }),
      };
    });

    const dates = checked.map((c) => c.input.post_date!).sort();
    const existing = await posts.listPostsBetween(dates[0], dates[dates.length - 1], { brandId: brand_id });
    const taken = new Set(existing.map((p) => `${p.post_date}|${normalizeTitle(p.title)}`));

    const duplicates: ImportResult["duplicates"] = [];
    const fresh = checked.filter(({ line, input }) => {
      const key = `${input.post_date}|${normalizeTitle(input.title)}`;
      if (taken.has(key)) {
        duplicates.push({ line, title: input.title, post_date: input.post_date! });
        return false;
      }
      taken.add(key);
      return true;
    });

    if (fresh.length > 0) await posts.createPosts(fresh.map((f) => f.input));
    return { imported: fresh.length, duplicates };
  });
  refresh();
  return result;
}
