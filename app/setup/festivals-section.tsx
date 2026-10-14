"use client";

import { useState } from "react";
import { differenceInCalendarDays } from "date-fns";
import { Archive, ArrowDown, ArrowUp, PartyPopper, Plus, Sparkles } from "lucide-react";
import {
  addStarterFestivals,
  archiveFestival,
  moveFestival,
  saveFestival,
} from "@/app/actions/festivals";
import { BottomSheet } from "@/components/bottom-sheet";
import { useRunAction } from "@/components/use-run-action";
import { useSheet } from "@/components/use-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDisplayDate, fromISODate, type ISODate } from "@/lib/ist";
import type { Festival } from "@/lib/types";
import { cn } from "@/lib/utils";

function relative(date: ISODate, today: ISODate) {
  const days = differenceInCalendarDays(fromISODate(date), fromISODate(today));
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days > 1) return `in ${days} days`;
  return null;
}

export function FestivalsSection({ festivals, today }: { festivals: Festival[]; today: ISODate }) {
  const sheet = useSheet<Festival | "new">();
  const editing = sheet.value;
  const setEditing = sheet.show;
  const [showArchived, setShowArchived] = useState(false);
  const { pending, run } = useRunAction();
  const active = festivals.filter((f) => f.is_active);
  const archived = festivals.filter((f) => !f.is_active);

  function row(festival: Festival, group: Festival[]) {
    const index = group.indexOf(festival);
    const when = festival.festival_date ? relative(festival.festival_date, today) : null;
    return (
      <li
        key={festival.id}
        className={cn("flex items-center gap-2 py-1 pr-1 pl-3", !festival.is_active && "opacity-60")}
      >
        <button
          type="button"
          className="min-h-11 min-w-0 flex-1 py-1.5 text-left"
          onClick={() => setEditing(festival)}
        >
          <div className="truncate font-medium">{festival.name}</div>
          <div className="text-xs text-muted-foreground">
            {festival.festival_date ? (
              <>
                {formatDisplayDate(festival.festival_date)}
                {when && <span className="ml-1 font-medium text-primary">· {when}</span>}
              </>
            ) : (
              <span className="text-amber-700 dark:text-amber-400">Tap to add this year&apos;s date</span>
            )}
          </div>
        </button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Move ${festival.name} up`}
          disabled={pending || index === 0}
          onClick={() => run(() => moveFestival(festival.id, -1))}
        >
          <ArrowUp />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Move ${festival.name} down`}
          disabled={pending || index === group.length - 1}
          onClick={() => run(() => moveFestival(festival.id, 1))}
        >
          <ArrowDown />
        </Button>
      </li>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Festivals</h2>
        <Button variant="outline" size="sm" onClick={() => setEditing("new")}>
          <Plus /> Add festival
        </Button>
      </div>

      {festivals.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-6 text-center">
          <PartyPopper className="mx-auto mb-2 size-7 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No festivals yet.</p>
          <Button
            className="mt-3"
            disabled={pending}
            onClick={() => run(addStarterFestivals, { success: "Starter festivals added" })}
          >
            <Sparkles /> Add starter festivals
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            18 Indian festivals and holidays. Then add this year&apos;s dates.
          </p>
        </div>
      ) : (
        <>
          <ul className="divide-y rounded-xl border bg-card">{active.map((f) => row(f, active))}</ul>
          {archived.length > 0 && (
            <div>
              <button
                type="button"
                className="h-11 text-sm text-muted-foreground underline-offset-4 hover:underline"
                onClick={() => setShowArchived((s) => !s)}
              >
                {showArchived ? "Hide" : "Show"} {archived.length} archived
              </button>
              {showArchived && (
                <ul className="divide-y rounded-xl border bg-card">
                  {archived.map((f) => row(f, archived))}
                </ul>
              )}
            </div>
          )}
        </>
      )}

      <BottomSheet
        open={sheet.open}
        onOpenChange={sheet.onOpenChange}
        title={editing === "new" ? "Add festival" : "Edit festival"}
      >
        {editing !== null && (
          <FestivalEditor
            key={sheet.key}
            festival={editing === "new" ? null : editing}
            onDone={sheet.close}
          />
        )}
      </BottomSheet>
    </section>
  );
}

function FestivalEditor({ festival, onDone }: { festival: Festival | null; onDone: () => void }) {
  const [name, setName] = useState(festival?.name ?? "");
  const [date, setDate] = useState(festival?.festival_date ?? "");
  const { pending, run } = useRunAction();

  return (
    <div className="space-y-4">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => saveFestival(festival?.id ?? null, name, date || null), {
            success: festival ? "Festival saved" : "Festival added",
            onSuccess: onDone,
          });
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="festival-name">Name</Label>
          <Input
            id="festival-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Diwali"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="festival-date">This year&apos;s date (optional)</Label>
          <div className="flex gap-2">
            <Input
              id="festival-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            {date && (
              <Button type="button" variant="ghost" onClick={() => setDate("")}>
                Clear
              </Button>
            )}
          </div>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {festival ? "Save festival" : "Add festival"}
        </Button>
      </form>
      {festival && (
        <Button
          variant="outline"
          className="w-full"
          disabled={pending}
          onClick={() =>
            run(() => archiveFestival(festival.id, festival.is_active), {
              success: festival.is_active ? "Festival archived" : "Festival restored",
              onSuccess: onDone,
            })
          }
        >
          <Archive /> {festival.is_active ? "Archive festival" : "Restore festival"}
        </Button>
      )}
    </div>
  );
}
