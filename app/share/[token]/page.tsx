import { Suspense } from "react";
import { connection } from "next/server";
import { ExternalLink, Link2Off } from "lucide-react";
import { StatusBadge } from "@/components/badges";
import { ConnectNotice } from "@/components/connect-notice";
import { LEGEND, STATE_LABEL, STATE_STYLE } from "@/components/day-states";
import { MonthSwitcher } from "@/components/month-switcher";
import { HeaderBand, PageHeader } from "@/components/page-header";
import { ListSkeleton } from "@/components/skeletons";
import { StatStrip } from "@/components/stat-strip";
import { TYPE_ICON } from "@/components/type-icon";
import { getBrandByShareToken, listMonthTargets } from "@/lib/db/brands";
import { isDbConfigured } from "@/lib/db/client";
import { listFestivals } from "@/lib/db/festivals";
import { listPostsBetween, listReschedulesFor } from "@/lib/db/posts";
import { formatDisplayDate, fromISODate, todayIST } from "@/lib/ist";
import { dayState, daysOfMonth, monthEndISO, monthNumbers, parseMonthParam, weekday } from "@/lib/stats";
import { CONTENT_TYPE_LABEL, CONTENT_TYPES, WEEKDAY_SHORT } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * A brand's read-only page for its owner: no PIN, nothing can be changed.
 * Notes, people and results stay private.
 */
export default function SharePage({ params, searchParams }: PageProps<"/share/[token]">) {
  return (
    <Suspense fallback={<ListSkeleton rows={6} />}>
      <ShareContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function ShareContent({ params, searchParams }: PageProps<"/share/[token]">) {
  await connection();
  if (!isDbConfigured()) return <ConnectNotice />;

  const { token } = await params;
  const brand = /^[A-Za-z0-9_-]{16,64}$/.test(token) ? await getBrandByShareToken(token) : null;
  if (!brand) {
    return (
      <>
        <PageHeader title="Link not working" />
        <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          <Link2Off className="mx-auto mb-2 size-7" />
          This share link was turned off or replaced. Ask for a new one.
        </div>
      </>
    );
  }

  const sp = await searchParams;
  const today = todayIST();
  const month = parseMonthParam(typeof sp.month === "string" ? sp.month : undefined, today);
  const end = monthEndISO(month);
  const [posts, reschedules, targets, festivals] = await Promise.all([
    listPostsBetween(month, end, { brandId: brand.id }),
    listReschedulesFor(month, end, { brandId: brand.id }),
    listMonthTargets({ month }),
    listFestivals(),
  ]);
  const relevant = [...posts, ...reschedules.filter((r) => !posts.some((p) => p.id === r.id))];
  const numbers = monthNumbers(brand, month, posts, targets, today);
  const festivalById = new Map(festivals.map((f) => [f.id, f]));
  const days = daysOfMonth(month);
  const shown = posts
    .filter((p) => p.status !== "idea")
    .sort((a, b) => a.post_date!.localeCompare(b.post_date!) || a.created_at.localeCompare(b.created_at));

  return (
    <>
      <PageHeader title={brand.name} subtitle="Content calendar · view only" />
      <div className="space-y-5">
        <HeaderBand>
          <MonthSwitcher month={month} today={today} basePath={`/share/${token}`} />
        </HeaderBand>

        <StatStrip numbers={numbers} />

        <div>
          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
            {WEEKDAY_SHORT.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: weekday(month) }, (_, i) => (
              <div key={`lead-${i}`} />
            ))}
            {days.map((d) => {
              const state = dayState(brand, d, relevant, today);
              const onDay = posts.filter((p) => p.post_date === d && p.status === "posted");
              const types = CONTENT_TYPES.map((t) => [t, onDay.filter((p) => p.content_type === t).length] as const).filter(
                ([, n]) => n > 0,
              );
              return (
                <div
                  key={d}
                  title={`${formatDisplayDate(d)}: ${STATE_LABEL[state]}`}
                  className={cn(
                    "relative flex aspect-square flex-col items-start rounded-lg p-1 text-sm font-semibold sm:p-1.5",
                    STATE_STYLE[state],
                    d === today && state !== "due" && "ring-2 ring-foreground ring-offset-1 ring-offset-background",
                  )}
                >
                  <span className="leading-none">{fromISODate(d).getDate()}</span>
                  {onDay.some((p) => p.festival_id) && (
                    <span className="absolute top-0.5 right-0.5 text-xs leading-none">🎉</span>
                  )}
                  {types.length > 0 && (
                    <span className="mt-auto flex flex-wrap items-center gap-x-1 text-[11px] leading-none font-bold">
                      {types.map(([t, n]) => {
                        const Icon = TYPE_ICON[t];
                        return (
                          <span key={t} className="inline-flex items-center">
                            <Icon className="size-3.5 sm:size-4" strokeWidth={2.5} aria-hidden />
                            {n > 1 && <span className="ml-px">{n}</span>}
                          </span>
                        );
                      })}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
            {LEGEND.filter((s) => s !== "due" && s !== "idea").map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5">
                <span className={cn("size-3 rounded", STATE_STYLE[s])} />
                {STATE_LABEL[s]}
              </span>
            ))}
            {CONTENT_TYPES.map((t) => {
              const Icon = TYPE_ICON[t];
              return (
                <span key={t} className="inline-flex items-center gap-1">
                  <Icon className="size-3.5" aria-hidden />
                  {CONTENT_TYPE_LABEL[t]}
                </span>
              );
            })}
          </div>
        </div>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">
            This month <span className="font-normal text-muted-foreground">· {shown.length}</span>
          </h2>
          {shown.length === 0 ? (
            <p className="rounded-xl border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
              Nothing for this month yet.
            </p>
          ) : (
            <ul className="divide-y overflow-hidden rounded-xl border bg-card">
              {shown.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="w-14 shrink-0 text-xs text-muted-foreground tabular-nums">
                    {formatDisplayDate(p.post_date!).slice(0, 6)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{p.title}</span>
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <StatusBadge status={p.status} />
                      <span>
                        {CONTENT_TYPE_LABEL[p.content_type]}
                        {p.content_type === "carousel" && p.slide_count ? ` · ${p.slide_count} pages` : ""}
                      </span>
                      {p.festival_id && <span>🎉 {festivalById.get(p.festival_id)?.name}</span>}
                    </span>
                  </span>
                  {p.post_url && (
                    <a
                      href={p.post_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open “${p.title}” on Instagram`}
                      className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                    >
                      <ExternalLink className="size-4" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
