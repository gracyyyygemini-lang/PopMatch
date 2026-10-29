import type { MutualFriend } from "@/context/AppContext";
import { apiRequest } from "@/lib/query-client";

/**
 * Blocks live in the `blocks` table. A block hides both people from each
 * other everywhere on the server (deck, listings, Crash & Cash, matches,
 * friends, conversations) and stops messages either way. The blocked student
 * isn't told.
 */

export async function blockUser(userId: string): Promise<void> {
  await apiRequest("POST", "/api/blocks", { userId });
}

/** Removes your own block only; a block the other person made stays. */
export async function unblockUser(userId: string): Promise<void> {
  await apiRequest("DELETE", "/api/blocks", { userId });
}

/** Students you've blocked, newest first. */
export async function fetchBlocked(): Promise<MutualFriend[]> {
  const res = await apiRequest("GET", "/api/blocks");
  return (await res.json()) as MutualFriend[];
}
