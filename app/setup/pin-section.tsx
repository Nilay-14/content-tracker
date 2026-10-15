"use client";

import { useState, useTransition } from "react";
import { Lock, LockOpen } from "lucide-react";
import { lockDevice, removePin, setPin } from "@/app/actions/lock";
import { toast } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/types";

function PinInput({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="password"
        inputMode="numeric"
        autoComplete="new-password"
        pattern="[0-9]*"
        maxLength={8}
        placeholder="4 to 8 digits"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
      />
    </div>
  );
}

/** Setup: turn the PIN lock on, change it, lock this device, or turn it off. */
export function PinSection({ hasPin }: { hasPin: boolean }) {
  const [mode, setMode] = useState<"idle" | "change" | "off">("idle");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [pending, startTransition] = useTransition();

  function reset() {
    setMode("idle");
    setCurrent("");
    setNext("");
    setAgain("");
  }

  function go(action: () => Promise<ActionResult>, done: string, after?: () => void) {
    startTransition(async () => {
      const r = await action();
      if (r.ok) {
        toast(done);
        reset();
        after?.();
      } else {
        toast(r.error, "error");
      }
    });
  }

  const newPinForm = (withCurrent: boolean) => (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (next !== again) {
          toast("The two new PINs don't match", "error");
          return;
        }
        go(() => setPin(next, withCurrent ? current : null), withCurrent ? "PIN changed" : "PIN lock is on");
      }}
    >
      {withCurrent && <PinInput id="pin-current" label="Current PIN" value={current} onChange={setCurrent} />}
      <div className="grid grid-cols-2 gap-3">
        <PinInput id="pin-new" label="New PIN" value={next} onChange={setNext} />
        <PinInput id="pin-again" label="New PIN again" value={again} onChange={setAgain} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={pending || next.length < 4 || again.length < 4}>
          {withCurrent ? "Change PIN" : "Turn on PIN lock"}
        </Button>
        {withCurrent && (
          <Button type="button" variant="ghost" onClick={reset}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">PIN lock</h2>
      <div className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm">
        <p className="flex items-start gap-2 text-sm">
          {hasPin ? (
            <Lock className="mt-0.5 size-4 shrink-0 text-emerald-600" />
          ) : (
            <LockOpen className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          )}
          <span>
            {hasPin ? (
              <>
                <span className="font-semibold">PIN lock is on.</span> Each phone or laptop asks for the PIN once, then
                remembers it. Share links still work without it.
              </>
            ) : (
              <>
                <span className="font-semibold">PIN lock is off.</span> Anyone with the app&apos;s link can open it. Set a
                PIN so only you can.
              </>
            )}
          </span>
        </p>

        {!hasPin && newPinForm(false)}

        {hasPin && mode === "change" && newPinForm(true)}

        {hasPin && mode === "off" && (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              go(() => removePin(current), "PIN lock is off");
            }}
          >
            <PinInput id="pin-off" label="Current PIN" value={current} onChange={setCurrent} />
            <div className="flex gap-2">
              <Button type="submit" variant="destructive" className="flex-1" disabled={pending || current.length < 4}>
                Turn off PIN lock
              </Button>
              <Button type="button" variant="ghost" onClick={reset}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {hasPin && mode === "idle" && (
          <div className="grid gap-2 sm:grid-cols-3">
            <Button variant="outline" onClick={() => setMode("change")}>
              Change PIN
            </Button>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => go(lockDevice, "Locked", () => window.location.replace("/unlock"))}
            >
              <Lock /> Lock this device
            </Button>
            <Button variant="ghost" onClick={() => setMode("off")}>
              Turn off
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
