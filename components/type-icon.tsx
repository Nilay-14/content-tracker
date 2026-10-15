import { CircleDashed, Clapperboard, GalleryHorizontalEnd, Image, Shapes, type LucideIcon } from "lucide-react";
import type { ContentType } from "@/lib/types";

/** One small icon per content type, used on the calendar. */
export const TYPE_ICON: Record<ContentType, LucideIcon> = {
  reel: Clapperboard,
  static: Image,
  carousel: GalleryHorizontalEnd,
  story: CircleDashed,
  other: Shapes,
};
