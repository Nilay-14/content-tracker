"use client";

import { useSyncExternalStore } from "react";

const KEY = "content-tracker:last-brand";
const CHANGE_EVENT = "content-tracker:last-brand-change";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function read(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/** The last brand picked on this device (localStorage, so per phone/laptop). */
export function useRememberedBrand(): [string | null, (id: string) => void] {
  const stored = useSyncExternalStore(subscribe, read, () => null);

  function remember(id: string) {
    try {
      window.localStorage.setItem(KEY, id);
    } catch {
      // Private mode or storage blocked: just don't remember.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  return [stored, remember];
}
