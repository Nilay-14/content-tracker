"use client";

import { useRef, useState } from "react";
import { differenceInCalendarDays } from "date-fns";
import { ChartNoAxesColumn, ChevronDown, History, Link2, Plus, Trash2, TriangleAlert, X } from "lucide-react";
import { saveFestival } from "@/app/actions/festivals";
import { deletePost, restorePost, savePost } from "@/app/actions/posts";
import { ChoiceChips } from "@/components/choice-chips";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { NativeSelect } from "@/components/native-select";
import { toast } from "@/components/toaster";
import { useEntryHints } from "@/components/use-entry-hints";
import { useRunAction } from "@/components/use-run-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatShortDate, fromISODate, todayIST, type ISODate } from "@/lib/ist";
import { formatCount } from "@/lib/stats";
import { peopleSuggestions, repeatWarning, titleSuggestions } from "@/lib/suggest";
import {
  CONTENT_TYPE_LABEL,
  CONTENT_TYPES,
  METRIC_LABEL,
  METRICS,
  POST_STATUS_LABEL,
  POST_STATUSES,
  type Brand,
  type ContentType,
  type Festival,
  type Metric,
  type Post,
  type PostInput,
  type PostStatus,
} from "@/lib/types";

const TYPE_OPTIONS = CONTENT_TYPES.map((t) => ({ value: t, label: CONTENT_TYPE_LABEL[t] }));
const PAGE_PRESETS = [3, 5, 7, 10] as const;
const STATUS_OPTIONS = POST_STATUSES.map((s) => ({ value: s, label: POST_STATUS_LABEL[s] }));

export function defaultStatus(date: ISODate | null, today: ISODate): PostStatus {
  if (!date) return "idea";
  return date <= today ? "posted" : "planned";
}

/** Festivals with the nearest upcoming dates first, then the rest in their usual order. */
export function sortFestivalsForPicker(festivals: Festival[], around: ISODate): Festival[] {
  const upcoming = festivals
    .filter((f) => f.festival_date && f.festival_date >= around)
    .sort((a, b) => a.festival_date!.localeCompare(b.festival_date!));
  const rest = festivals.filter((f) => !upcoming.includes(f));
  return [...upcoming, ...rest];
}

function festivalOptionLabel(f: Festival, around: ISODate) {
  if (!f.festival_date) return f.name;
  const days = differenceInCalendarDays(fromISODate(f.festival_date), fromISODate(around));
  const when =
    days === 0 ? "today" : days > 0 && days <= 60 ? `in ${days} day${days === 1 ? "" : "s"}` : null;
  return `${f.name} · ${formatShortDate(f.festival_date)}${when ? ` (${when})` : ""}`;
}

type FormState = {
  brand_id: string;
  post_date: string;
  title: string;
  content_type: ContentType;
  slide_count: string;
  status: PostStatus;
  skip_reason: string;
  festivalOn: boolean;
  festival_id: string;
  post_url: string;
  people: string[];
  notes: string;
};

function initialState(
  post: Post | null,
  defaults: { brand_id: string; post_date: ISODate | null; status?: PostStatus; festival_id?: string | null },
  today: ISODate,
): FormState {
  return {
    brand_id: post?.brand_id ?? defaults.brand_id,
    post_date: post ? (post.post_date ?? "") : (defaults.post_date ?? ""),
    title: post?.title ?? "",
    content_type: post?.content_type ?? "reel",
    slide_count: post?.slide_count?.toString() ?? "",
    status: post?.status ?? defaults.status ?? defaultStatus(defaults.post_date, today),
    skip_reason: post?.skip_reason ?? "",
    festivalOn: Boolean(post ? post.festival_id : defaults.festival_id),
    festival_id: post?.festival_id ?? defaults.festival_id ?? "",
    post_url: post?.post_url ?? "",
    people: post?.people ?? [],
    notes: post?.notes ?? "",
  };
}

/**
 * The entry form. With `post` it edits that entry (and can delete it);
 * without, it creates a new one for `defaults.brand_id` on `defaults.post_date`.
 */
export function PostForm({
  post,
  defaults,
  brands,
  festivals,
  today,
  showBrandAndDate = false,
  onSaved,
  onDeleted,
}: {
  post: Post | null;
  defaults: {
    brand_id: string;
    post_date: ISODate | null;
    /** Starting status for a new entry; otherwise worked out from the date. */
    status?: PostStatus;
    /** Festival already picked for a new entry (the festival banner's Plan button). */
    festival_id?: string | null;
    rescheduled_from?: ISODate | null;
  };
  brands: Brand[];
  festivals: Festival[];
  today: ISODate;
  showBrandAndDate?: boolean;
  onSaved?: (post: Post) => void;
  onDeleted?: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => initialState(post, defaults, today));
  const [peopleDraft, setPeopleDraft] = useState("");
  const [addingFestival, setAddingFestival] = useState(false);
  const [newFestival, setNewFestival] = useState({ name: "", date: "" });
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Results (views, likes…) for an entry that's already posted.
  const [results, setResults] = useState<Record<Metric, string>>(
    () => Object.fromEntries(METRICS.map((m) => [m, post?.[m]?.toString() ?? ""])) as Record<Metric, string>,
  );
  const [resultsOpen, setResultsOpen] = useState(false);
  const [resultsDirty, setResultsDirty] = useState(false);
  const { pending, run } = useRunAction();
  // Which text box is focused, so its suggestions show. Hidden a moment after
  // blur, so a tap on a suggestion still lands.
  const [focus, setFocus] = useState<"title" | "people" | null>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // When brand and date aren't shown, they come from the page (brand chips, date bar).
  const brandId = showBrandAndDate ? form.brand_id : defaults.brand_id;
  const postDate = showBrandAndDate ? form.post_date : (defaults.post_date ?? "");
  const around = postDate || today;
  const activeFestivals = festivals.filter((f) => f.is_active || f.id === form.festival_id);
  const pickerFestivals = sortFestivalsForPicker(activeFestivals, around);
  const { hints, refresh: refreshHints } = useEntryHints(brandId);
  const titleHints = focus === "title" && hints ? titleSuggestions(hints.history, form.title) : [];
  const peopleHints =
    focus === "people" && hints ? peopleSuggestions(hints.people, peopleDraft, form.people) : [];
  const repeat = hints ? repeatWarning(hints.history, form.title, around, post?.id) : null;

  function focusOn(field: "title" | "people") {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    setFocus(field);
  }

  function blurLater(then?: () => void) {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    blurTimer.current = setTimeout(() => {
      setFocus(null);
      then?.();
    }, 150);
  }

  function pickSuggestion(apply: () => void) {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    setFocus(null);
    apply();
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addPerson(raw: string) {
    const names = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (names.length === 0) return;
    setForm((f) => ({
      ...f,
      people: [...f.people, ...names.filter((n) => !f.people.includes(n))],
    }));
    setPeopleDraft("");
  }

  function toggleFestival(on: boolean) {
    setForm((f) => ({
      ...f,
      festivalOn: on,
      festival_id: on ? f.festival_id || pickerFestivals[0]?.id || "" : f.festival_id,
    }));
  }

  function submit() {
    // Pick up a name typed but not yet turned into a chip.
    const people = peopleDraft.trim()
      ? [...form.people, ...peopleDraft.split(",").map((s) => s.trim()).filter(Boolean)]
      : form.people;
    const input: PostInput = {
      brand_id: brandId,
      post_date: postDate || null,
      title: form.title,
      content_type: form.content_type,
      slide_count:
        form.content_type === "carousel" && form.slide_count.trim() ? Number(form.slide_count) : null,
      status: form.status,
      skip_reason: form.status === "skipped" ? form.skip_reason : null,
      festival_id: form.festivalOn && form.festival_id ? form.festival_id : null,
      post_url: form.post_url,
      people,
      notes: form.notes,
      // Not edited here, but kept so an edit never loses the link to a missed day.
      rescheduled_from: post ? post.rescheduled_from : (defaults.rescheduled_from ?? null),
      ...(resultsDirty
        ? Object.fromEntries(METRICS.map((m) => [m, results[m].trim() === "" ? null : Number(results[m])]))
        : {}),
    };
    run(() => savePost(post?.id ?? null, input), {
      success: post ? "Entry updated" : "Saved",
      onSuccess: (saved) => {
        if (!post) {
          // Clear the form but keep the date and brand.
          setForm(initialState(null, { brand_id: brandId, post_date: postDate || null }, today));
          setPeopleDraft("");
        }
        refreshHints();
        onSaved?.(saved);
      },
    });
  }

  function createFestival() {
    run(() => saveFestival(null, newFestival.name, newFestival.date || null), {
      success: "Festival added",
      onSuccess: (festival) => {
        if (festival) setForm((f) => ({ ...f, festivalOn: true, festival_id: festival.id }));
        setAddingFestival(false);
        setNewFestival({ name: "", date: "" });
      },
    });
  }

  const idPrefix = post?.id ?? "new";

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!form.title.trim()) {
          toast("Add the content or product first", "error");
          return;
        }
        submit();
      }}
    >
      {showBrandAndDate && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-brand`}>Brand</Label>
            <NativeSelect
              id={`${idPrefix}-brand`}
              value={form.brand_id}
              onChange={(e) => set("brand_id", e.target.value)}
            >
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-date`}>Date</Label>
            <Input
              id={`${idPrefix}-date`}
              type="date"
              value={form.post_date}
              required={form.status !== "idea"}
              onChange={(e) => set("post_date", e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-title`}>Content / product</Label>
        <Input
          id={`${idPrefix}-title`}
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          onFocus={() => focusOn("title")}
          onBlur={() => blurLater()}
          placeholder="e.g. Dumpling squishy"
          autoComplete="off"
          enterKeyHint="done"
        />
        {titleHints.length > 0 && (
          <div className="divide-y overflow-hidden rounded-xl border bg-card shadow-sm" aria-label="Earlier titles">
            {titleHints.map((t) => (
              <button
                key={t}
                type="button"
                className="flex h-11 w-full items-center gap-2 px-3 text-left text-sm hover:bg-muted"
                onClick={() => pickSuggestion(() => set("title", t))}
              >
                <History className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{t}</span>
              </button>
            ))}
          </div>
        )}
        {repeat && (
          <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>
              {repeat}. <span className="opacity-80">You can still save it.</span>
            </span>
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Type</Label>
        <ChoiceChips
          label="Type"
          options={TYPE_OPTIONS}
          value={form.content_type}
          onChange={(v) => set("content_type", v)}
        />
      </div>

      {form.content_type === "carousel" && (
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-pages`}>Pages in this carousel</Label>
          <div className="flex flex-wrap items-center gap-2">
            {PAGE_PRESETS.map((n) => {
              const active = form.slide_count === String(n);
              return (
                <button
                  key={n}
                  type="button"
                  aria-pressed={active}
                  onClick={() => set("slide_count", active ? "" : String(n))}
                  className={
                    active
                      ? "h-11 min-w-11 rounded-full border border-primary bg-primary px-3 text-sm font-medium text-primary-foreground"
                      : "h-11 min-w-11 rounded-full border bg-background px-3 text-sm font-medium hover:bg-muted"
                  }
                >
                  {n}
                </button>
              );
            })}
            <Input
              id={`${idPrefix}-pages`}
              type="number"
              inputMode="numeric"
              min={1}
              max={20}
              step={1}
              className="w-24"
              placeholder="Other"
              value={form.slide_count}
              onChange={(e) => set("slide_count", e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">Each page also counts as a static in the monthly numbers.</p>
        </div>
      )}

      <div className="space-y-3 rounded-xl border bg-muted/30 p-3">
        <label className="flex min-h-8 items-center justify-between gap-3">
          <span className="text-sm font-medium">🎉 Festival post</span>
          <Switch checked={form.festivalOn} onCheckedChange={toggleFestival} />
        </label>
        {form.festivalOn && (
          <div className="space-y-2">
            {pickerFestivals.length > 0 && (
              <NativeSelect
                aria-label="Festival"
                value={form.festival_id}
                onChange={(e) => set("festival_id", e.target.value)}
              >
                <option value="" disabled>
                  Pick a festival
                </option>
                {pickerFestivals.map((f) => (
                  <option key={f.id} value={f.id}>
                    {festivalOptionLabel(f, around)}
                  </option>
                ))}
              </NativeSelect>
            )}
            {addingFestival ? (
              <div className="space-y-2 rounded-lg border bg-background p-2">
                <Input
                  aria-label="New festival name"
                  placeholder="Festival name"
                  value={newFestival.name}
                  onChange={(e) => setNewFestival((n) => ({ ...n, name: e.target.value }))}
                />
                <Input
                  aria-label="Festival date (optional)"
                  type="date"
                  value={newFestival.date}
                  onChange={(e) => setNewFestival((n) => ({ ...n, date: e.target.value }))}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    className="flex-1"
                    disabled={pending || !newFestival.name.trim()}
                    onClick={createFestival}
                  >
                    Add
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setAddingFestival(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setAddingFestival(true)}
              >
                <Plus /> Add festival
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Status</Label>
        <ChoiceChips
          label="Status"
          options={STATUS_OPTIONS}
          value={form.status}
          onChange={(v) => set("status", v)}
        />
      </div>

      {form.status === "skipped" && (
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-reason`}>Reason</Label>
          <Input
            id={`${idPrefix}-reason`}
            value={form.skip_reason}
            onChange={(e) => set("skip_reason", e.target.value)}
            placeholder="e.g. Shoot postponed"
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-url`}>Post link (optional)</Label>
        <div className="relative">
          <Link2 className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={`${idPrefix}-url`}
            type="url"
            inputMode="url"
            className="pl-9"
            value={form.post_url}
            onChange={(e) => set("post_url", e.target.value)}
            placeholder="https://instagram.com/p/…"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-people`}>People featured</Label>
        {form.people.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {form.people.map((p) => (
              <span
                key={p}
                className="inline-flex h-8 items-center gap-1 rounded-full bg-secondary pr-1 pl-3 text-sm"
              >
                {p}
                <button
                  type="button"
                  aria-label={`Remove ${p}`}
                  className="flex size-6 items-center justify-center rounded-full hover:bg-muted"
                  onClick={() => set("people", form.people.filter((x) => x !== p))}
                >
                  <X className="size-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
        <Input
          id={`${idPrefix}-people`}
          value={peopleDraft}
          onChange={(e) => {
            const v = e.target.value;
            if (v.endsWith(",")) addPerson(v);
            else setPeopleDraft(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addPerson(peopleDraft);
            }
          }}
          onFocus={() => focusOn("people")}
          onBlur={() => {
            const draft = peopleDraft;
            blurLater(() => addPerson(draft));
          }}
          placeholder="Type a name, then Enter"
          autoComplete="off"
        />
        {peopleHints.length > 0 && (
          <div className="flex flex-wrap gap-1.5" aria-label="Earlier people">
            {peopleHints.map((p) => (
              <button
                key={p}
                type="button"
                className="inline-flex h-11 items-center gap-1 rounded-full border border-dashed bg-background px-3 text-sm hover:bg-muted"
                onClick={() => pickSuggestion(() => addPerson(p))}
              >
                <Plus className="size-3.5" /> {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {post && form.status === "posted" && (
        <div className="rounded-xl border bg-muted/30">
          <button
            type="button"
            aria-expanded={resultsOpen}
            onClick={() => setResultsOpen((o) => !o)}
            className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left text-sm"
          >
            <ChartNoAxesColumn className="size-4 shrink-0 text-primary" />
            <span className="flex-1">
              <span className="font-medium">{post.views !== null || resultsDirty ? "Results" : "Add results"}</span>
              {post.views !== null && !resultsDirty && (
                <span className="text-muted-foreground">
                  {" "}
                  · {formatCount(post.views)} views
                  {post.likes !== null ? ` · ${formatCount(post.likes)} likes` : ""}
                </span>
              )}
            </span>
            <ChevronDown className={`size-4 shrink-0 transition-transform ${resultsOpen ? "rotate-180" : ""}`} />
          </button>
          {resultsOpen && (
            <div className="space-y-2 border-t px-3 pt-3 pb-3">
              <div className="grid grid-cols-2 gap-3">
                {METRICS.map((m) => (
                  <div key={m} className="space-y-1">
                    <Label htmlFor={`${idPrefix}-${m}`} className="text-xs">
                      {METRIC_LABEL[m]}
                    </Label>
                    <Input
                      id={`${idPrefix}-${m}`}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      value={results[m]}
                      onChange={(e) => {
                        setResults((r) => ({ ...r, [m]: e.target.value }));
                        setResultsDirty(true);
                      }}
                    />
                  </div>
                ))}
              </div>
              {post.metrics_updated_at && (
                <p className="text-xs text-muted-foreground">
                  Last updated {formatShortDate(todayIST(new Date(post.metrics_updated_at)))}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-notes`}>Notes</Label>
        <Textarea
          id={`${idPrefix}-notes`}
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={2}
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="lg" className="flex-1" disabled={pending}>
          {pending ? "Saving…" : post ? "Save changes" : "Save entry"}
        </Button>
        {post && (
          <Button
            type="button"
            variant="destructive"
            size="lg"
            aria-label="Delete entry"
            disabled={pending}
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 />
          </Button>
        )}
      </div>

      {post && (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Delete this entry?"
          description={`“${post.title}” will be removed. This can't be undone.`}
          onConfirm={() =>
            run(() => deletePost(post.id), {
              onSuccess: (deleted) => {
                toast("Entry deleted", "success", {
                  label: "Undo",
                  onClick: () =>
                    restorePost(deleted).then((r) =>
                      r.ok ? toast("Entry restored") : toast(r.error, "error"),
                    ),
                });
                onDeleted?.();
              },
            })
          }
        />
      )}
    </form>
  );
}
