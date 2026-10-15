import type { ISODate } from "@/lib/ist";

/** Shared row types and labels. Safe to import from client components. */

export const CONTENT_TYPES = ["reel", "static", "carousel", "story", "other"] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const CONTENT_TYPE_LABEL: Record<ContentType, string> = {
  reel: "Reel",
  static: "Static",
  carousel: "Carousel",
  story: "Story",
  other: "Other",
};

/** Plural column headings used on Master and in reports. */
export const CONTENT_TYPE_PLURAL: Record<ContentType, string> = {
  reel: "Reels",
  static: "Statics",
  carousel: "Carousels",
  story: "Stories",
  other: "Other",
};

export const POST_STATUSES = [
  "idea",
  "planned",
  "shot",
  "edited",
  "scheduled",
  "posted",
  "skipped",
] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export const POST_STATUS_LABEL: Record<PostStatus, string> = {
  idea: "Idea",
  planned: "Planned",
  shot: "Shot",
  edited: "Edited",
  scheduled: "Scheduled",
  posted: "Posted",
  skipped: "Skipped",
};

/** Statuses that mean "work is under way but not posted yet". */
export const IN_PROGRESS_STATUSES: readonly PostStatus[] = [
  "planned",
  "shot",
  "edited",
  "scheduled",
];

/** Performance results that can be added to an entry once it's posted. */
export const METRICS = ["views", "likes", "comments", "shares", "saves", "followers_gained"] as const;
export type Metric = (typeof METRICS)[number];

export const METRIC_LABEL: Record<Metric, string> = {
  views: "Views",
  likes: "Likes",
  comments: "Comments",
  shares: "Shares",
  saves: "Saves",
  followers_gained: "Followers gained",
};

export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export type Brand = {
  id: string;
  name: string;
  instagram_handle: string | null;
  color: string;
  monthly_target: number;
  preferred_days: number[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

export type BrandMonthTarget = {
  id: string;
  brand_id: string;
  month: ISODate;
  target: number;
};

export type Festival = {
  id: string;
  name: string;
  festival_date: ISODate | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

export type Post = {
  id: string;
  brand_id: string;
  post_date: ISODate | null;
  title: string;
  content_type: ContentType;
  /** Pages (images) in a carousel; null for other types or when not filled in. */
  slide_count: number | null;
  platform: string;
  status: PostStatus;
  skip_reason: string | null;
  rescheduled_from: ISODate | null;
  festival_id: string | null;
  post_url: string | null;
  people: string[];
  notes: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  followers_gained: number | null;
  metrics_updated_at: string | null;
  created_at: string;
  updated_at: string;
};

/** The fields the entry form edits. Results are sent only when they were changed. */
export type PostInput = Partial<Record<Metric, number | null>> & {
  brand_id: string;
  post_date: ISODate | null;
  title: string;
  content_type: ContentType;
  slide_count: number | null;
  status: PostStatus;
  skip_reason: string | null;
  festival_id: string | null;
  post_url: string | null;
  people: string[];
  notes: string | null;
  rescheduled_from?: ISODate | null;
  /** Set by the server whenever results are saved. */
  metrics_updated_at?: string;
};

/** What every Server Action returns, so forms can show a toast. */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };
