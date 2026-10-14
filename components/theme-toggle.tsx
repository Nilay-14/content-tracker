"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { applyTheme, readStoredTheme, THEME_STORAGE_KEY, type Theme } from "@/lib/theme";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

const isDark = () => document.documentElement.classList.contains("dark");

/**
 * Sun / moon button that switches between light and dark mode. Until it is
 * tapped, the app follows the phone's own setting. The choice is remembered
 * on this device. The inline script in the root layout applies it before the
 * first paint; this component keeps it applied afterwards.
 */
export function ThemeToggle() {
  // Null on the server and during hydration, so the icon never mismatches.
  const dark = useSyncExternalStore(subscribe, isDark, () => null);

  useLayoutEffect(() => {
    // React's dev remount can clear the class the inline script set.
    applyTheme(readStoredTheme());
    // Follow the phone's setting live, unless a choice was made here.
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (!readStoredTheme()) applyTheme(null);
    };
    media.addEventListener("change", onSystemChange);
    return () => media.removeEventListener("change", onSystemChange);
  }, []);

  function toggle() {
    const next: Theme = isDark() ? "light" : "dark";
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private mode or blocked storage: still switch for this visit.
    }
    applyTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      className="-mr-1.5 flex size-11 items-center justify-center rounded-full text-header-foreground/85 transition-colors hover:bg-white/15 hover:text-header-foreground active:scale-95"
    >
      {dark === null ? (
        <span className="size-5" />
      ) : dark ? (
        <Sun className="size-5" />
      ) : (
        <Moon className="size-5" />
      )}
    </button>
  );
}
