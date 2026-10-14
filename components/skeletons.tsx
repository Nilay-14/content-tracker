import { HeaderBand } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  );
}

/** The switcher row on the header band, while the page loads. */
export function BandSkeleton() {
  return (
    <HeaderBand>
      <div className="h-11 animate-pulse rounded-full bg-white/15" />
    </HeaderBand>
  );
}
