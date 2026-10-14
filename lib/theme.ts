/** App-wide colours used outside CSS (manifest, icons, browser bar). */
export const THEME_COLOR = "#4F46E5";
export const THEME_COLOR_DARK = "#232363";
export const BACKGROUND_COLOR = "#FFFFFF";
export const APP_NAME = "Content Tracker";
export const APP_SHORT_NAME = "Tracker";

// --- Light / dark mode --------------------------------------------------------

export type Theme = "light" | "dark";

/** localStorage key for the light/dark choice made with the toggle. */
export const THEME_STORAGE_KEY = "theme";

/** The saved choice, or null to follow the phone's setting. */
export function readStoredTheme(): Theme | null {
  try {
    const t = localStorage.getItem(THEME_STORAGE_KEY);
    return t === "light" || t === "dark" ? t : null;
  } catch {
    return null;
  }
}

/** Puts the `dark` class on <html> and matches the browser bar colour. */
export function applyTheme(theme: Theme | null) {
  const dark = theme
    ? theme === "dark"
    : window.matchMedia("(prefers-color-scheme: dark)").matches;
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((m) => m.setAttribute("content", dark ? THEME_COLOR_DARK : THEME_COLOR));
}

/**
 * Runs in <head> before the first paint, so a saved dark choice never flashes
 * light. Kept tiny and self-contained: it can't import anything.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;if(d)r.classList.add("dark");r.style.colorScheme=d?"dark":"light"}catch(e){}})()`;
