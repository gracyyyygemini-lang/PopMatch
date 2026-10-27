import type { UserProfile } from "@/context/AppContext";
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
 * The columns the server stores. `intent` and `vibeProfile` have no columns
 * yet and stay device-only. A local `file://` avatar (left behind when the
 * Storage upload fails) means nothing to other devices, so it isn't sent.
 */
function toPayload(user: UserProfile) {
  const { intent: _intent, vibeProfile: _vibe, profileImage, ...stored } = user;
  return {
    ...stored,
    profileImage: profileImage && /^https?:\/\//i.test(profileImage) ? profileImage : "",
  };
}

/** Server fields win; device-only fields are carried over from `local`. */
export function mergeProfile(local: UserProfile, server: UserProfile): UserProfile {
  return {
    ...server,
    intent: local.intent,
    vibeProfile: local.vibeProfile,
    profileImage: server.profileImage ?? local.profileImage,
  };
}

/** Upserts by email. The returned id is canonical — it may differ from user.id. */
export async function saveUserProfile(user: UserProfile): Promise<UserProfile> {
  const res = await withTimeout(apiRequest("POST", "/api/users", toPayload(user)), SAVE_TIMEOUT_MS);
  const saved = (await res.json()) as UserProfile;
  return mergeProfile(user, saved);
}

/** null when no profile has been saved for this email yet. */
export async function fetchUserProfile(email: string): Promise<UserProfile | null> {
  try {
    const res = await apiRequest("GET", `/api/users/by-email/${encodeURIComponent(email)}`);
    return (await res.json()) as UserProfile;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("404")) return null;
    throw error;
  }
}

export async function fetchUsers(excludeEmail?: string): Promise<UserProfile[]> {
  const route = excludeEmail
    ? `/api/users?exclude=${encodeURIComponent(excludeEmail)}`
    : "/api/users";
  const res = await apiRequest("GET", route);
  return (await res.json()) as UserProfile[];
}
