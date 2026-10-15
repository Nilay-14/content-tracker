"use server";

import { refresh } from "next/cache";
import * as posts from "@/lib/db/posts";
import { addDaysISO, todayIST } from "@/lib/ist";
import type { EntryHints } from "@/lib/suggest";
import type { ActionResult, Post, PostInput } from "@/lib/types";
import { attempt, InputError, optionalDate, postInput, uuid } from "@/lib/validate";

export async function savePost(id: string | null, raw: PostInput): Promise<ActionResult<Post>> {
  const result = await attempt(async () => {
    const input = postInput(raw);
    return id ? posts.updatePost(uuid(id, "Entry"), input) : posts.createPost(input);
  });
  refresh();
  return result;
}

export async function deletePost(id: string): Promise<ActionResult<Post>> {
  const result = await attempt(() => posts.deletePost(uuid(id, "Entry")));
  refresh();
  return result;
}

/** Undo a delete: saves the entry again, with the same id and results. */
export async function restorePost(post: Post): Promise<ActionResult<Post>> {
  const result = await attempt(async () => {
    const input = postInput({
      ...post,
      // Results are copied back as they were.
      views: post.views,
      likes: post.likes,
      comments: post.comments,
      shares: post.shares,
      saves: post.saves,
      followers_gained: post.followers_gained,
    });
    if (post.metrics_updated_at) input.metrics_updated_at = post.metrics_updated_at;
    else delete input.metrics_updated_at;
    return posts.restorePost(uuid(post.id, "Entry"), input);
  });
  refresh();
  return result;
}

/** Earlier titles and people for the entry form's suggestions and repeat warning. */
export async function loadEntryHints(brandId: string): Promise<ActionResult<EntryHints>> {
  return attempt(async () => {
    const id = uuid(brandId, "Brand");
    const [history, people] = await Promise.all([
      posts.listBrandHistory(id, addDaysISO(todayIST(), -365)),
      posts.listPeople(),
    ]);
    return { history, people };
  });
}

/** Saves a quick idea for a brand, with no date. */
export async function addIdea(brandId: string, title: string): Promise<ActionResult<Post>> {
  const result = await attempt(() =>
    posts.createPost(
      postInput({
        brand_id: brandId,
        post_date: null,
        title,
        content_type: "reel",
        status: "idea",
        people: [],
      }),
    ),
  );
  refresh();
  return result;
}

/** Gives an idea a date and status planned. */
export async function scheduleIdea(id: string, date: string): Promise<ActionResult<Post>> {
  const result = await attempt(() => {
    const day = optionalDate(date, "Date");
    if (!day) throw new InputError("Pick a date.");
    return posts.scheduleIdea(uuid(id, "Idea"), day);
  });
  refresh();
  return result;
}
