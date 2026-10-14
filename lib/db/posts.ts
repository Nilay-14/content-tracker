import "server-only";
import { db, fail } from "@/lib/db/client";
import type { ISODate } from "@/lib/ist";
import type { Post, PostInput } from "@/lib/types";

/** All entries dated `date`, for every brand, oldest first. */
export async function listPostsOnDate(date: ISODate): Promise<Post[]> {
  const { data, error } = await db()
    .from("posts")
    .select("*")
    .eq("post_date", date)
    .order("created_at");
  if (error) fail("Loading entries", error);
  return data;
}

/** Entries dated between `from` and `to` (inclusive), optionally for one brand. */
export async function listPostsBetween(
  from: ISODate,
  to: ISODate,
  opts: { brandId?: string } = {},
): Promise<Post[]> {
  let query = db()
    .from("posts")
    .select("*")
    .gte("post_date", from)
    .lte("post_date", to)
    .order("post_date")
    .order("created_at")
    .limit(5000);
  if (opts.brandId) query = query.eq("brand_id", opts.brandId);
  const { data, error } = await query;
  if (error) fail("Loading entries", error);
  return data;
}

/** Entries that replace a missed day between `from` and `to`, wherever they are dated. */
export async function listReschedulesFor(
  from: ISODate,
  to: ISODate,
  opts: { brandId?: string } = {},
): Promise<Post[]> {
  let query = db()
    .from("posts")
    .select("*")
    .gte("rescheduled_from", from)
    .lte("rescheduled_from", to);
  if (opts.brandId) query = query.eq("brand_id", opts.brandId);
  const { data, error } = await query;
  if (error) fail("Loading rescheduled entries", error);
  return data;
}

/** Entries tagged with any of these festivals and dated in the window. */
export async function listFestivalPosts(
  festivalIds: string[],
  from: ISODate,
  to: ISODate,
): Promise<Post[]> {
  if (festivalIds.length === 0) return [];
  const { data, error } = await db()
    .from("posts")
    .select("*")
    .in("festival_id", festivalIds)
    .gte("post_date", from)
    .lte("post_date", to);
  if (error) fail("Loading festival entries", error);
  return data;
}

export async function createPost(input: PostInput): Promise<Post> {
  const { data, error } = await db().from("posts").insert(input).select().single();
  if (error) fail("Saving entry", error);
  return data;
}

export async function updatePost(id: string, input: PostInput): Promise<Post> {
  const { data, error } = await db().from("posts").update(input).eq("id", id).select().single();
  if (error) fail("Saving entry", error);
  return data;
}

export async function deletePost(id: string) {
  const { error } = await db().from("posts").delete().eq("id", id);
  if (error) fail("Deleting entry", error);
}
