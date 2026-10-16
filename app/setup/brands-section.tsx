"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Archive, ArrowDown, ArrowUp, Copy, MessageCircle, Plus, Share2, Sparkles, Target, Trash2, X } from "lucide-react";
import {
  addStarterBrands,
  archiveBrand,
  createShareLink,
  deleteBrand,
  moveBrand,
  removeMonthTarget,
  removeShareLink,
  saveBrand,
  setMonthTarget,
  type BrandForm,
} from "@/app/actions/brands";
import { BottomSheet } from "@/components/bottom-sheet";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "@/components/toaster";
import { useRunAction } from "@/components/use-run-action";
import { useSheet } from "@/components/use-sheet";
import { describeDays, WeekdayPicker } from "@/components/weekday-picker";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fromISODate, monthStartISO, type ISODate } from "@/lib/ist";
import { monthParam } from "@/lib/stats";
import type { Brand, BrandMonthTarget } from "@/lib/types";
import { cn } from "@/lib/utils";

const SWATCHES = [
  "#F59E0B", "#EF4444", "#EC4899", "#8B5CF6", "#6366F1", "#3B82F6",
  "#06B6D4", "#10B981", "#84CC16", "#F97316", "#64748B", "#0F172A",
];

export function BrandsSection({
  brands,
  postCounts,
  targets,
  today,
}: {
  brands: Brand[];
  postCounts: Record<string, number>;
  targets: BrandMonthTarget[];
  today: ISODate;
}) {
  const sheet = useSheet<Brand | "new">();
  const editing = sheet.value;
  const setEditing = sheet.show;
  const { pending, run } = useRunAction();
  const active = brands.filter((b) => b.is_active);
  const archived = brands.filter((b) => !b.is_active);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Brands</h2>
        <Button variant="outline" size="sm" onClick={() => setEditing("new")}>
          <Plus /> Add brand
        </Button>
      </div>

      {brands.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">No brands yet.</p>
          <Button
            className="mt-3"
            disabled={pending}
            onClick={() => run(addStarterBrands, { success: "Starter brands added" })}
          >
            <Sparkles /> Add starter brands
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Cocoland Toys, iCraft Asia and Plush Salon. You can edit them after.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {[...active, ...archived].map((brand) => {
            const group = brand.is_active ? active : archived;
            const index = group.indexOf(brand);
            const overrides = targets.filter(
              (t) => t.brand_id === brand.id && t.month >= monthStartISO(today),
            );
            return (
              <li
                key={brand.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl border bg-card p-3",
                  !brand.is_active && "opacity-60",
                )}
              >
                <div
                  className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                  style={{ backgroundColor: brand.color }}
                >
                  {brand.name.slice(0, 1).toUpperCase()}
                </div>
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => setEditing(brand)}
                >
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{brand.name}</span>
                    {!brand.is_active && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs">Archived</span>
                    )}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {brand.monthly_target}/month · {describeDays(brand.preferred_days)}
                    {brand.instagram_handle ? ` · ${brand.instagram_handle}` : ""}
                  </div>
                  {overrides.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {overrides.map((o) => (
                        <span
                          key={o.id}
                          className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                        >
                          {format(fromISODate(o.month), "MMM")}: {o.target}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
                <div className="flex shrink-0 flex-col">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Move ${brand.name} up`}
                    disabled={pending || index === 0}
                    onClick={() => run(() => moveBrand(brand.id, -1), { success: "Moved up", undo: () => moveBrand(brand.id, 1) })}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Move ${brand.name} down`}
                    disabled={pending || index === group.length - 1}
                    onClick={() => run(() => moveBrand(brand.id, 1), { success: "Moved down", undo: () => moveBrand(brand.id, -1) })}
                  >
                    <ArrowDown />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <BottomSheet
        open={sheet.open}
        onOpenChange={sheet.onOpenChange}
        title={editing === "new" ? "Add brand" : "Edit brand"}
      >
        {editing !== null && (
          <BrandEditor
            key={sheet.key}
            brand={editing === "new" ? null : editing}
            postCount={editing === "new" ? 0 : (postCounts[editing.id] ?? 0)}
            targets={editing === "new" ? [] : targets.filter((t) => t.brand_id === editing.id)}
            today={today}
            onDone={sheet.close}
          />
        )}
      </BottomSheet>
    </section>
  );
}

function BrandEditor({
  brand,
  postCount,
  targets,
  today,
  onDone,
}: {
  brand: Brand | null;
  postCount: number;
  targets: BrandMonthTarget[];
  today: ISODate;
  onDone: () => void;
}) {
  const [form, setForm] = useState<BrandForm>({
    name: brand?.name ?? "",
    instagram_handle: brand?.instagram_handle ?? "",
    color: brand?.color ?? "#6366F1",
    monthly_target: brand?.monthly_target ?? 0,
    preferred_days: brand?.preferred_days ?? [],
  });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { pending, run } = useRunAction();

  function set<K extends keyof BrandForm>(key: K, value: BrandForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <div className="space-y-6">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => saveBrand(brand?.id ?? null, form), {
            success: brand ? "Brand saved" : "Brand added",
            undo: brand
              ? () =>
                  saveBrand(brand.id, {
                    name: brand.name,
                    instagram_handle: brand.instagram_handle ?? "",
                    color: brand.color,
                    monthly_target: brand.monthly_target,
                    preferred_days: brand.preferred_days,
                  })
              : undefined,
            onSuccess: onDone,
          });
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="brand-name">Name</Label>
          <Input
            id="brand-name"
            required
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Cocoland Toys"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="brand-handle">Instagram handle</Label>
          <Input
            id="brand-handle"
            value={form.instagram_handle}
            onChange={(e) => set("instagram_handle", e.target.value)}
            placeholder="@handle"
            autoCapitalize="none"
            autoCorrect="off"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Colour</Label>
          <div className="flex flex-wrap items-center gap-2">
            {SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Colour ${c}`}
                aria-pressed={form.color.toUpperCase() === c}
                onClick={() => set("color", c)}
                className={cn(
                  "size-9 rounded-full ring-offset-2 ring-offset-background transition",
                  form.color.toUpperCase() === c && "ring-2 ring-foreground",
                )}
                style={{ backgroundColor: c }}
              />
            ))}
            <label className="relative flex size-9 cursor-pointer items-center justify-center overflow-hidden rounded-full border text-xs text-muted-foreground">
              <span aria-hidden>+</span>
              <input
                type="color"
                aria-label="Custom colour"
                value={form.color}
                onChange={(e) => set("color", e.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="brand-target">Monthly target (posts)</Label>
          <Input
            id="brand-target"
            type="number"
            inputMode="numeric"
            min={0}
            max={1000}
            value={form.monthly_target}
            onChange={(e) => set("monthly_target", Number(e.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Preferred days (optional)</Label>
          <WeekdayPicker value={form.preferred_days} onChange={(d) => set("preferred_days", d)} />
          <p className="text-xs text-muted-foreground">
            Only days picked here can show as missed. Leave it on None to track by target and pace only.
          </p>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {brand ? "Save brand" : "Add brand"}
        </Button>
      </form>

      {brand && (
        <>
          <MonthTargets brand={brand} targets={targets} today={today} />

          <ShareLinkBox brand={brand} />

          <div className="space-y-2 border-t pt-4">
            <Button
              variant="outline"
              className="w-full"
              disabled={pending}
              onClick={() =>
                run(() => archiveBrand(brand.id, brand.is_active), {
                  success: brand.is_active ? "Brand archived" : "Brand restored",
                  undo: () => archiveBrand(brand.id, !brand.is_active),
                  onSuccess: onDone,
                })
              }
            >
              <Archive /> {brand.is_active ? "Archive brand" : "Restore brand"}
            </Button>
            {brand.is_active && (
              <p className="text-xs text-muted-foreground">
                Archiving hides it from Today and Master but keeps its history.
              </p>
            )}
            {postCount === 0 ? (
              <Button
                variant="destructive"
                className="w-full"
                disabled={pending}
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 /> Delete brand
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">
                {postCount} {postCount === 1 ? "entry" : "entries"} logged, so this brand can be
                archived but not deleted.
              </p>
            )}
          </div>
          <ConfirmDialog
            open={confirmDelete}
            onOpenChange={setConfirmDelete}
            title={`Delete ${brand.name}?`}
            description="This can't be undone."
            onConfirm={() =>
              run(() => deleteBrand(brand.id), { success: "Brand deleted", onSuccess: onDone })
            }
          />
        </>
      )}
    </div>
  );
}

/** A read-only link for the brand's owner: create, copy, send, replace or turn off. */
function ShareLinkBox({ brand }: { brand: Brand }) {
  const [token, setToken] = useState(brand.share_token ?? null);
  const { pending, run } = useRunAction();
  const url = token && typeof window !== "undefined" ? `${window.location.origin}/share/${token}` : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied");
    } catch {
      toast("Couldn't copy on this device", "error");
    }
  }

  return (
    <div className="space-y-3 border-t pt-4">
      <div className="flex items-center gap-2">
        <Share2 className="size-4 text-muted-foreground" />
        <h3 className="font-medium">Share link for the brand owner</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        A read-only page with {brand.name}&apos;s calendar and numbers. It works without your PIN, and nobody can change
        anything from it.
      </p>
      {token ? (
        <>
          <Input readOnly value={url} aria-label="Share link" onFocus={(e) => e.target.select()} />
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" onClick={copy}>
              <Copy /> Copy link
            </Button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`${brand.name} content calendar: ${url}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants(), "bg-[#25D366] text-white hover:bg-[#1ebe5b]")}
            >
              <MessageCircle /> WhatsApp
            </a>
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() =>
                run(() => createShareLink(brand.id), {
                  success: "New link made. The old one no longer works",
                  onSuccess: (t) => setToken(t),
                })
              }
            >
              New link
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="text-destructive"
              disabled={pending}
              onClick={() => run(() => removeShareLink(brand.id), { success: "Link turned off", onSuccess: () => setToken(null) })}
            >
              Turn off
            </Button>
          </div>
        </>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={pending}
          onClick={() => run(() => createShareLink(brand.id), { success: "Share link made", onSuccess: (t) => setToken(t) })}
        >
          <Share2 /> Make a share link
        </Button>
      )}
    </div>
  );
}

function MonthTargets({
  brand,
  targets,
  today,
}: {
  brand: Brand;
  targets: BrandMonthTarget[];
  today: ISODate;
}) {
  const [month, setMonth] = useState(monthParam(today));
  const [target, setTarget] = useState(brand.monthly_target);
  const { pending, run } = useRunAction();

  return (
    <div className="space-y-3 border-t pt-4">
      <div className="flex items-center gap-2">
        <Target className="size-4 text-muted-foreground" />
        <h3 className="font-medium">Change target for one month</h3>
      </div>
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => setMonthTarget(brand.id, `${month}-01`, target), {
            success: "Monthly target saved",
          });
        }}
      >
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor="override-month">Month</Label>
          <Input
            id="override-month"
            type="month"
            required
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </div>
        <div className="w-24 space-y-1.5">
          <Label htmlFor="override-target">Posts</Label>
          <Input
            id="override-target"
            type="number"
            inputMode="numeric"
            min={0}
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
          />
        </div>
        <Button type="submit" disabled={pending || !month}>
          Set
        </Button>
      </form>
      {targets.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {targets.map((t) => (
            <li key={t.id} className="flex items-center justify-between py-1 pr-1 pl-3 text-sm">
              <span>
                {format(fromISODate(t.month), "MMMM yyyy")}:{" "}
                <span className="font-semibold">{t.target}</span>
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Remove this month's target"
                disabled={pending}
                onClick={() => run(() => removeMonthTarget(t.id), { success: "Removed" })}
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
