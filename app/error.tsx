"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
      <AlertTriangle className="mx-auto mb-3 size-8 text-destructive" />
      <h2 className="font-semibold">Something went wrong</h2>
      <p className="mt-1 text-sm break-words text-muted-foreground">
        {process.env.NODE_ENV === "development" ? error.message : "Please try again in a moment."}
      </p>
      <Button className="mt-4" onClick={() => retry()}>
        Try again
      </Button>
    </div>
  );
}
