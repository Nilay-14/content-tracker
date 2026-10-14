"use server";

import { refresh } from "next/cache";
import * as festivals from "@/lib/db/festivals";
import type { ActionResult, Festival } from "@/lib/types";
import { attempt, optionalDate, requiredText, uuid } from "@/lib/validate";

export async function saveFestival(
  id: string | null,
  name: string,
  date: string | null,
): Promise<ActionResult<Festival | null>> {
  const result = await attempt(async () => {
    const fields = {
      name: requiredText(name, "Festival name", 100),
      festival_date: optionalDate(date, "Date"),
    };
    if (id) {
      await festivals.updateFestival(uuid(id, "Festival"), fields);
      return null;
    }
    return festivals.createFestival(fields.name, fields.festival_date);
  });
  refresh();
  return result;
}

export async function archiveFestival(id: string, archived: boolean): Promise<ActionResult> {
  const result = await attempt(() => festivals.setFestivalActive(uuid(id, "Festival"), !archived));
  refresh();
  return result;
}

export async function moveFestival(id: string, direction: -1 | 1): Promise<ActionResult> {
  const result = await attempt(() =>
    festivals.moveFestival(uuid(id, "Festival"), direction === -1 ? -1 : 1),
  );
  refresh();
  return result;
}

export async function addStarterFestivals(): Promise<ActionResult> {
  const result = await attempt(() => festivals.insertStarterFestivals());
  refresh();
  return result;
}
