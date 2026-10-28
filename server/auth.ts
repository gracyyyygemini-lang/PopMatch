import type { NextFunction, Request, Response } from "express";
import { createRemoteJWKSet, errors, jwtVerify, type JWTVerifyGetKey } from "jose";
import { query } from "./db";

/**
 * Who is calling, taken from a verified Supabase access token — never from
 * the URL or body. `userId` is null until the caller has saved a profile
 * (onboarding's first POST /api/users is the only thing that needs that).
 */
export interface Caller {
  email: string;
  userId: string | null;
}

declare global {
  namespace Express {
    interface Request {
      caller?: Caller;
    }
  }
}

/**
 * Tokens are verified locally against the project's published signing keys
 * (ES256, /auth/v1/.well-known/jwks.json). The keys are fetched once and
 * cached, so a request costs a signature check rather than a round trip to
 * Supabase. The price: a token stays valid until it expires (1 hour by
 * default) even after sign-out or a ban, where supabase.auth.getUser would
 * notice immediately. Keep the JWT expiry short in the Supabase dashboard if
 * that window matters.
 */
export function supabaseSigningKeys(supabaseUrl: string): JWTVerifyGetKey {
  return createRemoteJWKSet(new URL("/auth/v1/.well-known/jwks.json", supabaseUrl));
}

export interface AuthOptions {
  /** Where signing keys come from. Production: supabaseSigningKeys(); tests pass a local key set. */
  getKey: JWTVerifyGetKey;
  /** The `iss` claim Supabase puts on its tokens: <project url>/auth/v1. */
  issuer: string;
}

function unauthorized(res: Response, code: string, error: string) {
  return res.status(401).json({ error, code });
}

/** Rejects any /api request without a valid token, and attaches req.caller. */
export function requireAuth({ getKey, issuer }: AuthOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const match = /^Bearer\s+(.+)$/i.exec(req.header("authorization") ?? "");
    if (!match) return unauthorized(res, "missing_token", "Sign in to continue");

    let email: unknown;
    try {
      const { payload } = await jwtVerify(match[1], getKey, {
        issuer,
        audience: "authenticated",
        algorithms: ["ES256", "RS256"],
      });
      email = payload.email;
    } catch (err) {
      if (err instanceof errors.JWTExpired) {
        return unauthorized(res, "token_expired", "Your session expired. Sign in again.");
      }
      return unauthorized(res, "invalid_token", "Your session isn't valid. Sign in again.");
    }
    if (typeof email !== "string" || !email) {
      return unauthorized(res, "invalid_token", "Your session has no email address. Sign in again.");
    }

    try {
      const normalized = email.trim().toLowerCase();
      const [row] = await query<{ id: string }>(
        "SELECT id FROM users WHERE lower(email) = $1",
        [normalized]
      );
      req.caller = { email: normalized, userId: row?.id ?? null };
      return next();
    } catch (err) {
      console.error("auth: resolving caller", err);
      return res.status(500).json({ error: "Failed to check your account" });
    }
  };
}

/** ADMIN_EMAILS is a comma-separated allowlist; unset means nobody is an admin. */
function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map(e => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.caller || !adminEmails().has(req.caller.email)) {
    return res.status(403).json({ error: "Admins only" });
  }
  return next();
}

/**
 * The caller's users.id, or a 403 sent on their behalf when they have no
 * profile yet. Routes that act as the caller start with this.
 */
export function callerUserId(req: Request, res: Response): string | null {
  const id = req.caller?.userId;
  if (!id) {
    res.status(403).json({ error: "Finish setting up your profile first" });
    return null;
  }
  return id;
}

/**
 * For routes that still name the caller in the URL or body (kept so the app
 * doesn't need new paths): anything but the caller's own identity is a 403.
 * An omitted value is fine — the authenticated identity is used either way.
 */
export function namesSomeoneElse(claimed: unknown, actual: string, caseInsensitive = false): boolean {
  if (claimed === undefined || claimed === null || claimed === "") return false;
  const a = String(claimed);
  return caseInsensitive ? a.trim().toLowerCase() !== actual : a !== actual;
}
