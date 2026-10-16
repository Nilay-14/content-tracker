"use client";

import { useTransition } from "react";
import { toast } from "@/components/toaster";
import type { ActionResult } from "@/lib/types";

/**
 * Runs a Server Action in a transition, shows a toast for the result and
 * calls `onSuccess` with the returned data. With `undo`, the toast gets an
 * Undo button (for 10 seconds) that runs it.
 */
export function useRunAction() {
  const [pending, startTransition] = useTransition();

  function run<T>(
    action: () => Promise<ActionResult<T>>,
    opts: {
      success?: string;
      onSuccess?: (data: T) => void;
      undo?: (data: T) => Promise<ActionResult<unknown>>;
    } = {},
  ) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        const undo = opts.undo;
        if (undo) {
          toast(opts.success ?? "Done", "success", {
            label: "Undo",
            onClick: () => {
              undo(result.data).then((r) => (r.ok ? toast("Undone") : toast(r.error, "error")));
            },
          });
        } else if (opts.success) {
          toast(opts.success);
        }
        opts.onSuccess?.(result.data);
      } else {
        toast(result.error, "error");
      }
    });
  }

  return { pending, run };
}
