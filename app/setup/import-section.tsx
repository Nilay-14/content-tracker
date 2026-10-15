"use client";

import { useRef, useState } from "react";
import { FileUp, X } from "lucide-react";
import { importPosts, type ImportResult } from "@/app/actions/import";
import { StatusBadge } from "@/components/badges";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { NativeSelect } from "@/components/native-select";
import { toast } from "@/components/toaster";
import { useRunAction } from "@/components/use-run-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { readSheet, MAX_IMPORT_ROWS, type ImportRow, type SkippedRow } from "@/lib/import";
import { formatDisplayDate } from "@/lib/ist";
import { CONTENT_TYPE_LABEL, CONTENT_TYPES, type Brand, type ContentType, type Festival } from "@/lib/types";

/** The brand whose first word appears in the sheet's heading or the file name. */
function guessBrand(brands: Brand[], text: string): string {
  const t = text.toLowerCase().replace(/[^a-z0-9]+/g, " ");
  const hit = brands.find((b) => {
    const first = b.name.toLowerCase().split(/[^a-z0-9]+/)[0];
    return first.length >= 3 && t.includes(first);
  });
  return hit?.id ?? "";
}

/**
 * Import one brand tab of the old Google Sheet, downloaded as CSV. Shows a
 * preview (type, festival and title can be changed) and saves nothing until
 * the import is confirmed.
 */
export function ImportSection({ brands, festivals }: { brands: Brand[]; festivals: Festival[] }) {
  const [brandId, setBrandId] = useState("");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [skipped, setSkipped] = useState<SkippedRow[]>([]);
  const [result, setResult] = useState<(ImportResult & { skipped: SkippedRow[] }) | null>(null);
  const [confirm, setConfirm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { pending, run } = useRunAction();
  const brand = brands.find((b) => b.id === brandId);
  const activeFestivals = festivals.filter((f) => f.is_active);

  function reset() {
    setRows(null);
    setSkipped([]);
    setFileName("");
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setResult(null);
    const sheet = readSheet(await file.text(), festivals);
    if (sheet.error) {
      toast(sheet.error, "error");
      reset();
      return;
    }
    setFileName(file.name);
    setRows(sheet.rows);
    setSkipped(sheet.skipped);
    if (!brandId) setBrandId(guessBrand(brands, `${sheet.heading} ${file.name}`));
  }

  function update(line: number, patch: Partial<ImportRow>) {
    setRows((rs) => rs && rs.map((r) => (r.line === line ? { ...r, ...patch } : r)));
  }

  function doImport() {
    if (!rows || !brand) return;
    run(() => importPosts(brand.id, rows), {
      onSuccess: (res) => {
        toast(`Imported ${res.imported} entries`);
        setResult({ ...res, skipped });
        setRows(null);
        setSkipped([]);
        if (fileRef.current) fileRef.current.value = "";
      },
    });
  }

  const counts = rows && {
    posted: rows.filter((r) => r.status === "posted").length,
    skipped: rows.filter((r) => r.status === "skipped").length,
    planned: rows.filter((r) => r.status === "planned").length,
  };

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Import from Google Sheet</h2>
      <div className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm">
        <p className="text-sm text-muted-foreground">
          In Google Sheets, open one <span className="font-medium text-foreground">brand tab</span> and use File →
          Download → CSV. Don&apos;t use the master tab. Nothing is saved until you check the preview and confirm.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="import-brand">Brand</Label>
            <NativeSelect id="import-brand" value={brandId} onChange={(e) => setBrandId(e.target.value)}>
              <option value="">Pick a brand</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="import-file">CSV file</Label>
            <Input
              id="import-file"
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="pt-2.5"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </div>
        </div>

        {result && (
          <div className="space-y-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200">
            <p className="font-semibold">
              Imported {result.imported} {result.imported === 1 ? "entry" : "entries"}.
              {result.duplicates.length + result.skipped.length > 0 &&
                ` Skipped ${result.duplicates.length + result.skipped.length}:`}
            </p>
            {result.duplicates.length + result.skipped.length > 0 && (
              <ul className="list-disc space-y-0.5 pl-5">
                {result.duplicates.map((d) => (
                  <li key={`d${d.line}`}>
                    Row {d.line}: already in the app ({formatDisplayDate(d.post_date)}, {d.title})
                  </li>
                ))}
                {result.skipped.map((s) => (
                  <li key={`s${s.line}`}>
                    Row {s.line}: {s.reason}
                  </li>
                ))}
              </ul>
            )}
            <Button variant="outline" onClick={reset}>
              Import another tab
            </Button>
          </div>
        )}

        {rows && counts && (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm">
                <span className="font-semibold">{fileName}</span>
                <span className="block text-muted-foreground">
                  {rows.length} entries: {counts.posted} posted, {counts.skipped} not posted, {counts.planned} planned
                  {skipped.length > 0 && ` · ${skipped.length} ${skipped.length === 1 ? "row" : "rows"} skipped`}
                </span>
              </p>
              <Button variant="ghost" size="icon" aria-label="Clear" onClick={reset}>
                <X />
              </Button>
            </div>

            {rows.length > MAX_IMPORT_ROWS && (
              <p className="text-sm text-destructive">This file has more than {MAX_IMPORT_ROWS} entries. Split it up.</p>
            )}

            <ul className="max-h-[60dvh] divide-y overflow-y-auto rounded-xl border">
              {rows.map((r) => (
                <li key={r.line} className="space-y-2 p-3">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium tabular-nums">{formatDisplayDate(r.post_date)}</span>
                    <span className="flex items-center gap-1">
                      <StatusBadge status={r.status} />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Leave out row ${r.line}`}
                        onClick={() => setRows((rs) => rs && rs.filter((x) => x.line !== r.line))}
                      >
                        <X />
                      </Button>
                    </span>
                  </div>
                  <Input
                    aria-label={`Title, row ${r.line}`}
                    value={r.title}
                    onChange={(e) => update(r.line, { title: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <NativeSelect
                      aria-label={`Type, row ${r.line}`}
                      className="flex-1"
                      value={r.content_type}
                      onChange={(e) => {
                        const content_type = e.target.value as ContentType;
                        update(r.line, { content_type, slide_count: content_type === "carousel" ? r.slide_count : null });
                      }}
                    >
                      {CONTENT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {CONTENT_TYPE_LABEL[t]}
                        </option>
                      ))}
                    </NativeSelect>
                    {r.content_type === "carousel" && (
                      <Input
                        aria-label={`Pages, row ${r.line}`}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={20}
                        placeholder="Pages"
                        className="w-24"
                        value={r.slide_count ?? ""}
                        onChange={(e) => update(r.line, { slide_count: e.target.value ? Number(e.target.value) : null })}
                      />
                    )}
                    <NativeSelect
                      aria-label={`Festival, row ${r.line}`}
                      className="flex-1"
                      value={r.festival_id ?? ""}
                      onChange={(e) => update(r.line, { festival_id: e.target.value || null })}
                    >
                      <option value="">No festival</option>
                      {activeFestivals.map((f) => (
                        <option key={f.id} value={f.id}>
                          🎉 {f.name}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  {r.notes && <p className="text-xs text-muted-foreground">Notes: {r.notes}</p>}
                </li>
              ))}
            </ul>

            {skipped.length > 0 && (
              <details className="rounded-xl border px-3 py-2 text-sm">
                <summary className="min-h-8 cursor-pointer font-medium">
                  {skipped.length} {skipped.length === 1 ? "row" : "rows"} will be skipped
                </summary>
                <ul className="mt-1 space-y-0.5 text-muted-foreground">
                  {skipped.map((s) => (
                    <li key={s.line}>
                      Row {s.line}: {s.reason}
                      {s.reason !== "Empty row" && <span className="block truncate text-xs">{s.text}</span>}
                    </li>
                  ))}
                </ul>
              </details>
            )}

            <Button
              size="lg"
              className="w-full"
              disabled={pending || !brand || rows.length === 0 || rows.length > MAX_IMPORT_ROWS}
              onClick={() => setConfirm(true)}
            >
              <FileUp />
              {brand ? `Import ${rows.length} entries into ${brand.name}` : "Pick a brand first"}
            </Button>
            <ConfirmDialog
              open={confirm}
              onOpenChange={setConfirm}
              title={`Import ${rows.length} entries?`}
              description={`They'll be added to ${brand?.name ?? "this brand"}. Entries already in the app (same date and title) are skipped.`}
              confirmLabel="Import"
              onConfirm={doImport}
            />
          </div>
        )}
      </div>
    </section>
  );
}
