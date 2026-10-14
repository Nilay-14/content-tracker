import { cn } from "@/lib/utils";
import { paceLabel, paceTone, type Pace } from "@/lib/stats";
import { POST_STATUS_LABEL, type PostStatus } from "@/lib/types";

export function PaceBadge({ pace, className }: { pace: Pace; className?: string }) {
  const tone = paceTone(pace);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        tone === "good" && "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
        tone === "warn" && "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300",
        tone === "neutral" && "bg-muted text-muted-foreground",
        className,
      )}
    >
      {paceLabel(pace)}
    </span>
  );
}

const STATUS_STYLE: Record<PostStatus, string> = {
  posted: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  planned: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300",
  shot: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300",
  edited: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300",
  scheduled: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-300",
  idea: "bg-violet-50 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  skipped: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

export function StatusBadge({ status, className }: { status: PostStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        STATUS_STYLE[status],
        className,
      )}
    >
      {POST_STATUS_LABEL[status]}
    </span>
  );
}

export function BrandDot({ color, className }: { color: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2.5 shrink-0 rounded-full", className)}
      style={{ backgroundColor: color }}
    />
  );
}

/** A thin progress bar in the brand's colour. */
export function ProgressBar({ pct, color }: { pct: number | null; color: string }) {
  const width = Math.min(pct ?? 0, 100);
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full transition-[width]"
        style={{ width: `${width}%`, backgroundColor: color }}
      />
    </div>
  );
}
