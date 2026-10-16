"use client";

import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChartNoAxesColumn, ChevronLeft, ChevronRight, Copy, FileText, MessageCircle, Search, Sparkles } from "lucide-react";
import { toast } from "@/components/toaster";
import { whatsappSummary } from "@/lib/summary";
import { BottomSheet } from "@/components/bottom-sheet";
import { PaceBadge, ProgressBar } from "@/components/badges";
import { MonthSwitcher } from "@/components/month-switcher";
import { HeaderBand } from "@/components/page-header";
import { NativeSelect } from "@/components/native-select";
import { PostForm } from "@/components/post-form";
import { PostRow } from "@/components/post-row";
import { useSheet } from "@/components/use-sheet";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button, buttonVariants } from "@/components/ui/button";
import { addDaysISO, formatDisplayDate, formatShortDate, type ISODate } from "@/lib/ist";
import {
  formatCount,
  formatPct,
  monthEndISO,
  monthParam,
  topPosts,
  typeCount,
  type MonthNumbers,
} from "@/lib/stats";
import {
  CONTENT_TYPE_LABEL,
  CONTENT_TYPE_PLURAL,
  CONTENT_TYPES,
  POST_STATUS_LABEL,
  POST_STATUSES,
  type Brand,
  type ContentType,
  type Festival,
  type Post,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type Row = { brandId: string; numbers: MonthNumbers };

export function MasterView({
  month,
  today,
  brands,
  festivals,
  posts,
  rows,
  total,
  upcoming,
}: {
  month: ISODate;
  today: ISODate;
  brands: Brand[];
  festivals: Festival[];
  posts: Post[];
  rows: Row[];
  total: MonthNumbers;
  /** Planned and in-progress entries from today to 6 days ahead. */
  upcoming: Post[];
}) {
  const festivalSheet = useSheet<string | "all">();
  const festivalListFor = festivalSheet.value;
  const setFestivalListFor = festivalSheet.show;
  const editSheet = useSheet<Post>();
  const editing = editSheet.value;
  const brandById = new Map(brands.map((b) => [b.id, b]));
  const festivalById = new Map(festivals.map((f) => [f.id, f]));
  const active = brands.filter((b) => b.is_active);
  // Reels are the headline number (they count toward the target); these are the rest.
  const types: ContentType[] = CONTENT_TYPES.filter(
    (t) => t !== "reel" && (t !== "other" || total.byType.other > 0),
  );

  if (active.length === 0) {
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

  const festivalPosts = posts
    .filter(
      (p) =>
        p.status === "posted" &&
        p.festival_id &&
        (festivalListFor === "all" || p.brand_id === festivalListFor),
    )
    .sort((a, b) => a.post_date!.localeCompare(b.post_date!));

  const calendarHref = (brandId: string) =>
    `/calendar?${new URLSearchParams({ brand: brandId, month: monthParam(month) })}`;

  return (
    <div className="space-y-6">
      <HeaderBand>
        <MonthSwitcher month={month} today={today} basePath="/master" />
      </HeaderBand>

      {/* Phone: one card per brand, then the total. */}
      <div className="space-y-3 md:hidden">
        {rows.map(({ brandId, numbers }) => {
          const b = brandById.get(brandId)!;
          return (
            <SummaryCard
              key={brandId}
              title={
                <Link href={calendarHref(brandId)} className="font-semibold" style={{ color: b.color }}>
                  {b.name} →
                </Link>
              }
              color={b.color}
              numbers={numbers}
              types={types}
              onFestival={() => setFestivalListFor(brandId)}
            />
          );
        })}
        <SummaryCard
          title={<span className="font-semibold">Total</span>}
          color="var(--color-primary)"
          numbers={total}
          types={types}
          onFestival={() => setFestivalListFor("all")}
          highlight
        />
      </div>

      {/* Desktop: one table. */}
      <div className="hidden overflow-hidden rounded-2xl border bg-card md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2.5 text-left font-medium">Brand</th>
              <th className="px-2 py-2.5 text-right font-medium">Reel target</th>
              <th className="px-2 py-2.5 text-right font-medium">Reels</th>
              <th className="px-2 py-2.5 text-right font-medium">Pending</th>
              <th className="px-2 py-2.5 text-right font-medium">%</th>
              <th className="px-3 py-2.5 text-left font-medium">Pace</th>
              {types.map((t) => (
                <th key={t} className="px-2 py-2.5 text-right font-medium">
                  {CONTENT_TYPE_PLURAL[t]}
                </th>
              ))}
              <th className="px-2 py-2.5 text-right font-medium">🎉 Festival</th>
              <th className="px-3 py-2.5 text-right font-medium">All posts</th>
            </tr>
          </thead>
          <tbody>
            {[...rows, { brandId: "total", numbers: total }].map(({ brandId, numbers }) => {
              const b = brandById.get(brandId);
              const isTotal = brandId === "total";
              return (
                <tr key={brandId} className={cn("border-t tabular-nums", isTotal && "bg-muted/40 font-semibold")}>
                  <td className="px-3 py-2.5">
                    {b ? (
                      <Link href={calendarHref(b.id)} className="inline-flex items-center gap-2 font-semibold hover:underline">
                        <span className="size-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                        <span style={{ color: b.color }}>{b.name}</span>
                      </Link>
                    ) : (
                      "Total"
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-right">{numbers.target}</td>
                  <td className="px-2 py-2.5 text-right font-semibold">{numbers.reels}</td>
                  <td className="px-2 py-2.5 text-right">{numbers.pending}</td>
                  <td className="px-2 py-2.5 text-right">{formatPct(numbers.pct)}</td>
                  <td className="px-3 py-2.5">
                    <PaceBadge pace={numbers.pace} />
                  </td>
                  {types.map((t) => (
                    <td key={t} className="px-2 py-2.5 text-right">
                      {typeCount(numbers, t)}
                      {t === "carousel" && numbers.carouselPages > 0 && (
                        <span className="block text-[11px] font-normal text-muted-foreground">
                          {numbers.carouselPages} pages
                        </span>
                      )}
                    </td>
                  ))}
                  <td className="px-2 py-2.5 text-right">
                    <button
                      type="button"
                      className="rounded px-1.5 py-0.5 underline decoration-dotted underline-offset-4 hover:bg-muted"
                      onClick={() => setFestivalListFor(isTotal ? "all" : brandId)}
                    >
                      {numbers.festival}
                    </button>
                  </td>
                  <td className="px-3 py-2.5 text-right text-muted-foreground">{numbers.posted}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ShareSummary
        brands={active}
        textFor={(brandId) =>
          whatsappSummary(
            month,
            today,
            rows
              .filter((r) => !brandId || r.brandId === brandId)
              .map((r) => ({ name: brandById.get(r.brandId)!.name, numbers: r.numbers })),
            total,
          )
        }
      />

      <Link
        href={`/report?${new URLSearchParams({ month: monthParam(month) })}`}
        className={cn(buttonVariants({ variant: "outline" }), "w-full")}
      >
        <FileText /> Monthly report (print or PDF)
      </Link>

      <UpcomingList
        today={today}
        upcoming={upcoming}
        brandById={brandById}
        festivalById={festivalById}
        onEdit={editSheet.show}
      />

      <TopPosts month={month} brands={active} posts={posts} onEdit={editSheet.show} />

      <FestivalGrid month={month} brands={active} festivals={festivals} posts={posts} />

      <CombinedLog
        brands={brands}
        festivals={festivals}
        posts={posts}
        brandById={brandById}
        festivalById={festivalById}
        onEdit={editSheet.show}
      />

      <BottomSheet
        open={festivalSheet.open}
        onOpenChange={festivalSheet.onOpenChange}
        title={`🎉 Festival posts · ${
          festivalListFor === "all" ? "All brands" : (brandById.get(festivalListFor ?? "")?.name ?? "")
        }`}
      >
        {festivalPosts.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No festival posts this month.</p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {festivalPosts.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm">
                <span>
                  <span className="font-medium">{festivalById.get(p.festival_id!)?.name}</span>:{" "}
                  {CONTENT_TYPE_LABEL[p.content_type]}, {formatShortDate(p.post_date!)}
                  <span className="block text-xs text-muted-foreground">{p.title}</span>
                </span>
                {festivalListFor === "all" && (
                  <span className="shrink-0 text-xs" style={{ color: brandById.get(p.brand_id)?.color }}>
                    {brandById.get(p.brand_id)?.name}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </BottomSheet>

      <BottomSheet open={editSheet.open} onOpenChange={editSheet.onOpenChange} title="Edit entry">
        {editing && (
          <PostForm
            key={editSheet.key}
            post={editing}
            defaults={{ brand_id: editing.brand_id, post_date: editing.post_date }}
            brands={brands.filter((b) => b.is_active || b.id === editing.brand_id)}
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

/** Copy the month's summary (all brands, or one), or open WhatsApp with it typed in. */
function ShareSummary({ brands, textFor }: { brands: Brand[]; textFor: (brandId: string) => string }) {
  const [brandId, setBrandId] = useState("");
  const text = textFor(brandId);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      toast("Summary copied. Paste it in WhatsApp");
    } catch {
      toast("Couldn't copy on this device. Use the WhatsApp button", "error");
    }
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <NativeSelect
        aria-label="Summary for"
        className="col-span-2"
        value={brandId}
        onChange={(e) => setBrandId(e.target.value)}
      >
        <option value="">Summary for all brands</option>
        {brands.map((b) => (
          <option key={b.id} value={b.id}>
            Summary for {b.name}
          </option>
        ))}
      </NativeSelect>
      <Button variant="outline" onClick={copy}>
        <Copy /> Copy summary
      </Button>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(text)}`}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(buttonVariants(), "bg-[#25D366] text-white hover:bg-[#1ebe5b]")}
      >
        <MessageCircle /> WhatsApp
      </a>
    </div>
  );
}

function TopPosts({
  month,
  brands,
  posts,
  onEdit,
}: {
  month: ISODate;
  brands: Brand[];
  posts: Post[];
  onEdit: (post: Post) => void;
}) {
  const lists = brands
    .map((b) => ({ brand: b, top: topPosts(posts, b.id, month) }))
    .filter((l) => l.top.length > 0);

  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">Top 5 posts this month</h2>
      {lists.length === 0 ? (
        <p className="rounded-xl border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
          Open a posted entry and tap <span className="font-medium text-foreground">Add results</span> to rank posts by
          views here.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {lists.map(({ brand, top }) => (
            <div key={brand.id} className="overflow-hidden rounded-2xl border border-t-4 bg-card" style={{ borderTopColor: brand.color }}>
              <div className="px-3 pt-2.5 pb-1 font-semibold" style={{ color: brand.color }}>
                {brand.name}
              </div>
              <ol className="divide-y">
                {top.map((p, i) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => onEdit(p)}
                      className="flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted/60"
                    >
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold tabular-nums">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{p.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {CONTENT_TYPE_LABEL[p.content_type]} · {formatShortDate(p.post_date!)}
                          {p.likes !== null && ` · ${formatCount(p.likes)} likes`}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1 font-semibold tabular-nums">
                        <ChartNoAxesColumn className="size-3.5 text-muted-foreground" />
                        {formatCount(p.views)}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function UpcomingList({
  today,
  upcoming,
  brandById,
  festivalById,
  onEdit,
}: {
  today: ISODate;
  upcoming: Post[];
  brandById: Map<string, Brand>;
  festivalById: Map<string, Festival>;
  onEdit: (post: Post) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDaysISO(today, i));
  const byDay = days
    .map((d) => ({ date: d, posts: upcoming.filter((p) => p.post_date === d) }))
    .filter((g) => g.posts.length > 0);
  const dayLabel = (d: ISODate) =>
    d === today ? `Today · ${formatDisplayDate(d)}` : d === days[1] ? `Tomorrow · ${formatDisplayDate(d)}` : formatDisplayDate(d);

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Upcoming 7 days</h2>
        <span className="text-sm text-muted-foreground">
          {formatShortDate(days[0])} – {formatShortDate(days[6])}
        </span>
      </div>
      {byDay.length === 0 ? (
        <p className="rounded-xl border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
          Nothing planned for the next 7 days.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          {byDay.map((g) => (
            <div key={g.date} className="border-b last:border-b-0">
              <div className="border-b bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                {dayLabel(g.date)}
              </div>
              <div className="divide-y">
                {g.posts.map((p) => (
                  <PostRow
                    key={p.id}
                    post={p}
                    brand={brandById.get(p.brand_id)}
                    festival={p.festival_id ? festivalById.get(p.festival_id) : undefined}
                    onClick={() => onEdit(p)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function SummaryCard({
  title,
  color,
  numbers,
  types,
  onFestival,
  highlight = false,
}: {
  title: ReactNode;
  color: string;
  numbers: MonthNumbers;
  types: ContentType[];
  onFestival: () => void;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-t-4 bg-card p-4 shadow-sm",
        highlight && "border-primary/40 bg-primary/5",
      )}
      style={{ borderTopColor: color }}
    >
      <div className="flex items-start justify-between gap-2">
        {title}
        <PaceBadge pace={numbers.pace} />
      </div>
      <div className="mt-2 flex items-baseline gap-1.5 tabular-nums">
        <span className="text-3xl font-bold">{numbers.reels}</span>
        <span className="text-muted-foreground">/ {numbers.target} reels</span>
        <span className="ml-auto text-sm font-medium">{formatPct(numbers.pct)}</span>
      </div>
      <div className="mt-2">
        <ProgressBar pct={numbers.pct} color={color} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1.5 text-center text-xs">
        {types.map((t) => (
          <div key={t} className="rounded-lg bg-muted/60 py-1.5">
            <div className="text-base font-semibold tabular-nums">{typeCount(numbers, t)}</div>
            <div className="text-muted-foreground">
              {CONTENT_TYPE_PLURAL[t]}
              {t === "carousel" && numbers.carouselPages > 0 && (
                <span className="block text-[11px]">{numbers.carouselPages} pages</span>
              )}
              {t === "static" && numbers.carouselPages > 0 && (
                <span className="block text-[11px]">incl. pages</span>
              )}
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={onFestival}
          className="rounded-lg bg-amber-100 py-1.5 transition-colors hover:bg-amber-200 dark:bg-amber-950"
        >
          <div className="text-base font-semibold tabular-nums">{numbers.festival}</div>
          <div className="text-amber-900 dark:text-amber-300">🎉 Festival</div>
        </button>
        <div className="rounded-lg bg-muted/60 py-1.5">
          <div className="text-base font-semibold tabular-nums">{numbers.pending}</div>
          <div className="text-muted-foreground">Reels pending</div>
        </div>
        <div className="rounded-lg bg-muted/60 py-1.5">
          <div className="text-base font-semibold tabular-nums">{numbers.posted}</div>
          <div className="text-muted-foreground">All posts</div>
        </div>
      </div>
    </div>
  );
}

function FestivalGrid({
  month,
  brands,
  festivals,
  posts,
}: {
  month: ISODate;
  brands: Brand[];
  festivals: Festival[];
  posts: Post[];
}) {
  const [selected, setSelected] = useState<{ festivalId: string; brandId: string } | null>(null);
  const end = monthEndISO(month);
  const posted = posts.filter((p) => p.status === "posted" && p.festival_id);
  const shown = festivals.filter(
    (f) =>
      posts.some((p) => p.festival_id === f.id) ||
      (f.festival_date && f.festival_date >= month && f.festival_date <= end),
  );
  if (shown.length === 0) return null;

  const cell = (festivalId: string, brandId: string) =>
    posted.filter((p) => p.festival_id === festivalId && p.brand_id === brandId);

  const detail = selected ? cell(selected.festivalId, selected.brandId) : [];
  const typeSummary = CONTENT_TYPES.map((t) => [t, detail.filter((p) => p.content_type === t).length] as const)
    .filter(([, n]) => n > 0)
    .map(([t, n]) => `${n} ${n === 1 ? CONTENT_TYPE_LABEL[t] : CONTENT_TYPE_PLURAL[t]}`)
    .join(", ");

  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">Festivals this month</h2>
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Festival</th>
              {brands.map((b) => (
                <th key={b.id} className="px-2 py-2 text-center font-medium whitespace-nowrap">
                  <span style={{ color: b.color }}>{b.name.split(" ")[0]}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((f) => (
              <tr key={f.id} className="border-t">
                <td className="px-3 py-2">
                  <div className="font-medium">{f.name}</div>
                  {f.festival_date && (
                    <div className="text-xs text-muted-foreground">{formatShortDate(f.festival_date)}</div>
                  )}
                </td>
                {brands.map((b) => {
                  const n = cell(f.id, b.id).length;
                  const isSel = selected?.festivalId === f.id && selected.brandId === b.id;
                  return (
                    <td key={b.id} className="px-1 py-1 text-center">
                      <button
                        type="button"
                        disabled={n === 0}
                        onClick={() => setSelected(isSel ? null : { festivalId: f.id, brandId: b.id })}
                        className={cn(
                          "size-11 rounded-lg text-base font-semibold tabular-nums",
                          n > 0 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "text-muted-foreground",
                          isSel && "ring-2 ring-primary",
                        )}
                      >
                        {n > 0 ? n : "–"}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected && detail.length > 0 && (
        <p className="text-sm">
          <span className="font-medium">{festivals.find((f) => f.id === selected.festivalId)?.name}</span> ·{" "}
          {brands.find((b) => b.id === selected.brandId)?.name}: {typeSummary}
        </p>
      )}
    </section>
  );
}

const LOG_PAGE_SIZE = 10;

function CombinedLog({
  brands,
  festivals,
  posts,
  brandById,
  festivalById,
  onEdit,
}: {
  brands: Brand[];
  festivals: Festival[];
  posts: Post[];
  brandById: Map<string, Brand>;
  festivalById: Map<string, Festival>;
  onEdit: (post: Post) => void;
}) {
  const [brand, setBrand] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [festival, setFestival] = useState("");
  const [festivalOnly, setFestivalOnly] = useState(false);
  const [search, setSearch] = useState("");

  const q = search.trim().toLowerCase();
  const filtered = posts
    .filter(
      (p) =>
        (!brand || p.brand_id === brand) &&
        (!status || p.status === status) &&
        (!type || p.content_type === type) &&
        (!festival || p.festival_id === festival) &&
        (!festivalOnly || p.festival_id) &&
        (!q ||
          [p.title, p.notes ?? "", p.skip_reason ?? "", ...p.people].some((s) => s.toLowerCase().includes(q))),
    )
    .sort(
      (a, b) => (b.post_date ?? "").localeCompare(a.post_date ?? "") || b.created_at.localeCompare(a.created_at),
    );
  const usedFestivals = festivals.filter((f) => posts.some((p) => p.festival_id === f.id));

  // 10 per page. Changing a filter or the search goes back to page 1.
  const filterKey = [brand, status, type, festival, festivalOnly, q].join("|");
  const [paging, setPaging] = useState({ key: filterKey, page: 0 });
  const pages = Math.max(1, Math.ceil(filtered.length / LOG_PAGE_SIZE));
  const page = paging.key === filterKey ? Math.min(paging.page, pages - 1) : 0;
  const shown = filtered.slice(page * LOG_PAGE_SIZE, (page + 1) * LOG_PAGE_SIZE);
  const topRef = useRef<HTMLElement>(null);

  function goTo(next: number) {
    setPaging({ key: filterKey, page: next });
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section ref={topRef} className="scroll-mt-4 space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">All entries</h2>
        <span className="text-sm text-muted-foreground tabular-nums">
          {filtered.length} of {posts.length}
        </span>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          aria-label="Search entries"
          placeholder="Search content, people, notes"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <NativeSelect aria-label="Brand" value={brand} onChange={(e) => setBrand(e.target.value)}>
          <option value="">All brands</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {POST_STATUSES.map((s) => (
            <option key={s} value={s}>
              {POST_STATUS_LABEL[s]}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Type" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          {CONTENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {CONTENT_TYPE_LABEL[t]}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Festival" value={festival} onChange={(e) => setFestival(e.target.value)}>
          <option value="">All festivals</option>
          {usedFestivals.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </NativeSelect>
      </div>
      <label className="flex h-11 items-center gap-3 text-sm">
        <Switch checked={festivalOnly} onCheckedChange={setFestivalOnly} />
        🎉 Festival posts only
      </label>
      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
          No entries match.
        </p>
      ) : (
        <>
          <div className="divide-y overflow-hidden rounded-xl border bg-card">
            {shown.map((p) => (
              <PostRow
                key={p.id}
                post={p}
                brand={brandById.get(p.brand_id)}
                festival={p.festival_id ? festivalById.get(p.festival_id) : undefined}
                showDate
                onClick={() => onEdit(p)}
              />
            ))}
          </div>
          {pages > 1 && (
            <nav aria-label="Pages" className="flex items-center justify-between gap-2">
              <Button variant="outline" disabled={page === 0} onClick={() => goTo(page - 1)}>
                <ChevronLeft /> Previous
              </Button>
              <span className="text-sm text-muted-foreground tabular-nums">
                Page {page + 1} of {pages}
              </span>
              <Button variant="outline" disabled={page >= pages - 1} onClick={() => goTo(page + 1)}>
                Next <ChevronRight />
              </Button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
