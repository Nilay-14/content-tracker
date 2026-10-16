"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { advancePost, revertPost } from "@/app/actions/posts";
import { BrandDot } from "@/components/badges";
import { useRunAction } from "@/components/use-run-action";
import { Button } from "@/components/ui/button";
import { formatShortDate, type ISODate } from "@/lib/ist";
import { CONTENT_TYPE_LABEL, type Brand, type Post, type PostStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Each stage of making a post, and the button that moves it on. */
const STAGES: { status: PostStatus; label: string; next: PostStatus; action: string }[] = [
  { status: "planned", label: "To shoot", next: "shot", action: "Shot" },
  { status: "shot", label: "To edit", next: "edited", action: "Edited" },
  { status: "edited", label: "Ready", next: "scheduled", action: "Scheduled" },
  { status: "scheduled", label: "Scheduled", next: "posted", action: "Posted" },
];

/**
 * Every entry being worked on, grouped by stage, with a one-tap button to move
 * it to the next stage. "Posted" also moves the date to today.
 */
export function ShootList({
  posts,
  brandById,
  today,
  onEdit,
  showBrand = true,
}: {
  posts: Post[];
  brandById: Map<string, Brand>;
  /** Off on a brand's own calendar, where every item is that brand. */
  showBrand?: boolean;
  today: ISODate;
  onEdit: (post: Post) => void;
}) {
  const firstWithItems = STAGES.find((s) => posts.some((p) => p.status === s.status))?.status ?? "planned";
  const [stage, setStage] = useState<PostStatus>(firstWithItems);
  const { pending, run } = useRunAction();
  const current = STAGES.find((s) => s.status === stage)!;
  const items = posts.filter((p) => p.status === stage);

  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">Shoot list</h2>
      <div role="tablist" aria-label="Stage" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {STAGES.map((s) => {
          const n = posts.filter((p) => p.status === s.status).length;
          const active = s.status === stage;
          return (
            <button
              key={s.status}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setStage(s.status)}
              className={cn(
                "flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium",
                active ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted",
              )}
            >
              {s.label}
              <span className={cn("rounded-full px-1.5 text-xs tabular-nums", active ? "bg-white/20" : "bg-muted")}>
                {n}
              </span>
            </button>
          );
        })}
      </div>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
          Nothing in “{current.label}”.
        </p>
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {items.map((p) => {
            const b = brandById.get(p.brand_id);
            const late = p.post_date !== null && p.post_date < today;
            return (
              <li key={p.id} className="flex items-center gap-2 py-1.5 pr-1.5 pl-3">
                <button type="button" className="min-h-11 min-w-0 flex-1 text-left" onClick={() => onEdit(p)}>
                  <span className="block truncate text-sm font-medium">{p.title}</span>
                  <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                    {b && showBrand && (
                      <span className="inline-flex items-center gap-1">
                        <BrandDot color={b.color} className="size-2" />
                        {b.name}
                      </span>
                    )}
                    <span>{CONTENT_TYPE_LABEL[p.content_type]}</span>
                    {p.post_date && (
                      <span className={cn(late && "font-medium text-red-600 dark:text-red-400")}>
                        {late ? "was due " : ""}
                        {formatShortDate(p.post_date)}
                      </span>
                    )}
                  </span>
                </button>
                <Button
                  variant={current.next === "posted" ? "default" : "outline"}
                  disabled={pending}
                  aria-label={`Mark “${p.title}” as ${current.action.toLowerCase()}`}
                  onClick={() =>
                    run(() => advancePost(p.id, current.next), {
                      success: current.next === "posted" ? "Marked posted today" : `Moved to ${current.action}`,
                      undo: () => revertPost(p),
                    })
                  }
                >
                  {current.next === "posted" ? <Check /> : <ArrowRight />} {current.action}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
