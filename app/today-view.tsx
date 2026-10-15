"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { differenceInCalendarDays, format } from "date-fns";
import {
  CalendarDays,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Hourglass,
  Lightbulb,
  Plus,
  Sparkles,
} from "lucide-react";
import { addIdea, scheduleIdea } from "@/app/actions/posts";
import { BottomSheet } from "@/components/bottom-sheet";
import { PaceBadge, ProgressBar } from "@/components/badges";
import { HeaderBand, ON_BAND } from "@/components/page-header";
import { PostForm } from "@/components/post-form";
import { PostRow } from "@/components/post-row";
import { useRunAction } from "@/components/use-run-action";
import { useRememberedBrand } from "@/components/use-remembered-brand";
import { useSheet } from "@/components/use-sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addDaysISO, formatDisplayDate, formatShortDate, fromISODate, type ISODate } from "@/lib/ist";
import { formatPct, type MonthNumbers } from "@/lib/stats";
import type { Brand, Festival, Post } from "@/lib/types";
import { cn } from "@/lib/utils";

export type BannerItem = {
  festival: Festival;
  brands: { brand: Brand; state: "posted" | "planned" | "none" }[];
};

export type ProgressRow = { brandId: string; numbers: MonthNumbers; due: boolean };

const BANNER_ICON = { posted: "✅", planned: "📅", none: "⏳" } as const;

export function TodayView({
  date,
  today,
  brands,
  festivals,
  postsOnDate,
  banner,
  progress,
  ideas,
  month,
  initialBrandId,
}: {
  date: ISODate;
  today: ISODate;
  brands: Brand[];
  festivals: Festival[];
  postsOnDate: Post[];
  banner: BannerItem[];
  progress: ProgressRow[];
  /** Undated ideas for every brand. */
  ideas: Post[];
  month: ISODate;
  initialBrandId: string | null;
}) {
  const [remembered, remember] = useRememberedBrand();
  const [picked, setPicked] = useState<string | null>(null);
  const editSheet = useSheet<Post>();
  const topRef = useRef<HTMLDivElement>(null);

  const valid = (id: string | null) => (id && brands.some((b) => b.id === id) ? id : null);
  const brandId = valid(picked) ?? valid(initialBrandId) ?? valid(remembered) ?? brands[0]?.id ?? null;
  const brand = brands.find((b) => b.id === brandId) ?? null;
  const entries = postsOnDate.filter((p) => p.brand_id === brandId);
  const festivalById = new Map(festivals.map((f) => [f.id, f]));

  function pickBrand(id: string) {
    setPicked(id);
    remember(id);
  }

  if (brands.length === 0) {
    return (
      <>
        <HeaderBand>
          <DateBar date={date} today={today} />
        </HeaderBand>
        <div className="rounded-2xl border border-dashed p-6 text-center">
          <Sparkles className="mx-auto mb-2 size-7 text-muted-foreground" />
          <h2 className="font-semibold">Add your brands first</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Set up brands and festivals once, then log entries here every day.
          </p>
          <Link href="/setup" className={cn(buttonVariants(), "mt-4")}>
            Go to Setup
          </Link>
        </div>
      </>
    );
  }

  return (
    <div className="space-y-5">
      <HeaderBand>
        <div ref={topRef} className="scroll-mt-4" />
        <DateBar date={date} today={today} />
      </HeaderBand>

      {banner.length > 0 && (
        <div className="space-y-2">
          {banner.map(({ festival, brands: states }) => {
            const days = differenceInCalendarDays(
              fromISODate(festival.festival_date!),
              fromISODate(date),
            );
            return (
              <div
                key={festival.id}
                className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-2.5 text-sm dark:border-amber-900 dark:from-amber-950/60 dark:to-orange-950/40"
              >
                <div className="font-semibold">
                  🎉 {festival.name}{" "}
                  <span className="font-normal text-muted-foreground">
                    {days === 0 ? "is today" : days === 1 ? "tomorrow" : `in ${days} days`}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[13px]">
                  {states.map(({ brand: b, state }) => (
                    <span key={b.id} className="whitespace-nowrap">
                      {b.name} {BANNER_ICON[state]}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div
        role="radiogroup"
        aria-label="Brand"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]"
      >
        {brands.map((b) => {
          const active = b.id === brandId;
          return (
            <button
              key={b.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => pickBrand(b.id)}
              className={cn(
                "flex h-11 shrink-0 items-center gap-2 rounded-full border-2 px-4 text-sm font-semibold whitespace-nowrap transition-all",
                active ? "text-white shadow-md" : "bg-background",
              )}
              style={{
                borderColor: b.color,
                backgroundColor: active ? b.color : undefined,
                color: active ? "#fff" : undefined,
              }}
            >
              {!active && (
                <span className="size-2.5 rounded-full" style={{ backgroundColor: b.color }} />
              )}
              {b.name}
            </button>
          );
        })}
      </div>

      {brand && (
        <section
          className="rounded-2xl border bg-card p-4 shadow-sm"
          style={{ borderTopColor: brand.color, borderTopWidth: 4 }}
        >
          <h2 className="mb-4 text-base font-semibold">
            New entry for <span style={{ color: brand.color }}>{brand.name}</span>
          </h2>
          <PostForm
            post={null}
            defaults={{ brand_id: brand.id, post_date: date }}
            brands={brands}
            festivals={festivals}
            today={today}
          />
        </section>
      )}

      {brand && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">
            {date === today ? "Logged today" : `Logged on ${formatDisplayDate(date)}`} ·{" "}
            {brand.name}
          </h2>
          {entries.length === 0 ? (
            <p className="rounded-xl border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
              Nothing logged yet.
            </p>
          ) : (
            <div className="divide-y overflow-hidden rounded-xl border bg-card">
              {entries.map((p) => (
                <PostRow
                  key={p.id}
                  post={p}
                  festival={p.festival_id ? festivalById.get(p.festival_id) : undefined}
                  onClick={() => editSheet.show(p)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {brand && (
        <IdeasCard
          brand={brand}
          ideas={ideas.filter((p) => p.brand_id === brand.id)}
          date={date}
          today={today}
          onEdit={editSheet.show}
        />
      )}

      <section className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-base font-semibold">
            {format(fromISODate(month), "MMMM")} progress
          </h2>
          <Link href={`/master?month=${month.slice(0, 7)}`} className="text-xs text-primary">
            See all →
          </Link>
        </div>
        <ul className="space-y-1">
          {progress.map(({ brandId: id, numbers, due }) => {
            const b = brands.find((x) => x.id === id)!;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => {
                    pickBrand(id);
                    topRef.current?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className={cn(
                    "w-full rounded-xl px-2 py-2 text-left transition-colors hover:bg-muted/60",
                    id === brandId && "bg-muted/60",
                  )}
                >
                  <div className="flex items-center gap-2 text-sm">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: b.color }} />
                    <span className="min-w-0 flex-1 truncate font-medium">{b.name}</span>
                    {due && (
                      <Hourglass
                        className="size-4 text-amber-600"
                        aria-label="Due today, nothing posted yet"
                      />
                    )}
                    <span className="tabular-nums">
                      <span className="font-semibold">{numbers.posted}</span>
                      <span className="text-muted-foreground"> / {numbers.target}</span>
                    </span>
                    <span className="w-14 text-right text-xs text-muted-foreground tabular-nums">
                      {formatPct(numbers.pct)}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 pl-[18px]">
                    <ProgressBar pct={numbers.pct} color={b.color} />
                    <PaceBadge pace={numbers.pace} className="shrink-0" />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <BottomSheet open={editSheet.open} onOpenChange={editSheet.onOpenChange} title="Edit entry">
        {editSheet.value && (
          <PostForm
            key={editSheet.key}
            post={editSheet.value}
            defaults={{ brand_id: editSheet.value.brand_id, post_date: editSheet.value.post_date }}
            brands={brands}
            festivals={festivals}
            today={today}
            showBrandAndDate
            onSaved={editSheet.close}
            onDeleted={editSheet.close}
          />
        )}
      </BottomSheet>
    </div>
  );
}

const IDEAS_PREVIEW = 5;

/** The brand's idea bank: quick add, and Schedule to give an idea a date. */
function IdeasCard({
  brand,
  ideas,
  date,
  today,
  onEdit,
}: {
  brand: Brand;
  ideas: Post[];
  date: ISODate;
  today: ISODate;
  onEdit: (post: Post) => void;
}) {
  const [draft, setDraft] = useState("");
  const [showAll, setShowAll] = useState(false);
  const scheduleSheet = useSheet<Post>();
  const { pending, run } = useRunAction();
  const shown = showAll ? ideas : ideas.slice(0, IDEAS_PREVIEW);

  function add() {
    if (!draft.trim()) return;
    run(() => addIdea(brand.id, draft), { success: "Idea saved", onSuccess: () => setDraft("") });
  }

  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm">
      <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
        <Lightbulb className="size-4 text-amber-500" />
        Ideas <span className="font-normal text-muted-foreground">· {brand.name}</span>
        {ideas.length > 0 && <span className="ml-auto text-sm font-normal text-muted-foreground">{ideas.length}</span>}
      </h2>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <Input
          aria-label="New idea"
          placeholder="Jot down an idea"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          autoComplete="off"
          enterKeyHint="done"
        />
        <Button type="submit" variant="secondary" disabled={pending || !draft.trim()}>
          <Plus /> Add
        </Button>
      </form>
      {ideas.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Save ideas here with no date. When you&apos;re ready, tap Schedule to plan one.
        </p>
      ) : (
        <ul className="mt-3 divide-y overflow-hidden rounded-xl border">
          {shown.map((p) => (
            <li key={p.id} className="flex items-center gap-1 py-1 pr-1 pl-3">
              <button
                type="button"
                className="min-h-11 min-w-0 flex-1 truncate text-left text-sm font-medium"
                onClick={() => onEdit(p)}
              >
                {p.title}
              </button>
              <Button variant="outline" onClick={() => scheduleSheet.show(p)}>
                <CalendarPlus /> Schedule
              </Button>
            </li>
          ))}
        </ul>
      )}
      {ideas.length > IDEAS_PREVIEW && (
        <Button variant="ghost" className="mt-1 w-full" onClick={() => setShowAll((s) => !s)}>
          {showAll ? "Show fewer" : `Show all ${ideas.length}`}
        </Button>
      )}

      <BottomSheet open={scheduleSheet.open} onOpenChange={scheduleSheet.onOpenChange} title="Schedule idea">
        {scheduleSheet.value && (
          <ScheduleForm
            key={scheduleSheet.key}
            idea={scheduleSheet.value}
            initialDate={date >= today ? date : today}
            onDone={scheduleSheet.close}
          />
        )}
      </BottomSheet>
    </section>
  );
}

function ScheduleForm({ idea, initialDate, onDone }: { idea: Post; initialDate: ISODate; onDone: () => void }) {
  const [day, setDay] = useState<ISODate>(initialDate);
  const { pending, run } = useRunAction();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => scheduleIdea(idea.id, day), {
          success: day ? `Planned for ${formatShortDate(day)}` : undefined,
          onSuccess: onDone,
        });
      }}
    >
      <p className="text-sm">
        <span className="font-medium">{idea.title}</span>
        <span className="text-muted-foreground"> becomes a Planned entry on this date.</span>
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="schedule-date">Date</Label>
        <Input id="schedule-date" type="date" required value={day} onChange={(e) => setDay(e.target.value)} />
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={pending || !day}>
        {pending ? "Scheduling…" : "Schedule"}
      </Button>
    </form>
  );
}

function DateBar({ date, today }: { date: ISODate; today: ISODate }) {
  const router = useRouter();
  const pickerRef = useRef<HTMLInputElement>(null);
  const href = (d: ISODate) => (d === today ? "/" : `/?date=${d}`);

  return (
    <div className="flex items-center gap-2">
      <Link
        href={href(addDaysISO(date, -1))}
        aria-label="Previous day"
        className={ON_BAND.button}
      >
        <ChevronLeft />
      </Link>
      <div className="relative min-w-0 flex-1">
        <button
          type="button"
          onClick={() => {
            const input = pickerRef.current;
            if (!input) return;
            try {
              input.showPicker();
            } catch {
              input.focus();
            }
          }}
          className={`${ON_BAND.box} w-full gap-2 px-2`}
        >
          <CalendarDays className="hidden size-4 shrink-0 opacity-80 min-[400px]:block" />
          <span className="truncate">{formatDisplayDate(date)}</span>
        </button>
        <input
          ref={pickerRef}
          type="date"
          aria-label="Pick a date"
          tabIndex={-1}
          value={date}
          onChange={(e) => e.target.value && router.push(href(e.target.value))}
          className="pointer-events-none absolute inset-0 opacity-0"
        />
      </div>
      <Link
        href={href(addDaysISO(date, 1))}
        aria-label="Next day"
        className={ON_BAND.button}
      >
        <ChevronRight />
      </Link>
      {date !== today && (
        <button type="button" className={ON_BAND.pill} onClick={() => router.push("/")}>
          Today
        </button>
      )}
    </div>
  );
}
