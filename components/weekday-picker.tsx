"use client";

import { cn } from "@/lib/utils";
import { WEEKDAY_SHORT } from "@/lib/types";

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

/** Seven day toggles plus Daily / None shortcuts. 0 = Sunday. */
export function WeekdayPicker({
  value,
  onChange,
}: {
  value: number[];
  onChange: (days: number[]) => void;
}) {
  function toggle(day: number) {
    onChange(
      value.includes(day) ? value.filter((d) => d !== day) : [...value, day].sort((a, b) => a - b),
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-1.5">
        {ALL_DAYS.map((day) => {
          const on = value.includes(day);
          return (
            <button
              key={day}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(day)}
              className={cn(
                "h-11 rounded-lg border text-xs font-medium transition-colors",
                on
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-background hover:bg-muted",
              )}
            >
              {WEEKDAY_SHORT[day]}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange(ALL_DAYS)}
          className="h-9 rounded-full border px-4 text-sm hover:bg-muted"
        >
          Daily
        </button>
        <button
          type="button"
          onClick={() => onChange([])}
          className="h-9 rounded-full border px-4 text-sm hover:bg-muted"
        >
          None
        </button>
      </div>
    </div>
  );
}

/** "Daily", "Mon, Wed, Fri" or "No preferred days". */
export function describeDays(days: number[]): string {
  if (days.length === 7) return "Daily";
  if (days.length === 0) return "No preferred days";
  return days.map((d) => WEEKDAY_SHORT[d]).join(", ");
}
