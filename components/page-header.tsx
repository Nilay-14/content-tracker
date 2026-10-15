import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

/** Full screen width from inside the centred <main>, with content kept in line. */
const BLEED = "mx-[calc(50%_-_50vw)] px-[calc(50vw_-_50%)] bg-header text-header-foreground";

/**
 * The coloured band at the top of every page: title, a short subtitle and the
 * light/dark button. A `HeaderBand` placed right after it (for the date or
 * month switcher) joins on seamlessly and extends the band.
 */
export function PageHeader({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <header className={cn(BLEED, "mb-5 rounded-b-[1.75rem] pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-5 print:hidden")}>
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-[1.65rem] font-bold tracking-tight">{title}</h1>
        <ThemeToggle />
      </div>
      {subtitle && <p className="-mt-1 text-sm text-header-foreground/75">{subtitle}</p>}
    </header>
  );
}

/**
 * Extends the page header's band down around its children. Use it as the
 * first thing a page renders after `PageHeader`.
 */
export function HeaderBand({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <div className={cn(BLEED, "relative -mt-10 rounded-b-[1.75rem] pt-2 pb-5", className)}>{children}</div>
  );
}

/** Buttons and boxes that sit on the band: see-through white instead of grey. */
export const ON_BAND = {
  button:
    "flex size-11 shrink-0 items-center justify-center rounded-full bg-white/15 text-header-foreground transition-colors hover:bg-white/25 active:scale-95 [&_svg]:size-5",
  box: "flex h-11 items-center justify-center rounded-full bg-white/15 font-semibold text-header-foreground",
  pill: "flex h-11 shrink-0 items-center justify-center rounded-full bg-white px-4 text-sm font-semibold text-primary shadow-sm transition-colors hover:bg-white/90 dark:text-header",
};
