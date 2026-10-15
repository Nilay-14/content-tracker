"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "success" | "error";
type ToastAction = { label: string; onClick: () => void };
type Toast = { id: number; message: string; tone: Tone; action?: ToastAction };

const EVENT = "app:toast";
let nextId = 1;

/**
 * Shows a small message above the tab bar. Callable from any client component.
 * With an action (e.g. Undo) it stays for 10 seconds.
 */
export function toast(message: string, tone: Tone = "success", action?: ToastAction) {
  window.dispatchEvent(
    new CustomEvent<Toast>(EVENT, { detail: { id: nextId++, message, tone, action } }),
  );
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    function onToast(e: Event) {
      const t = (e as CustomEvent<Toast>).detail;
      setToasts((list) => [...list.slice(-2), t]);
      window.setTimeout(
        () => setToasts((list) => list.filter((x) => x.id !== t.id)),
        t.action ? 10000 : t.tone === "error" ? 5000 : 2500,
      );
    }
    window.addEventListener(EVENT, onToast);
    return () => window.removeEventListener(EVENT, onToast);
  }, []);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "flex max-w-sm animate-in items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium shadow-lg fade-in-0 slide-in-from-bottom-2",
            t.tone === "success"
              ? "bg-foreground text-background"
              : "bg-destructive text-white",
          )}
        >
          {t.tone === "success" ? (
            <CheckCircle2 className="size-4 shrink-0" />
          ) : (
            <AlertCircle className="size-4 shrink-0" />
          )}
          {t.message}
          {t.action && (
            <button
              type="button"
              className="pointer-events-auto -my-1.5 -mr-2 ml-1 min-h-9 rounded-full bg-background/20 px-3 font-semibold underline-offset-2 hover:underline"
              onClick={() => {
                t.action!.onClick();
                setToasts((list) => list.filter((x) => x.id !== t.id));
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
