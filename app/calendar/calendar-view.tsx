"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LayoutGrid, List, Plus, Sparkles } from "lucide-react";
import { BottomSheet } from "@/components/bottom-sheet";
import { StatusBadge } from "@/components/badges";
import { MonthSwitcher } from "@/components/month-switcher";
import { PostForm } from "@/components/post-form";
import { PostRow } from "@/components/post-row";
import { StatStrip } from "@/components/stat-strip";
import { useRememberedBrand } from "@/components/use-remembered-brand";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatDisplayDate, fromISODate, type ISODate } from "@/lib/ist";
import {
  dayState,
  daysOfMonth,
  monthParam,
  weekday,
  type DayState,
  type MonthNumbers,
} from "@/lib/stats";
import { CONTENT_TYPE_LABEL, WEEKDAY_SHORT, type Brand, type Festival, type Post } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATE_STYLE: Record<DayState, string> = {
  posted: "bg-emerald-500 text-white",
  "in-progress": "bg-amber-300 text-amber-950",
  idea: "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200",
  skipped: "bg-zinc-300 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200",
  missed: "bg-red-500 text-white",
  rescheduled: "bg-slate-400 text-white",
  due: "bg-background ring-2 ring-inset ring-primary text-foreground",
  empty: "bg-muted/50 text-foreground",
};

const STATE_LABEL: Record<DayState, string> = {
  posted: "Posted",
  "in-progress": "In progress",
  idea: "Idea",
  skipped: "Skipped",
  missed: "Missed",
  rescheduled: "Rescheduled",
  due: "Due today",
  empty: "Nothing yet",
};

const LEGEND: DayState[] = ["posted", "in-progress", "idea", "skipped", "missed", "rescheduled", "due"];

type Props =
  | { empty: true; today: ISODate; month: ISODate; view: "grid" | "list" }
  | {
      empty?: false;
      today: ISODate;
      month: ISODate;
      view: "grid" | "list";
      brand: Brand;
      brands: Brand[];
      festivals: Festival[];
      posts: Post[];
      numbers: MonthNumbers;
      brandFromUrl: boolean;
    };

type SheetState =
  | { kind: "day"; date: ISODate }
  | { kind: "add"; date: ISODate }
  | { kind: "edit"; post: Post; from: ISODate | null };

export function CalendarView(props: Props) {
  if (props.empty) {
    return (
      <div className="rounded-2xl border border-dashed p-6 text-center">
        <Sparkles className="mx-auto mb-2 size-7 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Add a brand on the Setup page first.</p>
        <Link href="/setup" className={cn(buttonVariants(), "mt-4")}>
          Go to Setup
        </Link>
      </div>
    );
  }
  return <BrandCalendar {...props} />;
}

function BrandCalendar({
  today,
  month,
  view,
  brand,
  brands,
  festivals,
  posts,
  numbers,
  brandFromUrl,
}: Extract<Props, { brand: Brand }>) {
  const router = useRouter();
  const [remembered, remember] = useRememberedBrand();
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const festivalById = new Map(festivals.map((f) => [f.id, f]));
  const href = (brandId: string, v: "grid" | "list" = view) =>
    `/calendar?${new URLSearchParams({ brand: brandId, month: monthParam(month), ...(v === "list" ? { view: v } : {}) })}`;

  // With no brand in the URL, open the brand last used on this device.
  useEffect(() => {
    if (!brandFromUrl && remembered && remembered !== brand.id && brands.some((b) => b.id === remembered)) {
      router.replace(href(remembered));
    }
  });

  const days = daysOfMonth(month);
  const lead = weekday(month);
  const postsOn = (d: ISODate) => posts.filter((p) => p.post_date === d);
  const datedPosts = posts
    .filter((p) => p.post_date && p.post_date >= month && p.post_date <= days[days.length - 1])
    .sort((a, b) => a.post_date!.localeCompare(b.post_date!) || a.created_at.localeCompare(b.created_at));

  return (
    <div className="space-y-4">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {brands.map((b) => {
          const active = b.id === brand.id;
          return (
            <Link
              key={b.id}
              href={href(b.id)}
              onClick={() => remember(b.id)}
              aria-current={active ? "true" : undefined}
              className={cn(
                "flex h-11 shrink-0 items-center gap-2 rounded-full border-2 px-4 text-sm font-semibold whitespace-nowrap",
                active ? "text-white shadow-md" : "bg-background",
              )}
              style={{ borderColor: b.color, backgroundColor: active ? b.color : undefined }}
            >
              {!active && <span className="size-2.5 rounded-full" style={{ backgroundColor: b.color }} />}
              {b.name}
            </Link>
          );
        })}
      </div>

      <MonthSwitcher
        month={month}
        today={today}
        basePath="/calendar"
        query={{ brand: brand.id, view: view === "list" ? "list" : undefined }}
      />

      <StatStrip numbers={numbers} />

      <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
        {(["grid", "list"] as const).map((v) => (
          <Link
            key={v}
            href={href(brand.id, v)}
            replace
            className={cn(
              "flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-medium",
              view === v ? "bg-background shadow-sm" : "text-muted-foreground",
            )}
          >
            {v === "grid" ? <LayoutGrid className="size-4" /> : <List className="size-4" />}
            {v === "grid" ? "Month" : "List"}
          </Link>
        ))}
      </div>

      {view === "grid" ? (
        <>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
            {WEEKDAY_SHORT.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: lead }, (_, i) => (
              <div key={`lead-${i}`} />
            ))}
            {days.map((d) => {
              const state = dayState(brand, d, posts, today);
              const entries = postsOn(d);
              const festive = entries.some((p) => p.festival_id);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSheet({ kind: "day", date: d })}
                  aria-label={`${formatDisplayDate(d)}: ${STATE_LABEL[state]}, ${entries.length} entries`}
                  className={cn(
                    "relative flex aspect-square flex-col items-start rounded-lg p-1 text-left text-sm font-semibold transition-transform active:scale-95 sm:p-1.5",
                    STATE_STYLE[state],
                    d === today && state !== "due" && "ring-2 ring-foreground ring-offset-1 ring-offset-background",
                  )}
                >
                  <span className="leading-none">{fromISODate(d).getDate()}</span>
                  {festive && <span className="absolute top-0.5 right-0.5 text-xs leading-none sm:text-sm">🎉</span>}
                  {entries.length > 1 && (
                    <span className="absolute right-1 bottom-1 rounded-full bg-black/20 px-1 text-[10px] leading-4 font-bold text-current">
                      {entries.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
            {LEGEND.map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5">
                <span className={cn("size-3 rounded", STATE_STYLE[s])} />
                {STATE_LABEL[s]}
              </span>
            ))}
            <span className="inline-flex items-center gap-1">🎉 Festival post</span>
          </div>
          {brand.preferred_days.length === 0 && (
            <p className="text-xs text-muted-foreground">
              {brand.name} has no preferred days, so no day shows as missed. It&apos;s tracked by target and pace.
            </p>
          )}
        </>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 pr-2 font-medium">Date</th>
                <th className="py-2 pr-2 font-medium">Day</th>
                <th className="py-2 pr-2 font-medium">Content</th>
                <th className="py-2 pr-2 font-medium">Type</th>
                <th className="py-2 pr-2 font-medium">Festival</th>
                <th className="py-2 pr-2 font-medium">Status</th>
                <th className="py-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {datedPosts.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-muted-foreground">
                    No entries this month.
                  </td>
                </tr>
              )}
              {datedPosts.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => setSheet({ kind: "edit", post: p, from: null })}
                  className="cursor-pointer border-b hover:bg-muted/50"
                >
                  <td className="py-2.5 pr-2 whitespace-nowrap tabular-nums">
                    {formatDisplayDate(p.post_date!).slice(0, 11)}
                  </td>
                  <td className="py-2.5 pr-2">{WEEKDAY_SHORT[weekday(p.post_date!)]}</td>
                  <td className="py-2.5 pr-2 font-medium">{p.title}</td>
                  <td className="py-2.5 pr-2">{CONTENT_TYPE_LABEL[p.content_type]}</td>
                  <td className="py-2.5 pr-2">
                    {p.festival_id ? `🎉 ${festivalById.get(p.festival_id)?.name ?? ""}` : ""}
                  </td>
                  <td className="py-2.5 pr-2">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="max-w-48 truncate py-2.5 text-muted-foreground">
                    {p.status === "skipped" ? (p.skip_reason ?? p.notes) : p.notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <BottomSheet
        open={sheet !== null}
        onOpenChange={(open) => !open && setSheet(null)}
        title={
          sheet === null
            ? ""
            : sheet.kind === "edit"
              ? "Edit entry"
              : sheet.kind === "add"
                ? `New entry · ${formatDisplayDate(sheet.date)}`
                : formatDisplayDate(sheet.date)
        }
        description={
          sheet?.kind === "day" ? (
            <span className="inline-flex items-center gap-1.5">
              <span className={cn("size-3 rounded", STATE_STYLE[dayState(brand, sheet.date, posts, today)])} />
              {STATE_LABEL[dayState(brand, sheet.date, posts, today)]} · {brand.name}
            </span>
          ) : undefined
        }
      >
        {sheet?.kind === "day" && (
          <div className="space-y-3">
            {postsOn(sheet.date).length === 0 ? (
              <p className="rounded-xl border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
                No entries on this day.
              </p>
            ) : (
              <div className="divide-y overflow-hidden rounded-xl border">
                {postsOn(sheet.date).map((p) => (
                  <PostRow
                    key={p.id}
                    post={p}
                    festival={p.festival_id ? festivalById.get(p.festival_id) : undefined}
                    onClick={() => setSheet({ kind: "edit", post: p, from: sheet.date })}
                  />
                ))}
              </div>
            )}
            <Button size="lg" className="w-full" onClick={() => setSheet({ kind: "add", date: sheet.date })}>
              <Plus /> Add entry
            </Button>
          </div>
        )}
        {sheet?.kind === "add" && (
          <div className="space-y-3">
            <BackButton onClick={() => setSheet({ kind: "day", date: sheet.date })} />
            <PostForm
              post={null}
              defaults={{ brand_id: brand.id, post_date: sheet.date }}
              brands={brands}
              festivals={festivals}
              today={today}
              onSaved={() => setSheet({ kind: "day", date: sheet.date })}
            />
          </div>
        )}
        {sheet?.kind === "edit" && (
          <div className="space-y-3">
            {sheet.from && <BackButton onClick={() => setSheet({ kind: "day", date: sheet.from! })} />}
            <PostForm
              key={sheet.post.id}
              post={sheet.post}
              defaults={{ brand_id: sheet.post.brand_id, post_date: sheet.post.post_date }}
              brands={brands}
              festivals={festivals}
              today={today}
              showBrandAndDate
              onSaved={() => setSheet(sheet.from ? { kind: "day", date: sheet.from } : null)}
              onDeleted={() => setSheet(sheet.from ? { kind: "day", date: sheet.from } : null)}
            />
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" size="sm" className="-ml-2" onClick={onClick}>
      <ArrowLeft /> Back to day
    </Button>
  );
}
