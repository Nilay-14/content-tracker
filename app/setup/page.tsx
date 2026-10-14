import { Suspense } from "react";
import { connection } from "next/server";
import { ConnectNotice } from "@/components/connect-notice";
import { PageHeader } from "@/components/page-header";
import { ListSkeleton } from "@/components/skeletons";
import { countPostsByBrand, listBrands, listMonthTargets } from "@/lib/db/brands";
import { isDbConfigured } from "@/lib/db/client";
import { listFestivals } from "@/lib/db/festivals";
import { todayIST } from "@/lib/ist";
import { BrandsSection } from "./brands-section";
import { FestivalsSection } from "./festivals-section";

export default function SetupPage() {
  return (
    <>
      <PageHeader title="Setup">
        <p className="text-sm text-muted-foreground">Brands, targets and festivals.</p>
      </PageHeader>
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <SetupContent />
      </Suspense>
    </>
  );
}

async function SetupContent() {
  await connection();
  if (!isDbConfigured()) return <ConnectNotice />;

  const [brands, festivals, targets] = await Promise.all([
    listBrands(),
    listFestivals(),
    listMonthTargets(),
  ]);
  const postCounts = await countPostsByBrand(brands.map((b) => b.id));
  const today = todayIST();

  return (
    <div className="space-y-8">
      <BrandsSection brands={brands} postCounts={postCounts} targets={targets} today={today} />
      <FestivalsSection festivals={festivals} today={today} />
    </div>
  );
}
