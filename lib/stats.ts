import { apiRequest } from "@/lib/query-client";

/** Counters the server accepts (INCREMENTABLE_STATS in server/routes.ts). */
export type StatKey =
  | "listing_published_at_signup"
  | "listing_skipped_at_signup"
  | "listing_published_after_skip";

/** Fire and forget: a lost count must never get in the student's way. */
export function bumpStat(key: StatKey) {
  apiRequest("POST", "/api/stats/increment", { key }).catch(error =>
    console.warn(`Couldn't count ${key}:`, error)
  );
}
