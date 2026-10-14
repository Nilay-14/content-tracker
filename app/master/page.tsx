import { Suspense } from "react";
import { connection } from "next/server";
import { ConnectNotice } from "@/components/connect-notice";
import { PageHeader } from "@/components/page-header";
import { ListSkeleton } from "@/components/skeletons";
import { listBrands, listMonthTargets } from "@/lib/db/brands";
import { isDbConfigured } from "@/lib/db/client";
import { listFestivals } from "@/lib/db/festivals";
import { listPostsBetween, listReschedulesFor } from "@/lib/db/posts";
import { addDaysISO, todayIST } from "@/lib/ist";
import { missedDays, monthEndISO, monthNumbers, parseMonthParam, totalNumbers } from "@/lib/stats";
import { IN_PROGRESS_STATUSES } from "@/lib/types";
import { MasterView } from "./master-view";

export default function MasterPage({ searchParams }: PageProps<"/master">) {
  return (
    <>
      <PageHeader title="Master">
        <p className="text-sm text-muted-foreground">Every brand, one month.</p>
      </PageHeader>
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <MasterContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function MasterContent({ searchParams }: Pick<PageProps<"/master">, "searchParams">) {
  await connection();
  if (!isDbConfigured()) return <ConnectNotice />;

  const params = await searchParams;
  const today = todayIST();
  const month = parseMonthParam(typeof params.month === "string" ? params.month : undefined, today);

  const end = monthEndISO(month);
  const upcomingEnd = addDaysISO(today, 6);
  const [brands, festivals, posts, reschedules, targets, nextWeek] = await Promise.all([
    listBrands(),
    listFestivals(),
    listPostsBetween(month, end),
    listReschedulesFor(month, end),
    listMonthTargets({ month }),
    listPostsBetween(today, upcomingEnd),
  ]);
  // Entries dated this month, plus ones elsewhere that replace a day this month.
  const relevant = [...posts, ...reschedules.filter((r) => !posts.some((p) => p.id === r.id))];

  const active = brands.filter((b) => b.is_active);
  const rows = active.map((b) => ({
    brandId: b.id,
    numbers: monthNumbers(b, month, posts, targets, today),
  }));
  const missed = active
    .map((b) => ({ brandId: b.id, days: missedDays(b, month, relevant, today) }))
    .filter((m) => m.days.length > 0);

  return (
    <MasterView
      month={month}
      today={today}
      brands={brands}
      festivals={festivals}
      posts={posts}
      rows={rows}
      total={totalNumbers(rows.map((r) => r.numbers), month, today)}
      missed={missed}
      upcoming={nextWeek.filter((p) => IN_PROGRESS_STATUSES.includes(p.status))}
    />
  );
}
