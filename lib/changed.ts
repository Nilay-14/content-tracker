import "server-only";
import { revalidatePath } from "next/cache";

/**
 * Call after any save. Updates the page you're on and clears the phone's
 * cache of other pages, so every tab shows fresh numbers next time it opens.
 * (Tabs are otherwise kept for 30 seconds: see `staleTimes` in next.config.ts.)
 */
export function changed() {
  revalidatePath("/", "layout");
}
