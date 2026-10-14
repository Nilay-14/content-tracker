"use client";

import { useState } from "react";

/**
 * Open/close state for a BottomSheet that shows one item. The item is kept
 * after closing so the sheet doesn't go blank while it slides away.
 */
export function useSheet<T>() {
  const [state, setState] = useState<{ open: boolean; value: T | null; key: number }>({
    open: false,
    value: null,
    key: 0,
  });

  return {
    open: state.open,
    value: state.value,
    /** Changes on every `show`, so forms inside start fresh each time. */
    key: state.key,
    show: (value: T) => setState((s) => ({ open: true, value, key: s.key + 1 })),
    close: () => setState((s) => ({ ...s, open: false })),
    onOpenChange: (open: boolean) => {
      if (!open) setState((s) => ({ ...s, open: false }));
    },
  };
}
