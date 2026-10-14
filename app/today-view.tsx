"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { differenceInCalendarDays, format } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, Hourglass, Sparkles } from "lucide-react";
import { BottomSheet } from "@/components/bottom-sheet";
import { PaceBadge, ProgressBar } from "@/components/badges";
import { PostForm } from "@/components/post-form";
import { PostRow } from "@/components/post-row";
import { useRememberedBrand } from "@/components/use-remembered-brand";
import { Button, buttonVariants } from "@/components/ui/button";
import { addDaysISO, formatDisplayDate, fromISODate, type ISODate } from "@/lib/ist";
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
  month: ISODate;
  initialBrandId: string | null;
}) {
  const [remembered, remember] = useRememberedBrand();
  const [picked, setPicked] = useState<string | null>(null);
  const [editing, setEditing] = useState<Post | null>(null);
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
        <DateBar date={date} today={today} />
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
      <div ref={topRef} className="scroll-mt-4" />
      <DateBar date={date} today={today} />

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
                  onClick={() => setEditing(p)}
                />
              ))}
            </div>
          )}
        </section>
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

      <BottomSheet
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        title="Edit entry"
      >
        {editing && (
          <PostForm
            key={editing.id}
            post={editing}
            defaults={{ brand_id: editing.brand_id, post_date: editing.post_date }}
            brands={brands}
            festivals={festivals}
            today={today}
            showBrandAndDate
            onSaved={() => setEditing(null)}
            onDeleted={() => setEditing(null)}
          />
        )}
      </BottomSheet>
    </div>
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
        className={buttonVariants({ variant: "outline", size: "icon" })}
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
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border bg-card px-2 font-semibold"
        >
          <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
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
        className={buttonVariants({ variant: "outline", size: "icon" })}
      >
        <ChevronRight />
      </Link>
      {date !== today && (
        <Button variant="secondary" onClick={() => router.push("/")}>
          Today
        </Button>
      )}
    </div>
  );
}
