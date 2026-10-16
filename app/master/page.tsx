import { Suspense } from "react";
import { connection } from "next/server";
import { ConnectNotice } from "@/components/connect-notice";
import { PageHeader } from "@/components/page-header";
import { BandSkeleton, ListSkeleton } from "@/components/skeletons";
import { listBrands, listMonthTargets } from "@/lib/db/brands";
import { isDbConfigured } from "@/lib/db/client";
import { requireUnlocked } from "@/lib/lock";
import { listFestivals } from "@/lib/db/festivals";
import { listPostsBetween } from "@/lib/db/posts";
import { addDaysISO, todayIST } from "@/lib/ist";
import { monthEndISO, monthNumbers, parseMonthParam, totalNumbers } from "@/lib/stats";
import { IN_PROGRESS_STATUSES } from "@/lib/types";
import { MasterView } from "./master-view";

export default function MasterPage({ searchParams }: PageProps<"/master">) {
  return (
    <>
      <PageHeader title="Master" subtitle="Every brand, one month." />
      <Suspense
        fallback={
          <div className="space-y-6">
            <BandSkeleton />
            <ListSkeleton rows={6} />
          </div>
        }
      >
        <MasterContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function MasterContent({ searchParams }: Pick<PageProps<"/master">, "searchParams">) {
  await connection();
  if (!isDbConfigured()) return <ConnectNotice />;
  // The PIN check runs alongside the data queries instead of before them.
  const unlocked = requireUnlocked();

  const params = await searchParams;
  const today = todayIST();
  const month = parseMonthParam(typeof params.month === "string" ? params.month : undefined, today);

  const end = monthEndISO(month);
  const upcomingEnd = addDaysISO(today, 6);
  const [, brands, festivals, posts, targets, nextWeek] = await Promise.all([
    unlocked,
    listBrands(),
    listFestivals(),
    listPostsBetween(month, end),
    listMonthTargets({ month }),
    listPostsBetween(today, upcomingEnd),
  ]);

  const active = brands.filter((b) => b.is_active);
  const rows = active.map((b) => ({
    brandId: b.id,
    numbers: monthNumbers(b, month, posts, targets, today),
  }));

  return (
    <MasterView
      month={month}
      today={today}
      brands={brands}
      festivals={festivals}
      posts={posts}
      rows={rows}
      total={totalNumbers(rows.map((r) => r.numbers), month, today)}
      upcoming={nextWeek.filter((p) => IN_PROGRESS_STATUSES.includes(p.status))}
    />
  );
}
