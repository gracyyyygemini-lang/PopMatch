import { Platform } from "react-native";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { getApiUrl } from "@/lib/query-client";

export type { Session, User };

/** Only UIUC students may sign up. */
export const UIUC_EMAIL_DOMAIN = "illinois.edu";

export function isUiucEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(`@${UIUC_EMAIL_DOMAIN}`);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * APP REVIEW ONLY. Apple's reviewers have no UIUC account, so exactly one
 * non-UIUC address may use the email-code screen. Its code isn't emailed:
 * the API checks it (POST /api/auth/review-login, server/reviewLogin.ts)
 * and hands back a session. Must match REVIEW_EMAIL there. Remove both once
 * the build is approved.
 */
const REVIEW_EMAIL = "gracealright@outlook.com"; // App Review only

export function isReviewEmail(email: string): boolean {
  return normalizeEmail(email) === REVIEW_EMAIL;
}

/** Who may use the email-code screen: UIUC students, plus the review account. */
export function canUseEmailCode(email: string): boolean {
  return isUiucEmail(email) || isReviewEmail(email);
}

/** The signed-in user, or null. */
export async function getCurrentUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error("auth.getSession failed:", error.message);
    return null;
  }
  return data.session?.user ?? null;
}

/**
 * Subscribe to sign-in / sign-out. Fires once on mount with the restored
 * session (or null), so callers can use it to clear a loading state.
 * Returns an unsubscribe function.
 */
export function onAuthStateChange(
  callback: (user: User | null) => void
): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
  return () => data.subscription.unsubscribe();
}

/** Best-effort display name pulled off the provider metadata. */
export function displayNameOf(user: User | null): string {
  if (!user) return "";
  const meta = user.user_metadata ?? {};
  return (
    (meta.full_name as string) ||
    (meta.name as string) ||
    (meta.preferred_username as string) ||
    ""
  );
}

// ─── Email code (OTP) ────────────────────────────────────────────────────────

/**
 * Emails a 6-digit code to a UIUC address. Supabase generates and stores the
 * code; it is never exposed to the client.
 */
export async function sendUiucOtp(email: string): Promise<void> {
  const clean = normalizeEmail(email);

  if (!canUseEmailCode(clean)) {
    throw new Error("Please use your @illinois.edu email address.");
  }

  // APP REVIEW ONLY: the review account's code is fixed, not emailed, so
  // there's nothing to send.
  if (isReviewEmail(clean)) return;

  const { error } = await supabase.auth.signInWithOtp({
    email: clean,
    options: { shouldCreateUser: true },
  });

  if (error) throw new Error(error.message);
}

/** Exchanges the emailed 6-digit code for a session. */
export async function verifyUiucOtp(
  email: string,
  token: string
): Promise<User> {
  const clean = normalizeEmail(email);

  // APP REVIEW ONLY: the API checks the code and returns a real Supabase
  // session. Every other address goes through verifyOtp below.
  if (isReviewEmail(clean)) return verifyReviewCode(clean, token.trim());

  const { data, error } = await supabase.auth.verifyOtp({
    email: clean,
    token: token.trim(),
    type: "email",
  });

  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("Verification failed. Please try again.");

  return data.user;
}

/** APP REVIEW ONLY: the code is checked by the API, not Supabase's mailer. */
async function verifyReviewCode(email: string, code: string): Promise<User> {
  let res: Response;
  try {
    res = await fetch(new URL("/api/auth/review-login", getApiUrl()).toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
  } catch {
    throw new Error("Couldn't reach PopMatch. Check your connection and try again.");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || "Verification failed. Please try again.");

  const { data, error } = await supabase.auth.setSession({
    access_token: body.access_token,
    refresh_token: body.refresh_token,
  });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("Verification failed. Please try again.");
  return data.user;
}

// ─── Microsoft / Azure (optional) ────────────────────────────────────────────

/**
 * Starts Microsoft sign-in. On web the browser handles the redirect and the
 * session is picked up by detectSessionInUrl; on native we open an auth
 * session and finish the exchange ourselves.
 */
export async function signInWithAzure(): Promise<void> {
  const redirectTo = Linking.createURL("/onboarding");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "azure",
    options: {
      scopes: "openid profile email",
      redirectTo,
      skipBrowserRedirect: Platform.OS !== "web",
    },
  });

  if (error) {
    // The dashboard returns this when the Azure provider hasn't been set up,
    // which is otherwise a very confusing thing to hit.
    if (/provider.*not enabled|unsupported provider/i.test(error.message)) {
      throw new Error(
        "UIUC sign-in isn't switched on yet. In Supabase: Authentication -> " +
          "Providers -> Azure, enable it and paste in your Azure app's client " +
          "ID and secret."
      );
    }
    throw new Error(error.message);
  }

  // Web: the page navigates away; nothing left to do here.
  if (Platform.OS === "web") return;

  if (!data?.url) throw new Error("Could not start Microsoft sign-in.");

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  // User dismissed the sheet — not an error worth surfacing.
  if (result.type !== "success") return;

  await completeNativeOAuth(result.url);
  await enforceUiucDomain();
}

async function completeNativeOAuth(callbackUrl: string): Promise<void> {
  const parsed = new URL(callbackUrl);

  // PKCE flow (the supabase-js v2 default).
  const code = parsed.searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw new Error(error.message);
    return;
  }

  // Implicit flow fallback: tokens arrive in the URL fragment.
  const rawHash = parsed.hash.startsWith("#") ? parsed.hash.slice(1) : parsed.hash;
  const fragment = new URLSearchParams(rawHash);

  const access_token = fragment.get("access_token");
  const refresh_token = fragment.get("refresh_token");

  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });
    if (error) throw new Error(error.message);
    return;
  }

  const description =
    parsed.searchParams.get("error_description") ??
    fragment.get("error_description");

  throw new Error(description || "Microsoft sign-in did not complete.");
}

/**
 * A Microsoft account outside illinois.edu must not get in. Supabase has no
 * per-provider domain allowlist, so we check after the fact and sign out.
 */
async function enforceUiucDomain(): Promise<void> {
  const user = await getCurrentUser();
  const email = user?.email;

  if (email && !isUiucEmail(email)) {
    await supabase.auth.signOut();
    throw new Error(
      "PopMatch is UIUC-only. Please sign in with your @illinois.edu account."
    );
  }
}

// ─── Sign out ────────────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

/**
 * Forgets the session on this device only, without asking Supabase to end
 * it. For after account deletion: the user no longer exists, so a normal
 * sign-out would fail.
 */
export async function signOutLocally(): Promise<void> {
  await supabase.auth.signOut({ scope: "local" }).catch(() => {});
}
