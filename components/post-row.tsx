"use client";

import { ChevronRight } from "lucide-react";
import { BrandDot, StatusBadge } from "@/components/badges";
import { formatShortDate } from "@/lib/ist";
import { CONTENT_TYPE_LABEL, type Brand, type Festival, type Post } from "@/lib/types";

/** One entry in a list. Tap to edit. */
export function PostRow({
  post,
  festival,
  brand,
  showDate = false,
  onClick,
}: {
  post: Post;
  festival?: Festival;
  /** Pass to show the brand name (for lists that mix brands). */
  brand?: Brand;
  showDate?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/60"
    >
      <span className="flex h-11 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-muted text-[11px] leading-tight font-medium text-muted-foreground">
        {showDate && post.post_date ? (
          <>
            <span className="text-sm font-semibold text-foreground">
              {formatShortDate(post.post_date).split("-")[0]}
            </span>
            {formatShortDate(post.post_date).split("-")[1]}
          </>
        ) : (
          CONTENT_TYPE_LABEL[post.content_type]
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{post.title}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <StatusBadge status={post.status} />
          {brand && (
            <span className="inline-flex items-center gap-1">
              <BrandDot color={brand.color} className="size-2" />
              {brand.name}
            </span>
          )}
          {showDate && <span>{CONTENT_TYPE_LABEL[post.content_type]}</span>}
          {festival && <span>🎉 {festival.name}</span>}
          {post.people.length > 0 && <span className="truncate">👤 {post.people.join(", ")}</span>}
          {post.status === "skipped" && post.skip_reason && (
            <span className="truncate italic">{post.skip_reason}</span>
          )}
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </button>
  );
}
