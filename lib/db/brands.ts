import "server-only";
import { db, fail } from "@/lib/db/client";
import type { ISODate } from "@/lib/ist";
import type { Brand, BrandMonthTarget } from "@/lib/types";

export type BrandFields = Pick<
  Brand,
  "name" | "instagram_handle" | "color" | "monthly_target" | "preferred_days"
>;

/** Active brands first (in their order), then archived ones. */
export async function listBrands(opts: { activeOnly?: boolean } = {}): Promise<Brand[]> {
  let query = db()
    .from("brands")
    .select("*")
    .order("is_active", { ascending: false })
    .order("sort_order")
    .order("name");
  if (opts.activeOnly) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) fail("Loading brands", error);
  return data;
}

export async function countPostsByBrand(brandIds: string[]): Promise<Record<string, number>> {
  const counts = await Promise.all(
    brandIds.map(async (id) => {
      const { count, error } = await db()
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("brand_id", id);
      if (error) fail("Counting entries", error);
      return [id, count ?? 0] as const;
    }),
  );
  return Object.fromEntries(counts);
}

export async function createBrand(fields: BrandFields): Promise<Brand> {
  const { data: last } = await db()
    .from("brands")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  const sort_order = (last?.[0]?.sort_order ?? -1) + 1;
  const { data, error } = await db()
    .from("brands")
    .insert({ ...fields, sort_order })
    .select()
    .single();
  if (error) fail("Adding brand", error);
  return data;
}

export async function updateBrand(id: string, fields: Partial<BrandFields>) {
  const { error } = await db().from("brands").update(fields).eq("id", id);
  if (error) fail("Saving brand", error);
}

export async function setBrandActive(id: string, is_active: boolean) {
  const { error } = await db().from("brands").update({ is_active }).eq("id", id);
  if (error) fail("Archiving brand", error);
}

export async function deleteBrand(id: string) {
  const counts = await countPostsByBrand([id]);
  if (counts[id] > 0) {
    throw new Error("This brand has entries. Archive it instead.");
  }
  const { error } = await db().from("brands").delete().eq("id", id);
  if (error) fail("Deleting brand", error);
}

/** Moves a brand one place up or down among the brands with the same active state. */
export async function moveBrand(id: string, direction: -1 | 1) {
  const all = await listBrands();
  const brand = all.find((b) => b.id === id);
  if (!brand) return;
  const group = all.filter((b) => b.is_active === brand.is_active);
  const from = group.findIndex((b) => b.id === id);
  const to = from + direction;
  if (to < 0 || to >= group.length) return;
  [group[from], group[to]] = [group[to], group[from]];
  await Promise.all(
    group.map((b, index) =>
      b.sort_order === index
        ? null
        : db().from("brands").update({ sort_order: index }).eq("id", b.id),
    ),
  );
}

export const STARTER_BRANDS: BrandFields[] = [
  {
    name: "Cocoland Toys",
    instagram_handle: "@cocolandtoys",
    color: "#F59E0B",
    monthly_target: 30,
    preferred_days: [0, 1, 2, 3, 4, 5, 6],
  },
  {
    name: "iCraft Asia",
    instagram_handle: "@icraft.asia",
    color: "#8B5CF6",
    monthly_target: 25,
    preferred_days: [],
  },
  {
    name: "Plush Salon",
    instagram_handle: "@plushunisexbeautysalon",
    color: "#EC4899",
    monthly_target: 8,
    preferred_days: [],
  },
];

export async function insertStarterBrands() {
  const existing = await listBrands();
  const names = new Set(existing.map((b) => b.name.toLowerCase()));
  const rows = STARTER_BRANDS.filter((b) => !names.has(b.name.toLowerCase())).map(
    (b, i) => ({ ...b, sort_order: existing.length + i }),
  );
  if (rows.length === 0) return;
  const { error } = await db().from("brands").insert(rows);
  if (error) fail("Adding starter brands", error);
}

// --- Month target overrides -------------------------------------------------

export async function listMonthTargets(opts: { month?: ISODate } = {}): Promise<BrandMonthTarget[]> {
  let query = db().from("brand_month_targets").select("*").order("month", { ascending: false });
  if (opts.month) query = query.eq("month", opts.month);
  const { data, error } = await query;
  if (error) fail("Loading monthly targets", error);
  return data;
}

export async function upsertMonthTarget(brand_id: string, month: ISODate, target: number) {
  const { error } = await db()
    .from("brand_month_targets")
    .upsert({ brand_id, month, target }, { onConflict: "brand_id,month" });
  if (error) fail("Saving monthly target", error);
}

export async function deleteMonthTarget(id: string) {
  const { error } = await db().from("brand_month_targets").delete().eq("id", id);
  if (error) fail("Removing monthly target", error);
}
