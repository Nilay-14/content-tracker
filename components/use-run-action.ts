"use client";

import { useTransition } from "react";
import { toast } from "@/components/toaster";
import type { ActionResult } from "@/lib/types";

/**
 * Runs a Server Action in a transition, shows a toast for the result and
 * calls `onSuccess` with the returned data.
 */
export function useRunAction() {
  const [pending, startTransition] = useTransition();

  function run<T>(
    action: () => Promise<ActionResult<T>>,
    opts: { success?: string; onSuccess?: (data: T) => void } = {},
  ) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        if (opts.success) toast(opts.success);
        opts.onSuccess?.(result.data);
      } else {
        toast(result.error, "error");
      }
    });
  }

  return { pending, run };
}
