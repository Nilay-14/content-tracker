import { PaceBadge } from "@/components/badges";
import { formatPct, type MonthNumbers } from "@/lib/stats";

/** Reel target · Reels · Pending · % · Pace in one row of tiles. */
export function StatStrip({ numbers }: { numbers: MonthNumbers }) {
  const tiles = [
    { label: "Reel target", value: numbers.target },
    { label: "Reels", value: numbers.reels },
    { label: "Pending", value: numbers.pending },
    { label: "Done", value: formatPct(numbers.pct) },
  ];
  return (
    <div className="grid grid-cols-4 gap-2">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-xl border bg-card px-2 py-2 text-center">
          <div className="text-lg leading-tight font-semibold tabular-nums">{t.value}</div>
          <div className="text-[11px] text-muted-foreground">{t.label}</div>
        </div>
      ))}
      <div className="col-span-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        Pace <PaceBadge pace={numbers.pace} />
      </div>
    </div>
  );
}
