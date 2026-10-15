"use client";

import { useRouter } from "next/navigation";
import { Printer } from "lucide-react";
import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import type { ISODate } from "@/lib/ist";
import { monthParam } from "@/lib/stats";
import type { Brand } from "@/lib/types";

/** Brand picker and the Print button. Hidden on the printed page. */
export function ReportControls({
  brands,
  selected,
  month,
}: {
  brands: Brand[];
  selected: string;
  month: ISODate;
}) {
  const router = useRouter();

  return (
    <div className="flex gap-2 print:hidden">
      <NativeSelect
        aria-label="Brand"
        className="min-w-0 flex-1"
        value={selected}
        onChange={(e) => {
          const params = new URLSearchParams({ month: monthParam(month) });
          if (e.target.value) params.set("brand", e.target.value);
          router.push(`/report?${params}`);
        }}
      >
        <option value="">All brands</option>
        {brands.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </NativeSelect>
      <Button onClick={() => window.print()}>
        <Printer /> Print / PDF
      </Button>
    </div>
  );
}
