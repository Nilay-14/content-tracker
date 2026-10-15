import type { DayState } from "@/lib/stats";

/** How each calendar day state looks. Shared by the Calendar and share links. */
export const STATE_STYLE: Record<DayState, string> = {
  reel: "bg-emerald-500 text-white",
  other: "bg-sky-500 text-white",
  "in-progress": "bg-amber-300 text-amber-950",
  idea: "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200",
  skipped: "bg-zinc-300 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200",
  missed: "bg-red-500 text-white",
  rescheduled: "bg-slate-400 text-white",
  due: "bg-background ring-2 ring-inset ring-primary text-foreground",
  empty: "bg-muted/50 text-foreground",
};

export const STATE_LABEL: Record<DayState, string> = {
  reel: "Reel posted",
  other: "Posted, no reel",
  "in-progress": "In progress",
  idea: "Idea",
  skipped: "Skipped",
  missed: "Missed",
  rescheduled: "Rescheduled",
  due: "Due today",
  empty: "Nothing yet",
};

export const LEGEND: DayState[] = ["reel", "other", "in-progress", "idea", "skipped", "missed", "rescheduled", "due"];
