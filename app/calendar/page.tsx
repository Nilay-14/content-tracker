import { Suspense } from "react";
import { connection } from "next/server";
import { ConnectNotice } from "@/components/connect-notice";
import { PageHeader } from "@/components/page-header";
import { BandSkeleton, ListSkeleton } from "@/components/skeletons";
import { listBrands, listMonthTargets } from "@/lib/db/brands";
import { isDbConfigured } from "@/lib/db/client";
import { requireUnlocked } from "@/lib/lock";
import { listFestivals } from "@/lib/db/festivals";
import { listPostsBetween, listReschedulesFor } from "@/lib/db/posts";
import { todayIST } from "@/lib/ist";
import { monthEndISO, monthNumbers, parseMonthParam } from "@/lib/stats";
import { CalendarView } from "./calendar-view";

export default function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  return (
    <>
      <PageHeader title="Calendar" />
      <Suspense
        fallback={
          <div className="space-y-4">
            <BandSkeleton />
            <ListSkeleton rows={6} />
          </div>
        }
      >
        <CalendarContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function CalendarContent({ searchParams }: Pick<PageProps<"/calendar">, "searchParams">) {
  await connection();
  if (!isDbConfigured()) return <ConnectNotice />;
  await requireUnlocked();

  const params = await searchParams;
  const today = todayIST();
  const month = parseMonthParam(typeof params.month === "string" ? params.month : undefined, today);
  const view = params.view === "list" ? "list" : "grid";

  const [allBrands, festivals] = await Promise.all([listBrands(), listFestivals()]);
  const requested = allBrands.find((b) => b.id === params.brand);
  const brand = requested ?? allBrands.find((b) => b.is_active) ?? null;
  // The selector shows active brands, plus an archived one if it was asked for.
  const brands = allBrands.filter((b) => b.is_active || b.id === brand?.id);

  if (!brand) {
    return <CalendarView empty today={today} month={month} view={view} />;
  }

  const end = monthEndISO(month);
  const [posts, reschedules, targets] = await Promise.all([
    listPostsBetween(month, end, { brandId: brand.id }),
    listReschedulesFor(month, end, { brandId: brand.id }),
    listMonthTargets({ month }),
  ]);
  // Entries dated this month, plus ones elsewhere that replace a day this month.
  const relevant = [...posts, ...reschedules.filter((r) => !posts.some((p) => p.id === r.id))];

  return (
    <CalendarView
      today={today}
      month={month}
      view={view}
      brand={brand}
      brands={brands}
      festivals={festivals}
      posts={relevant}
      numbers={monthNumbers(brand, month, posts, targets, today)}
      brandFromUrl={Boolean(requested)}
    />
  );
}
