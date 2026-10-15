import Link from "next/link";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ON_BAND } from "@/components/page-header";
import { fromISODate, monthStartISO, type ISODate } from "@/lib/ist";
import { monthParam, shiftMonth } from "@/lib/stats";

/** ‹ October 2026 › with a "This month" shortcut. Keeps the other query params. */
export function MonthSwitcher({
  month,
  today,
  basePath,
  query = {},
}: {
  month: ISODate;
  today: ISODate;
  basePath: string;
  query?: Record<string, string | undefined>;
}) {
  const href = (m: ISODate) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (v) params.set(k, v);
    params.set("month", monthParam(m));
    return `${basePath}?${params.toString()}`;
  };
  const current = monthStartISO(today);

  return (
    <div className="flex items-center gap-2">
      <Link
        href={href(shiftMonth(month, -1))}
        aria-label="Previous month"
        className={ON_BAND.button}
      >
        <ChevronLeft />
      </Link>
      <div className={`${ON_BAND.box} min-w-0 flex-1 px-3`}>
        <span className="truncate">{format(fromISODate(month), month !== current ? "MMM yyyy" : "MMMM yyyy")}</span>
      </div>
      <Link
        href={href(shiftMonth(month, 1))}
        aria-label="Next month"
        className={ON_BAND.button}
      >
        <ChevronRight />
      </Link>
      {month !== current && (
        <Link href={href(current)} className={ON_BAND.pill}>
          Now
        </Link>
      )}
    </div>
  );
}
