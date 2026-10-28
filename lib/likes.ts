import { apiRequest } from "@/lib/query-client";

/**
 * Likes live in the `likes` table, reached through the Express API like
 * profiles are (see lib/users.ts). The API returns camelCase shapes.
 */

export interface MutualMatch {
  /** The other student's users.id; their email never leaves the server. */
  userId: string;
  /** ms since epoch — when the second of the two likes landed. */
  matchedAt: number;
}

/** Idempotent: liking the same person twice is a no-op on the server. */
export async function saveLike(likedUserId: string): Promise<void> {
  await apiRequest("POST", "/api/likes", { likedUserId });
}

/**
 * Idempotent, like saveLike. Passes live in the `passes` table so a student
 * you passed on stays out of your deck on every device (GET /api/users).
 */
export async function savePass(passedUserId: string): Promise<void> {
  await apiRequest("POST", "/api/passes", { passedUserId });
}

/** Everyone you liked who liked you back. `email` is your own (the route checks). */
export async function fetchMutualMatches(email: string): Promise<MutualMatch[]> {
  const res = await apiRequest("GET", `/api/likes/mutual/${encodeURIComponent(email)}`);
  return (await res.json()) as MutualMatch[];
}
