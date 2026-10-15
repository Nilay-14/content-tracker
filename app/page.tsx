import { Suspense } from "react";
import { connection } from "next/server";
import { ConnectNotice } from "@/components/connect-notice";
import { PageHeader } from "@/components/page-header";
import { BandSkeleton, ListSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { listBrands, listMonthTargets } from "@/lib/db/brands";
import { isDbConfigured } from "@/lib/db/client";
import { listFestivals } from "@/lib/db/festivals";
import { listFestivalPosts, listIdeas, listPostsBetween, listPostsOnDate } from "@/lib/db/posts";
import { addDaysISO, monthStartISO, todayIST } from "@/lib/ist";
import { isDueToday, isValidISODate, monthEndISO, monthNumbers } from "@/lib/stats";
import { IN_PROGRESS_STATUSES } from "@/lib/types";
import { TodayView, type BannerItem, type ProgressRow } from "./today-view";

const BANNER_DAYS = 10;

export default function TodayPage({ searchParams }: PageProps<"/">) {
  return (
    <>
      <PageHeader title="Today" />
      <Suspense
        fallback={
          <div className="space-y-5">
            <BandSkeleton />
            <Skeleton className="h-11 w-2/3 rounded-full" />
            <ListSkeleton rows={4} />
          </div>
        }
      >
        <TodayContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function TodayContent({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  await connection();
  if (!isDbConfigured()) return <ConnectNotice />;

  const params = await searchParams;
  const today = todayIST();
  const date = typeof params.date === "string" && isValidISODate(params.date) ? params.date : today;
  const brandParam = typeof params.brand === "string" ? params.brand : null;
  const month = monthStartISO(date);

  const [brands, festivals, postsOnDate, monthPosts, targets, todayPosts, ideas] = await Promise.all([
    listBrands({ activeOnly: true }),
    listFestivals({ activeOnly: true }),
    listPostsOnDate(date),
    listPostsBetween(month, monthEndISO(month)),
    listMonthTargets({ month }),
    date === today ? null : listPostsOnDate(today),
    listIdeas(),
  ]);

  // Festivals whose date falls in the next 10 days from the chosen date.
  const upcoming = festivals
    .filter((f) => f.festival_date && f.festival_date >= date && f.festival_date <= addDaysISO(date, BANNER_DAYS))
    .sort((a, b) => a.festival_date!.localeCompare(b.festival_date!));
  // Festival posts usually go up in the weeks before; ignore last year's tags.
  const festivalPosts = await listFestivalPosts(
    upcoming.map((f) => f.id),
    addDaysISO(date, -60),
    addDaysISO(date, BANNER_DAYS + 7),
  );
  const banner: BannerItem[] = upcoming.map((f) => ({
    festival: f,
    brands: brands.map((b) => {
      const tagged = festivalPosts.filter((p) => p.festival_id === f.id && p.brand_id === b.id);
      const state = tagged.some((p) => p.status === "posted")
        ? "posted"
        : tagged.some((p) => IN_PROGRESS_STATUSES.includes(p.status))
          ? "planned"
          : "none";
      return { brand: b, state };
    }),
  }));

  const progress: ProgressRow[] = brands.map((b) => ({
    brandId: b.id,
    numbers: monthNumbers(b, month, monthPosts, targets, today),
    due: isDueToday(b, todayPosts ?? postsOnDate, today),
  }));

  return (
    <TodayView
      key={date}
      date={date}
      today={today}
      brands={brands}
      festivals={festivals}
      postsOnDate={postsOnDate}
      banner={banner}
      progress={progress}
      ideas={ideas}
      month={month}
      initialBrandId={brandParam}
    />
  );
}
