"use client";

import { useEffect, useState } from "react";
import { loadEntryHints } from "@/app/actions/posts";
import type { EntryHints } from "@/lib/suggest";

// One request per brand per page visit, shared by every form on the page.
const cache = new Map<string, Promise<EntryHints | null>>();

function fetchHints(brandId: string) {
  let pending = cache.get(brandId);
  if (!pending) {
    pending = loadEntryHints(brandId)
      .then((r) => (r.ok ? r.data : null))
      .catch(() => null);
    cache.set(brandId, pending);
  }
  return pending;
}

/**
 * Earlier titles and people for a brand, for the entry form. Null while
 * loading (or if loading failed: the form works fine without hints).
 * Call `refresh` after saving so the new entry counts too.
 */
export function useEntryHints(brandId: string) {
  const [state, setState] = useState<{ brandId: string; hints: EntryHints | null }>({
    brandId: "",
    hints: null,
  });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!brandId) return;
    let live = true;
    fetchHints(brandId).then((hints) => {
      if (live) setState({ brandId, hints });
    });
    return () => {
      live = false;
    };
  }, [brandId, version]);

  return {
    hints: state.brandId === brandId ? state.hints : null,
    refresh: () => {
      cache.delete(brandId);
      setVersion((v) => v + 1);
    },
  };
}
