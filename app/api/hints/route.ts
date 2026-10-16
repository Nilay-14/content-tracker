import { connection, type NextRequest } from "next/server";
import { listBrandHistory, listPeople } from "@/lib/db/posts";
import { addDaysISO, todayIST } from "@/lib/ist";
import { isUnlocked } from "@/lib/lock";
import type { EntryHints } from "@/lib/suggest";

/**
 * Earlier titles and people for the entry form's suggestions and repeat
 * warning. A plain GET (not a Server Action) so it never makes a save wait:
 * Next.js runs Server Actions one at a time.
 */
export async function GET(request: NextRequest) {
  await connection();
  if (!(await isUnlocked())) return Response.json({ error: "Locked" }, { status: 401 });
  const brandId = request.nextUrl.searchParams.get("brand") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(brandId)) return Response.json({ error: "Brand missing" }, { status: 400 });

  const [history, people] = await Promise.all([
    listBrandHistory(brandId, addDaysISO(todayIST(), -365)),
    listPeople(),
  ]);
  const hints: EntryHints = { history, people };
  return Response.json(hints, { headers: { "Cache-Control": "private, no-store" } });
}
