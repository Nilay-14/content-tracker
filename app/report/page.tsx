import { Suspense } from "react";
import { connection } from "next/server";
import { format } from "date-fns";
import { ConnectNotice } from "@/components/connect-notice";
import { MonthSwitcher } from "@/components/month-switcher";
import { HeaderBand, PageHeader } from "@/components/page-header";
import { BandSkeleton, ListSkeleton } from "@/components/skeletons";
import { listBrands, listMonthTargets } from "@/lib/db/brands";
import { isDbConfigured } from "@/lib/db/client";
import { listFestivals } from "@/lib/db/festivals";
import { listPostsBetween } from "@/lib/db/posts";
import { formatDisplayDate, fromISODate, todayIST } from "@/lib/ist";
import {
  formatPct,
  monthEndISO,
  monthNumbers,
  paceLabel,
  parseMonthParam,
  totalNumbers,
  typeCount,
  type MonthNumbers,
} from "@/lib/stats";
import {
  CONTENT_TYPE_LABEL,
  CONTENT_TYPE_PLURAL,
  CONTENT_TYPES,
  POST_STATUS_LABEL,
  type Brand,
  type ContentType,
  type Post,
} from "@/lib/types";
import { ReportControls } from "./report-controls";

export default function ReportPage({ searchParams }: PageProps<"/report">) {
  return (
    <>
      <PageHeader title="Monthly report" subtitle="Print it or save it as a PDF." />
      <Suspense
        fallback={
          <div className="space-y-6">
            <BandSkeleton />
            <ListSkeleton rows={6} />
          </div>
        }
      >
        <ReportContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const TH = "border-b px-2 py-1.5 text-left font-medium whitespace-nowrap";
const TD = "border-b px-2 py-1.5 align-top";

async function ReportContent({ searchParams }: Pick<PageProps<"/report">, "searchParams">) {
  await connection();
  if (!isDbConfigured()) return <ConnectNotice />;

  const params = await searchParams;
  const today = todayIST();
  const month = parseMonthParam(typeof params.month === "string" ? params.month : undefined, today);
  const brandParam = typeof params.brand === "string" ? params.brand : "";

  const [allBrands, festivals, posts, targets] = await Promise.all([
    listBrands(),
    listFestivals(),
    listPostsBetween(month, monthEndISO(month)),
    listMonthTargets({ month }),
  ]);
  const active = allBrands.filter((b) => b.is_active);
  const one = allBrands.find((b) => b.id === brandParam);
  const brands: Brand[] = one ? [one] : active;
  const brandIds = new Set(brands.map((b) => b.id));
  const brandById = new Map(allBrands.map((b) => [b.id, b]));
  const festivalById = new Map(festivals.map((f) => [f.id, f]));

  const rows = brands.map((b) => ({ brand: b, numbers: monthNumbers(b, month, posts, targets, today) }));
  const total = totalNumbers(rows.map((r) => r.numbers), month, today);
  const types: ContentType[] = CONTENT_TYPES.filter((t) => t !== "other" || total.byType.other > 0);

  const mine = posts.filter((p) => brandIds.has(p.brand_id));
  const festivalPosted = mine.filter((p) => p.status === "posted" && p.festival_id);
  const festivalRows = festivals.filter((f) => festivalPosted.some((p) => p.festival_id === f.id));
  const log = [...mine].sort(
    (a, b) => a.post_date!.localeCompare(b.post_date!) || a.created_at.localeCompare(b.created_at),
  );
  const monthName = format(fromISODate(month), "MMMM yyyy");

  return (
    <div className="space-y-6">
      <HeaderBand className="print:hidden">
        <MonthSwitcher
          month={month}
          today={today}
          basePath="/report"
          query={{ brand: one ? one.id : undefined }}
        />
      </HeaderBand>

      <ReportControls brands={active} selected={one?.id ?? ""} month={month} />

      <div className="space-y-1">
        <h2 className="text-xl font-bold">
          {one ? one.name : "All brands"} · {monthName}
        </h2>
        <p className="text-xs text-muted-foreground">
          Made {formatDisplayDate(today)}. Statics include carousel pages.
        </p>
      </div>

      <section className="space-y-2 break-inside-avoid">
        <h3 className="font-semibold">Summary</h3>
        <div className="overflow-x-auto rounded-xl border bg-card print:overflow-visible print:rounded-none print:border-0">
          <table className="w-full text-sm tabular-nums">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className={TH}>Brand</th>
                <th className={`${TH} text-right`}>Target</th>
                <th className={`${TH} text-right`}>Posted</th>
                {types.map((t) => (
                  <th key={t} className={`${TH} text-right`}>
                    {CONTENT_TYPE_PLURAL[t]}
                  </th>
                ))}
                <th className={`${TH} text-right`}>Carousel pages</th>
                <th className={`${TH} text-right`}>Festival</th>
                <th className={`${TH} text-right`}>Pending</th>
                <th className={`${TH} text-right`}>%</th>
                <th className={TH}>Pace</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ brand, numbers }) => (
                <SummaryRow key={brand.id} label={brand.name} color={brand.color} numbers={numbers} types={types} />
              ))}
              {rows.length > 1 && <SummaryRow label="Total" numbers={total} types={types} bold />}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2 break-inside-avoid">
        <h3 className="font-semibold">Festivals</h3>
        {festivalRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No festival posts this month.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-card print:overflow-visible print:rounded-none print:border-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className={TH}>Festival</th>
                  {brands.map((b) => (
                    <th key={b.id} className={TH}>
                      {b.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {festivalRows.map((f) => (
                  <tr key={f.id}>
                    <td className={`${TD} font-medium whitespace-nowrap`}>
                      {f.name}
                      {f.festival_date && (
                        <span className="block text-xs font-normal text-muted-foreground">
                          {formatDisplayDate(f.festival_date)}
                        </span>
                      )}
                    </td>
                    {brands.map((b) => (
                      <td key={b.id} className={TD}>
                        {typeSummary(festivalPosted.filter((p) => p.festival_id === f.id && p.brand_id === b.id)) || "–"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold">
          Log <span className="font-normal text-muted-foreground">· {log.length} entries</span>
        </h3>
        {log.length === 0 ? (
          <p className="text-sm text-muted-foreground">No entries this month.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-card print:overflow-visible print:rounded-none print:border-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className={TH}>Date</th>
                  {!one && <th className={TH}>Brand</th>}
                  <th className={TH}>Content</th>
                  <th className={TH}>Type</th>
                  <th className={TH}>Festival</th>
                  <th className={TH}>Status</th>
                  <th className={TH}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {log.map((p) => (
                  <tr key={p.id} className="break-inside-avoid">
                    <td className={`${TD} whitespace-nowrap tabular-nums`}>{formatDisplayDate(p.post_date!)}</td>
                    {!one && <td className={`${TD} whitespace-nowrap`}>{brandById.get(p.brand_id)?.name}</td>}
                    <td className={`${TD} font-medium`}>{p.title}</td>
                    <td className={`${TD} whitespace-nowrap`}>
                      {CONTENT_TYPE_LABEL[p.content_type]}
                      {p.content_type === "carousel" && p.slide_count ? ` (${p.slide_count})` : ""}
                    </td>
                    <td className={TD}>{p.festival_id ? festivalById.get(p.festival_id)?.name : ""}</td>
                    <td className={`${TD} whitespace-nowrap`}>
                      {POST_STATUS_LABEL[p.status]}
                      {p.status === "skipped" && p.skip_reason ? ` (${p.skip_reason})` : ""}
                    </td>
                    <td className={`${TD} text-muted-foreground`}>{p.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryRow({
  label,
  color,
  numbers,
  types,
  bold = false,
}: {
  label: string;
  color?: string;
  numbers: MonthNumbers;
  types: ContentType[];
  bold?: boolean;
}) {
  return (
    <tr className={bold ? "bg-muted/40 font-semibold" : undefined}>
      <td className={`${TD} font-semibold whitespace-nowrap`} style={color ? { color } : undefined}>
        {label}
      </td>
      <td className={`${TD} text-right`}>{numbers.target}</td>
      <td className={`${TD} text-right font-semibold`}>{numbers.posted}</td>
      {types.map((t) => (
        <td key={t} className={`${TD} text-right`}>
          {typeCount(numbers, t)}
        </td>
      ))}
      <td className={`${TD} text-right`}>{numbers.carouselPages}</td>
      <td className={`${TD} text-right`}>{numbers.festival}</td>
      <td className={`${TD} text-right`}>{numbers.pending}</td>
      <td className={`${TD} text-right`}>{formatPct(numbers.pct)}</td>
      <td className={`${TD} whitespace-nowrap`}>{paceLabel(numbers.pace)}</td>
    </tr>
  );
}

/** "1 Static, 1 Reel" for a set of entries. */
function typeSummary(entries: Post[]): string {
  return CONTENT_TYPES.map((t) => [t, entries.filter((p) => p.content_type === t).length] as const)
    .filter(([, n]) => n > 0)
    .map(([t, n]) => `${n} ${n === 1 ? CONTENT_TYPE_LABEL[t] : CONTENT_TYPE_PLURAL[t]}`)
    .join(", ");
}
