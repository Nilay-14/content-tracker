"use client";

import { useState } from "react";
import { PostForm } from "@/components/post-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addDaysISO, formatDisplayDate, type ISODate } from "@/lib/ist";
import type { Brand, Festival } from "@/lib/types";

/** A new `planned` entry on a new date that stands in for a missed day. */
export function RescheduleForm({
  brand,
  missedDate,
  brands,
  festivals,
  today,
  onSaved,
}: {
  brand: Brand;
  missedDate: ISODate;
  brands: Brand[];
  festivals: Festival[];
  today: ISODate;
  onSaved: () => void;
}) {
  const [date, setDate] = useState<ISODate>(today);

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Plan a <span className="font-medium text-foreground">{brand.name}</span> post to make up for{" "}
        <span className="font-medium text-foreground">{formatDisplayDate(missedDate)}</span>. That day will then show
        as rescheduled instead of missed.
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="reschedule-date">New date</Label>
        <Input
          id="reschedule-date"
          type="date"
          value={date}
          min={addDaysISO(missedDate, 1)}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <PostForm
        post={null}
        defaults={{ brand_id: brand.id, post_date: date || null, status: "planned", rescheduled_from: missedDate }}
        brands={brands}
        festivals={festivals}
        today={today}
        onSaved={onSaved}
      />
    </div>
  );
}
