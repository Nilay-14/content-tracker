import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { isDbConfigured } from "@/lib/db/client";
import { isUnlocked } from "@/lib/lock";
import { UnlockForm } from "./unlock-form";

export default function UnlockPage() {
  return (
    <>
      <PageHeader title="Locked" subtitle="Enter your PIN to open the tracker." />
      <Suspense fallback={null}>
        <UnlockContent />
      </Suspense>
    </>
  );
}

async function UnlockContent() {
  await connection();
  if (!isDbConfigured() || (await isUnlocked())) redirect("/");
  return <UnlockForm />;
}
