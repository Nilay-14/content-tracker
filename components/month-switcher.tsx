import Link from "next/link";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { fromISODate, monthStartISO, type ISODate } from "@/lib/ist";
import { monthParam, shiftMonth } from "@/lib/stats";
import { cn } from "@/lib/utils";

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
        className={buttonVariants({ variant: "outline", size: "icon" })}
      >
        <ChevronLeft />
      </Link>
      <div className="flex h-11 min-w-0 flex-1 items-center justify-center rounded-lg border bg-card font-semibold">
        {format(fromISODate(month), "MMMM yyyy")}
      </div>
      <Link
        href={href(shiftMonth(month, 1))}
        aria-label="Next month"
        className={buttonVariants({ variant: "outline", size: "icon" })}
      >
        <ChevronRight />
      </Link>
      {month !== current && (
        <Link href={href(current)} className={cn(buttonVariants({ variant: "secondary" }))}>
          Now
        </Link>
      )}
    </div>
  );
}
