import "server-only";
import { db, fail } from "@/lib/db/client";
import type { ISODate } from "@/lib/ist";
import type { Festival } from "@/lib/types";

export async function listFestivals(opts: { activeOnly?: boolean } = {}): Promise<Festival[]> {
  let query = db()
    .from("festivals")
    .select("*")
    .order("is_active", { ascending: false })
    .order("sort_order")
    .order("name");
  if (opts.activeOnly) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) fail("Loading festivals", error);
  return data;
}

export async function createFestival(name: string, festival_date: ISODate | null): Promise<Festival> {
  const { data: last } = await db()
    .from("festivals")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  const sort_order = (last?.[0]?.sort_order ?? -1) + 1;
  const { data, error } = await db()
    .from("festivals")
    .insert({ name, festival_date, sort_order })
    .select()
    .single();
  if (error) fail("Adding festival", error);
  return data;
}

export async function updateFestival(id: string, fields: { name: string; festival_date: ISODate | null }) {
  const { error } = await db().from("festivals").update(fields).eq("id", id);
  if (error) fail("Saving festival", error);
}

export async function setFestivalActive(id: string, is_active: boolean) {
  const { error } = await db().from("festivals").update({ is_active }).eq("id", id);
  if (error) fail("Archiving festival", error);
}

export async function moveFestival(id: string, direction: -1 | 1) {
  const all = await listFestivals();
  const festival = all.find((f) => f.id === id);
  if (!festival) return;
  const group = all.filter((f) => f.is_active === festival.is_active);
  const from = group.findIndex((f) => f.id === id);
  const to = from + direction;
  if (to < 0 || to >= group.length) return;
  [group[from], group[to]] = [group[to], group[from]];
  await Promise.all(
    group.map((f, index) =>
      f.sort_order === index
        ? null
        : db().from("festivals").update({ sort_order: index }).eq("id", f.id),
    ),
  );
}

export const STARTER_FESTIVALS = [
  "Ganesh Chaturthi",
  "Navratri",
  "Dussehra",
  "Karva Chauth",
  "Dhanteras",
  "Diwali",
  "Bhai Dooj",
  "Children's Day",
  "Christmas",
  "New Year",
  "Makar Sankranti",
  "Republic Day",
  "Valentine's Day",
  "Holi",
  "Gudi Padwa",
  "Raksha Bandhan",
  "Independence Day",
  "Janmashtami",
];

export async function insertStarterFestivals() {
  const existing = await listFestivals();
  const names = new Set(existing.map((f) => f.name.toLowerCase()));
  const rows = STARTER_FESTIVALS.filter((n) => !names.has(n.toLowerCase())).map(
    (name, i) => ({ name, sort_order: existing.length + i }),
  );
  if (rows.length === 0) return;
  const { error } = await db().from("festivals").insert(rows);
  if (error) fail("Adding starter festivals", error);
}
