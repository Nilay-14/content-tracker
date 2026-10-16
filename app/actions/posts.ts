"use server";

import { changed } from "@/lib/changed";
import * as posts from "@/lib/db/posts";
import { todayIST } from "@/lib/ist";
import type { ActionResult, Post, PostInput, PostStatus } from "@/lib/types";
import { attempt, InputError, optionalDate, postInput, uuid } from "@/lib/validate";

export async function savePost(id: string | null, raw: PostInput): Promise<ActionResult<Post>> {
  const result = await attempt(async () => {
    const input = postInput(raw);
    return id ? posts.updatePost(uuid(id, "Entry"), input) : posts.createPost(input);
  });
  changed();
  return result;
}

export async function deletePost(id: string): Promise<ActionResult<Post>> {
  const result = await attempt(() => posts.deletePost(uuid(id, "Entry")));
  changed();
  return result;
}

/** Every field of an earlier copy of an entry, checked, with its results as they were. */
function asItWas(post: Post): PostInput {
  const input = postInput({
    ...post,
    views: post.views,
    likes: post.likes,
    comments: post.comments,
    shares: post.shares,
    saves: post.saves,
    followers_gained: post.followers_gained,
  });
  if (post.metrics_updated_at) input.metrics_updated_at = post.metrics_updated_at;
  else delete input.metrics_updated_at;
  return input;
}

/** Undo a delete: saves the entry again, with the same id and results. */
export async function restorePost(post: Post): Promise<ActionResult<Post>> {
  const result = await attempt(() => posts.restorePost(uuid(post.id, "Entry"), asItWas(post)));
  changed();
  return result;
}

/** Undo an edit, a stage move or scheduling an idea: puts the entry back as it was. */
export async function revertPost(post: Post): Promise<ActionResult<Post>> {
  const result = await attempt(() => posts.updatePost(uuid(post.id, "Entry"), asItWas(post)));
  changed();
  return result;
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
  changed();
  return result;
}

/** Gives an idea a date and status planned. */
export async function scheduleIdea(id: string, date: string): Promise<ActionResult<Post>> {
  const result = await attempt(() => {
    const day = optionalDate(date, "Date");
    if (!day) throw new InputError("Pick a date.");
    return posts.scheduleIdea(uuid(id, "Idea"), day);
  });
  changed();
  return result;
}

const NEXT_STAGE: Partial<Record<string, string>> = {
  planned: "shot",
  shot: "edited",
  edited: "scheduled",
  scheduled: "posted",
};

/** Shoot list: moves an entry one stage on. Marking it posted dates it today (IST). */
export async function advancePost(id: string, to: string): Promise<ActionResult<Post>> {
  const result = await attempt(async () => {
    if (!Object.values(NEXT_STAGE).includes(to)) throw new InputError("That stage isn't allowed.");
    const status = to as PostStatus;
    return posts.setPostStage(uuid(id, "Entry"), status, status === "posted" ? todayIST() : undefined);
  });
  changed();
  return result;
}
