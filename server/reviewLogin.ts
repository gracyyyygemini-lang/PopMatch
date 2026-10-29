import { createClient, type Session } from "@supabase/supabase-js";
import { adminClient } from "./account";

/**
 * APP REVIEW ONLY. Apple's reviewers have no UIUC account, so this one
 * address signs in on the email-code screen with this fixed code instead of
 * an emailed one. Must match REVIEW_EMAIL in lib/auth.ts. Both are in the
 * source on purpose (no env vars to forget on a host or in EAS); remove them
 * once the build is approved.
 */
export const REVIEW_EMAIL = "gracealright@outlook.com"; // App Review only
const REVIEW_CODE = "223456"; // App Review only

export function isReviewEmail(email: string): boolean {
  return email.trim().toLowerCase() === REVIEW_EMAIL;
}

export class ReviewLoginError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

/**
 * Checks the email and code, makes sure the Supabase user exists, is
 * confirmed and has the code as its password, then signs in as it and
 * returns the session for the app to setSession() with.
 */
export async function reviewLogin(supabaseUrl: string, email: unknown, code: unknown): Promise<Session> {
  if (typeof email !== "string" || typeof code !== "string"
      || !isReviewEmail(email) || code.trim() !== REVIEW_CODE) {
    throw new ReviewLoginError(401, "That code isn't right. Check it and try again.");
  }
  const admin = adminClient(supabaseUrl);
  if (!admin) {
    console.error("POST /api/auth/review-login: SUPABASE_SERVICE_ROLE_KEY is not set");
    throw new ReviewLoginError(503, "Sign-in isn't available right now. Please try again later.");
  }

  const created = await admin.auth.admin.createUser({ email: REVIEW_EMAIL, password: REVIEW_CODE, email_confirm: true });
  if (created.error) {
    // Already exists: find it and put it back the way this path needs it.
    const existing = await findUserId(admin, REVIEW_EMAIL);
    if (!existing) throw new Error(`creating the review user: ${created.error.message}`);
    const updated = await admin.auth.admin.updateUserById(existing, { password: REVIEW_CODE, email_confirm: true });
    if (updated.error) throw new Error(`updating the review user: ${updated.error.message}`);
  }

  // A throwaway client, so the shared admin client never holds a session.
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const client = createClient(supabaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInWithPassword({ email: REVIEW_EMAIL, password: REVIEW_CODE });
  if (error || !data.session) throw new Error(`signing in the review user: ${error?.message ?? "no session"}`);
  return data.session;
}

async function findUserId(admin: NonNullable<ReturnType<typeof adminClient>>, email: string): Promise<string | null> {
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`listing users: ${error.message}`);
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit.id;
    if (data.users.length < 1000) return null;
  }
}
