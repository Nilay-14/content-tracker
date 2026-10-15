import { format } from "date-fns";
import { formatShortDate, fromISODate, type ISODate } from "@/lib/ist";
import { formatPct, monthKind, paceLabel, type MonthNumbers } from "@/lib/stats";
import { CONTENT_TYPE_LABEL, CONTENT_TYPE_PLURAL, type ContentType } from "@/lib/types";

/**
 * The month as a short message for WhatsApp (*bold* is WhatsApp's bold):
 *
 *   *Content update · October 2026* (till 16-Oct)
 *   *Cocoland Toys:* 12/33 reels (36.4%) · Behind by 4
 *   + 1 story, 1 festival post
 */
export function whatsappSummary(
  month: ISODate,
  today: ISODate,
  rows: { name: string; numbers: MonthNumbers }[],
  total: MonthNumbers,
): string {
  const kind = monthKind(month, today);
  const title = `*Content update · ${format(fromISODate(month), "MMMM yyyy")}*${
    kind === "current" ? ` (till ${formatShortDate(today)})` : ""
  }`;
  const line = (name: string, n: MonthNumbers) => {
    const pace = paceLabel(n.pace);
    return `*${name}:* ${n.reels}/${n.target} reels (${formatPct(n.pct)})${pace === "—" ? "" : ` · ${pace}`}`;
  };
  const extras = (n: MonthNumbers) => {
    const parts: string[] = [];
    for (const t of ["static", "carousel", "story", "other"] as ContentType[]) {
      const count = n.byType[t];
      if (count === 0) continue;
      const label = (count === 1 ? CONTENT_TYPE_LABEL[t] : CONTENT_TYPE_PLURAL[t]).toLowerCase();
      parts.push(`${count} ${label}${t === "carousel" && n.carouselPages > 0 ? ` (${n.carouselPages} pages)` : ""}`);
    }
    if (n.festival > 0) parts.push(`${n.festival} festival ${n.festival === 1 ? "post" : "posts"}`);
    return parts.length ? `   + ${parts.join(", ")}` : null;
  };

  const lines = [title, ""];
  for (const r of rows) {
    lines.push(line(r.name, r.numbers));
    const more = extras(r.numbers);
    if (more) lines.push(more);
  }
  if (rows.length > 1) {
    lines.push("", line("Total", total));
  }
  return lines.join("\n");
}
