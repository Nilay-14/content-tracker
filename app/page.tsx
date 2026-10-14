import { Suspense } from "react";
import { io } from "next/cache";
import { PageHeader } from "@/components/page-header";
import { formatDisplayDate, todayIST } from "@/lib/ist";

export default function TodayPage() {
  return (
    <>
      <PageHeader title="Today">
        <Suspense fallback={<p className="h-5 text-sm text-muted-foreground" />}>
          <TodayDate />
        </Suspense>
      </PageHeader>
      <p className="text-sm text-muted-foreground">
        The entry form arrives in Step 4.
      </p>
    </>
  );
}

async function TodayDate() {
  // Read the clock per request, not once at build time.
  await io();
  return (
    <p className="text-sm text-muted-foreground">
      {formatDisplayDate(todayIST())}
    </p>
  );
}
