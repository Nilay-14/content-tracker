"use server";

import { randomBytes } from "node:crypto";
import { refresh } from "next/cache";
import * as brands from "@/lib/db/brands";
import { monthStartISO } from "@/lib/ist";
import type { ActionResult } from "@/lib/types";
import {
  attempt,
  hexColor,
  optionalDate,
  requiredText,
  text,
  uuid,
  weekdays,
  wholeNumber,
} from "@/lib/validate";

export type BrandForm = {
  name: string;
  instagram_handle: string;
  color: string;
  monthly_target: number;
  preferred_days: number[];
};

function brandFields(form: BrandForm): brands.BrandFields {
  let handle = text(form.instagram_handle, "Instagram handle", { max: 100 });
  if (handle && !handle.startsWith("@")) handle = `@${handle}`;
  return {
    name: requiredText(form.name, "Name", 100),
    instagram_handle: handle,
    color: hexColor(form.color),
    monthly_target: wholeNumber(form.monthly_target, "Monthly target", 1000),
    preferred_days: weekdays(form.preferred_days),
  };
}

export async function saveBrand(id: string | null, form: BrandForm): Promise<ActionResult> {
  const result = await attempt(async () => {
    const fields = brandFields(form);
    if (id) await brands.updateBrand(uuid(id, "Brand"), fields);
    else await brands.createBrand(fields);
  });
  refresh();
  return result;
}

export async function archiveBrand(id: string, archived: boolean): Promise<ActionResult> {
  const result = await attempt(() => brands.setBrandActive(uuid(id, "Brand"), !archived));
  refresh();
  return result;
}

export async function deleteBrand(id: string): Promise<ActionResult> {
  const result = await attempt(() => brands.deleteBrand(uuid(id, "Brand")));
  refresh();
  return result;
}

export async function moveBrand(id: string, direction: -1 | 1): Promise<ActionResult> {
  const result = await attempt(() =>
    brands.moveBrand(uuid(id, "Brand"), direction === -1 ? -1 : 1),
  );
  refresh();
  return result;
}

export async function addStarterBrands(): Promise<ActionResult> {
  const result = await attempt(() => brands.insertStarterBrands());
  refresh();
  return result;
}

export async function setMonthTarget(
  brandId: string,
  month: string,
  target: number,
): Promise<ActionResult> {
  const result = await attempt(async () => {
    const date = optionalDate(month, "Month");
    if (!date) throw new Error("Pick a month.");
    await brands.upsertMonthTarget(
      uuid(brandId, "Brand"),
      monthStartISO(date),
      wholeNumber(target, "Target", 1000),
    );
  });
  refresh();
  return result;
}

export async function removeMonthTarget(id: string): Promise<ActionResult> {
  const result = await attempt(() => brands.deleteMonthTarget(uuid(id, "Target")));
  refresh();
  return result;
}

/** Makes a new read-only share link for a brand (any old link stops working). */
export async function createShareLink(brandId: string): Promise<ActionResult<string>> {
  const result = await attempt(async () => {
    const token = randomBytes(16).toString("base64url");
    await brands.setShareToken(uuid(brandId, "Brand"), token);
    return token;
  });
  refresh();
  return result;
}

/** Turns a brand's share link off. */
export async function removeShareLink(brandId: string): Promise<ActionResult> {
  const result = await attempt(() => brands.setShareToken(uuid(brandId, "Brand"), null));
  refresh();
  return result;
}
