import type { PublicProfile, UserProfile } from "@/context/AppContext";
import { apiRequest } from "@/lib/query-client";

/**
 * Profiles live in the `users` table, reached through the Express API (RLS has
 * no policies yet, so the Supabase client can't read or write them directly).
 * The API speaks camelCase UserProfile shapes; it maps Postgres columns itself.
 */

/** Long enough for a cold server, short enough not to strand onboarding. */
const SAVE_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

/**
 * What the server stores. A local `file://` avatar (left behind when the
 * Storage upload fails) means nothing to other devices, so it isn't sent.
 */
function toPayload(user: UserProfile) {
  const { profileImage, ...stored } = user;
  return {
    ...stored,
    profileImage: profileImage && /^https?:\/\//i.test(profileImage) ? profileImage : "",
  };
}

/**
 * Server fields win. Anything the server doesn't have yet (a profile saved
 * before intent / vibeProfile had columns, an avatar that never uploaded) is
 * carried over from `local` so the next save sends it up.
 */
export function mergeProfile(local: UserProfile, server: UserProfile): UserProfile {
  return {
    ...server,
    intent: server.intent ?? local.intent,
    vibeProfile: server.vibeProfile ?? local.vibeProfile,
    profileImage: server.profileImage ?? local.profileImage,
  };
}

/** Upserts by email. The returned id is canonical — it may differ from user.id. */
export async function saveUserProfile(user: UserProfile): Promise<UserProfile> {
  const res = await withTimeout(apiRequest("POST", "/api/users", toPayload(user)), SAVE_TIMEOUT_MS);
  const saved = (await res.json()) as UserProfile;
  return mergeProfile(user, saved);
}

/** Your own profile, or null if it hasn't been saved yet. Any other email is a 403. */
export async function fetchUserProfile(email: string): Promise<UserProfile | null> {
  try {
    const res = await apiRequest("GET", `/api/users/by-email/${encodeURIComponent(email)}`);
    return (await res.json()) as UserProfile;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("404")) return null;
    throw error;
  }
}

/**
 * The swipe deck: everyone fetchUsers returns except students you passed on.
 * Only the matchmaker uses this — a pass doesn't hide anyone from the map or
 * friend lookups, which use fetchUsers.
 */
export async function fetchDeck(): Promise<PublicProfile[]> {
  const res = await apiRequest("GET", "/api/users?deck=true");
  return (await res.json()) as PublicProfile[];
}

/**
 * Permanently deletes your account on the server: photos, profile, posts,
 * matches, messages and your sign-in. Throws if anything failed; calling it
 * again resumes. Clearing this device is the caller's job.
 */
export async function deleteMyAccount(): Promise<void> {
  await apiRequest("DELETE", "/api/account");
}

/** Everyone but you, without emails (see PublicProfile). */
export async function fetchUsers(): Promise<PublicProfile[]> {
  const res = await apiRequest("GET", "/api/users");
  return (await res.json()) as PublicProfile[];
}
