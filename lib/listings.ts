import type { CrashPost, SubleasePost } from "@/context/AppContext";
import { apiRequest } from "@/lib/query-client";

/**
 * Sublease listings and Crash & Cash posts live in Postgres, reached through
 * the Express API like profiles, likes and messages are (see lib/users.ts).
 * The API returns camelCase shapes; it maps the columns itself. Photos must
 * already be uploaded — the server refuses anything but http(s) URLs.
 */

const isUploaded = (uri: string) => /^https?:\/\//i.test(uri);

/** The poster's name and color come from their profile on the server. */
function toListingPayload(post: SubleasePost) {
  const { userName: _name, avatarColor: _color, timestamp: _ts, ...stored } = post;
  if (stored.images?.some(uri => !isUploaded(uri)) || (stored.floorPlanUrl && !isUploaded(stored.floorPlanUrl))) {
    throw new Error("Photos must be uploaded before the listing is saved.");
  }
  return stored;
}

/** A search that hasn't answered by now is reported as failed, never left spinning. */
const SEARCH_TIMEOUT_MS = 10000;

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Search took too long. Check your connection and try again.")), SEARCH_TIMEOUT_MS);
    promise.then(
      value => { clearTimeout(timer); resolve(value); },
      error => { clearTimeout(timer); reject(error); },
    );
  });
}

export interface ListingSearch {
  /** Matches building name or address, partial and case-insensitive. */
  q?: string;
  /** Whole dollars per month, inclusive. */
  minPrice?: number;
  maxPrice?: number;
}

/** Not-yet-leased listings matching every given filter, newest first. */
export async function searchListings({ q, minPrice, maxPrice }: ListingSearch): Promise<SubleasePost[]> {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (minPrice !== undefined) params.set("minPrice", String(minPrice));
  if (maxPrice !== undefined) params.set("maxPrice", String(maxPrice));
  const res = await withTimeout(apiRequest("GET", `/api/listings?${params}`));
  return (await res.json()) as SubleasePost[];
}

/** Active crash posts whose story or dates label contains `q`. */
export async function searchCrashPosts(q: string): Promise<CrashPost[]> {
  const res = await withTimeout(apiRequest("GET", `/api/crash-posts?${new URLSearchParams({ q })}`));
  return (await res.json()) as CrashPost[];
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
  const { userName: _name, avatarColor: _color, timestamp: _ts, status: _status, ...stored } = post;
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
