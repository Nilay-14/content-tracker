"use server";

import { refresh } from "next/cache";
import * as posts from "@/lib/db/posts";
import type { ActionResult, Post, PostInput } from "@/lib/types";
import { attempt, postInput, uuid } from "@/lib/validate";

export async function savePost(id: string | null, raw: PostInput): Promise<ActionResult<Post>> {
  const result = await attempt(async () => {
    const input = postInput(raw);
    return id ? posts.updatePost(uuid(id, "Entry"), input) : posts.createPost(input);
  });
  refresh();
  return result;
}

export async function deletePost(id: string): Promise<ActionResult> {
  const result = await attempt(() => posts.deletePost(uuid(id, "Entry")));
  refresh();
  return result;
}
