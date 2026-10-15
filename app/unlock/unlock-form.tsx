"use client";

import { useState, useTransition } from "react";
import { LockKeyhole } from "lucide-react";
import { unlock } from "@/app/actions/lock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function UnlockForm() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="mx-auto max-w-xs space-y-4 pt-4 text-center"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await unlock(pin);
          if (result.ok) {
            // A full load, so every page is fetched again with the new cookie.
            window.location.replace("/");
          } else {
            setError(result.error);
            setPin("");
          }
        });
      }}
    >
      <LockKeyhole className="mx-auto size-10 text-primary" />
      <Input
        aria-label="PIN"
        type="password"
        inputMode="numeric"
        autoComplete="current-password"
        pattern="[0-9]*"
        maxLength={8}
        autoFocus
        placeholder="••••"
        className="h-14 text-center text-2xl tracking-[0.5em]"
        value={pin}
        onChange={(e) => {
          setPin(e.target.value.replace(/\D/g, ""));
          setError("");
        }}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={pending || pin.length < 4}>
        {pending ? "Checking…" : "Unlock"}
      </Button>
      <p className="text-xs text-muted-foreground">This phone or laptop will stay unlocked after this.</p>
    </form>
  );
}
