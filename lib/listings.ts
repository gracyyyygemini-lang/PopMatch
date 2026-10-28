import type { CrashPost, SubleasePost } from "@/context/AppContext";
import { apiRequest } from "@/lib/query-client";

/**
 * Sublease listings and Crash & Cash posts live in Postgres, reached through
 * the Express API like profiles, likes and messages are (see lib/users.ts).
 * The API returns camelCase shapes; it maps the columns itself. Photos must
 * already be uploaded — the server refuses anything but http(s) URLs.
 */

const isUploaded = (uri: string) => /^https?:\/\//i.test(uri);

/** The poster's name, email and color come from their profile on the server. */
function toListingPayload(post: SubleasePost) {
  const { userName: _name, userEmail: _email, avatarColor: _color, timestamp: _ts, ...stored } = post;
  if (stored.images?.some(uri => !isUploaded(uri)) || (stored.floorPlanUrl && !isUploaded(stored.floorPlanUrl))) {
    throw new Error("Photos must be uploaded before the listing is saved.");
  }
  return stored;
}

/** Everything not yet leased, newest first. */
export async function fetchListings(): Promise<SubleasePost[]> {
  const res = await apiRequest("GET", "/api/listings");
  return (await res.json()) as SubleasePost[];
}

/** Idempotent per post.id, so a retry after a lost response can't post twice. */
export async function createListing(post: SubleasePost): Promise<SubleasePost> {
  const res = await apiRequest("POST", "/api/listings", toListingPayload(post));
  return (await res.json()) as SubleasePost;
}

/** Marks it leased: it stays in the table but leaves everyone's marketplace. */
export async function markListingLeased(id: string): Promise<void> {
  await apiRequest("DELETE", `/api/listings/${encodeURIComponent(id)}`);
}

/** Active posts whose date hasn't passed, newest first. */
export async function fetchCrashPosts(): Promise<CrashPost[]> {
  const res = await apiRequest("GET", "/api/crash-posts");
  return (await res.json()) as CrashPost[];
}

export async function createCrashPost(post: CrashPost): Promise<CrashPost> {
  const { userName: _name, userEmail: _email, avatarColor: _color, timestamp: _ts, status: _status, ...stored } = post;
  if (stored.imageUrl && !isUploaded(stored.imageUrl)) {
    throw new Error("The photo must be uploaded before the post is saved.");
  }
  const res = await apiRequest("POST", "/api/crash-posts", stored);
  return (await res.json()) as CrashPost;
}

/** "Mark as filled": removes it from the feed. */
export async function completeCrashPost(id: string): Promise<void> {
  await apiRequest("DELETE", `/api/crash-posts/${encodeURIComponent(id)}`);
}
