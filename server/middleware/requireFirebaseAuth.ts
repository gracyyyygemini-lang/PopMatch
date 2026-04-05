import type { Request, Response, NextFunction } from "express";
import { verifyFirebaseIdToken } from "../lib/firebaseAdmin";
import { getSupabaseAdmin } from "../lib/supabaseAdmin";

export type AuthedProfile = {
  id: string;
  firebase_uid: string;
  email: string;
  name: string;
};

declare global {
  namespace Express {
    interface Request {
      firebaseUser?: { uid: string; email: string | null };
      profile?: AuthedProfile;
    }
  }
}

const bearerRe = /^Bearer\s+(.+)$/i;

export function requireFirebaseAuth(loadProfile = true) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const header = req.header("authorization") ?? "";
    const m = bearerRe.exec(header);
    if (!m) {
      return res.status(401).json({ error: "Missing Authorization Bearer token" });
    }

    try {
      const decoded = await verifyFirebaseIdToken(m[1]!.trim());
      const email = decoded.email ?? null;
      req.firebaseUser = { uid: decoded.uid, email };

      if (loadProfile) {
        const sb = getSupabaseAdmin();
        if (!sb) {
          return res.status(503).json({ error: "Supabase is not configured" });
        }
        const { data: row, error } = await sb
          .from("profiles")
          .select("id, firebase_uid, email, name")
          .eq("firebase_uid", decoded.uid)
          .maybeSingle();

        if (error) {
          console.error("requireFirebaseAuth profile load", error);
          return res.status(500).json({ error: "Failed to load profile" });
        }
        if (!row) {
          return res.status(404).json({ error: "Profile not found; call POST /api/me/bootstrap first" });
        }
        req.profile = {
          id: row.id as string,
          firebase_uid: row.firebase_uid as string,
          email: (row.email as string) ?? email ?? "",
          name: (row.name as string) ?? "",
        };
      }

      next();
    } catch (e) {
      console.error("requireFirebaseAuth", e);
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  };
}

/** Verifies Firebase token only (no profile row required). */
export async function requireFirebaseAuthOnly(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization") ?? "";
  const m = bearerRe.exec(header);
  if (!m) {
    return res.status(401).json({ error: "Missing Authorization Bearer token" });
  }
  try {
    const decoded = await verifyFirebaseIdToken(m[1]!.trim());
    req.firebaseUser = { uid: decoded.uid, email: decoded.email ?? null };
    next();
  } catch (e) {
    console.error("requireFirebaseAuthOnly", e);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
