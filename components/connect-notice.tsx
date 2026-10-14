import { Database } from "lucide-react";

/** Shown instead of a page when Supabase isn't set up yet. */
export function ConnectNotice() {
  return (
    <div className="rounded-2xl border border-dashed p-6 text-center">
      <Database className="mx-auto mb-3 size-8 text-muted-foreground" />
      <h2 className="font-semibold">Connect your database</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Fill in <code>SUPABASE_URL</code> and <code>SUPABASE_SERVICE_ROLE_KEY</code> in{" "}
        <code>.env.local</code> (or in Vercel&apos;s settings), then restart the app.
      </p>
    </div>
  );
}
