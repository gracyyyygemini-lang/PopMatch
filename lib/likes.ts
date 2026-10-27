import { apiRequest } from "@/lib/query-client";

/**
 * Likes live in the `likes` table, reached through the Express API like
 * profiles are (see lib/users.ts). The API returns camelCase shapes.
 */

export interface MutualMatch {
  email: string;
  /** ms since epoch — when the second of the two likes landed. */
  matchedAt: number;
}

/** Idempotent: liking the same person twice is a no-op on the server. */
export async function saveLike(likerEmail: string, likedEmail: string): Promise<void> {
  await apiRequest("POST", "/api/likes", { likerEmail, likedEmail });
}

/** Everyone `email` liked who liked them back. */
export async function fetchMutualMatches(email: string): Promise<MutualMatch[]> {
  const res = await apiRequest("GET", `/api/likes/mutual/${encodeURIComponent(email)}`);
  return (await res.json()) as MutualMatch[];
}
