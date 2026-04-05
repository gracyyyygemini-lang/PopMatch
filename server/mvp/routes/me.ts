import type { Express, Request, Response } from "express";
import { getSupabaseAdmin, publicStorageUrl } from "../../lib/supabaseAdmin";
import { requireFirebaseAuth, requireFirebaseAuthOnly } from "../../middleware/requireFirebaseAuth";
import { mapProfileToClient } from "../mappers";

const PROFILE_BUCKET = "profile-images";

export function registerMeRoutes(app: Express) {
  app.post("/api/me/bootstrap", requireFirebaseAuthOnly, async (req: Request, res: Response) => {
    try {
      const sb = getSupabaseAdmin();
      if (!sb) return res.status(503).json({ error: "Supabase is not configured" });

      const uid = req.firebaseUser!.uid;
      const email = (req.body?.email as string) || req.firebaseUser!.email || "";
      const name = (req.body?.name as string) || "";

      const { data: existing, error: exErr } = await sb
        .from("profiles")
        .select("*")
        .eq("firebase_uid", uid)
        .maybeSingle();

      if (exErr) {
        console.error("bootstrap select", exErr);
        return res.status(500).json({ error: "Failed to load profile" });
      }

      if (existing) {
        return res.json(mapProfileToClient(existing as Record<string, unknown>));
      }

      const { data: created, error: insErr } = await sb
        .from("profiles")
        .insert({
          firebase_uid: uid,
          email: email || "unknown@illinois.edu",
          name,
        })
        .select("*")
        .single();

      if (insErr) {
        console.error("bootstrap insert", insErr);
        return res.status(500).json({ error: "Failed to create profile" });
      }

      return res.json(mapProfileToClient(created as Record<string, unknown>));
    } catch (e) {
      console.error("POST /api/me/bootstrap", e);
      return res.status(500).json({ error: "Bootstrap failed" });
    }
  });

  app.get("/api/me/profile", requireFirebaseAuth(true), async (req: Request, res: Response) => {
    try {
      const sb = getSupabaseAdmin();
      if (!sb) return res.status(503).json({ error: "Supabase is not configured" });

      const { data, error } = await sb
        .from("profiles")
        .select("*")
        .eq("id", req.profile!.id)
        .single();

      if (error || !data) {
        return res.status(404).json({ error: "Profile not found" });
      }

      return res.json(mapProfileToClient(data as Record<string, unknown>));
    } catch (e) {
      console.error("GET /api/me/profile", e);
      return res.status(500).json({ error: "Failed to load profile" });
    }
  });

  app.put("/api/me/profile", requireFirebaseAuth(true), async (req: Request, res: Response) => {
    try {
      const sb = getSupabaseAdmin();
      if (!sb) return res.status(503).json({ error: "Supabase is not configured" });

      const b = req.body as Record<string, unknown>;
      const patch: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      const str = (k: string) => (typeof b[k] === "string" ? b[k] : undefined);
      const num = (k: string) => (typeof b[k] === "number" ? b[k] : undefined);
      const bool = (k: string) => (typeof b[k] === "boolean" ? b[k] : undefined);

      if (str("name") !== undefined) patch.name = b.name;
      if (str("email") !== undefined) patch.email = b.email;
      if (str("major") !== undefined) patch.major = b.major;
      if (str("bio") !== undefined) patch.bio = b.bio;
      if (num("budget") !== undefined) patch.budget = b.budget;
      if (str("gender") !== undefined) patch.gender = b.gender;
      if (str("genderPref") !== undefined) patch.gender_pref = b.genderPref;
      if (num("cleanliness") !== undefined) patch.cleanliness = b.cleanliness;
      if (num("noise") !== undefined) patch.noise = b.noise;
      if (str("leaseType") !== undefined) patch.lease_type = b.leaseType;
      if (str("zone") !== undefined) patch.zone = b.zone;
      if (Array.isArray(b.landlords)) patch.landlord = b.landlords;
      if (bool("staysThanksgiving") !== undefined) patch.stays_thanksgiving = b.staysThanksgiving;
      if (bool("staysSpringBreak") !== undefined) patch.stays_spring_break = b.staysSpringBreak;
      if (str("avatarColor") !== undefined) patch.avatar_color = b.avatarColor;
      if (str("college") !== undefined) patch.college = b.college;
      if (Array.isArray(b.organizations)) patch.organizations = b.organizations;
      if (str("intent") !== undefined) patch.intent = b.intent;
      if (str("profileImage") !== undefined) patch.profile_image_url = b.profileImage;
      if (b.vibeProfile && typeof b.vibeProfile === "object") patch.vibe_profile = b.vibeProfile;

      const { data, error } = await sb
        .from("profiles")
        .update(patch)
        .eq("id", req.profile!.id)
        .select("*")
        .single();

      if (error) {
        console.error("PUT /api/me/profile", error);
        return res.status(500).json({ error: "Failed to update profile" });
      }

      return res.json(mapProfileToClient(data as Record<string, unknown>));
    } catch (e) {
      console.error("PUT /api/me/profile", e);
      return res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.post("/api/me/profile-image/sign", requireFirebaseAuth(true), async (req: Request, res: Response) => {
    try {
      const sb = getSupabaseAdmin();
      if (!sb) return res.status(503).json({ error: "Supabase is not configured" });

      const ext = typeof req.body?.fileExt === "string" ? req.body.fileExt.replace(/^\./, "") : "jpg";
      const safeExt = ["jpg", "jpeg", "png", "webp", "heic"].includes(ext.toLowerCase()) ? ext.toLowerCase() : "jpg";
      const path = `${req.profile!.id}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${safeExt}`;

      const { data, error } = await sb.storage.from(PROFILE_BUCKET).createSignedUploadUrl(path);
      if (error || !data) {
        console.error("profile-image sign", error);
        return res.status(500).json({ error: "Failed to sign upload" });
      }

      return res.json({
        path: data.path,
        token: data.token,
        signedUrl: data.signedUrl,
        publicUrl: publicStorageUrl(PROFILE_BUCKET, path),
      });
    } catch (e) {
      console.error("POST /api/me/profile-image/sign", e);
      return res.status(500).json({ error: "Failed to sign upload" });
    }
  });

  app.post("/api/me/profile-image/commit", requireFirebaseAuth(true), async (req: Request, res: Response) => {
    try {
      const sb = getSupabaseAdmin();
      if (!sb) return res.status(503).json({ error: "Supabase is not configured" });

      const storagePath = req.body?.path as string | undefined;
      if (!storagePath?.trim()) {
        return res.status(400).json({ error: "path is required" });
      }
      if (!storagePath.startsWith(`${req.profile!.id}/`)) {
        return res.status(400).json({ error: "Invalid path" });
      }

      const publicUrl = publicStorageUrl(PROFILE_BUCKET, storagePath);
      const { data, error } = await sb
        .from("profiles")
        .update({ profile_image_url: publicUrl, updated_at: new Date().toISOString() })
        .eq("id", req.profile!.id)
        .select("*")
        .single();

      if (error || !data) {
        console.error("profile-image commit", error);
        return res.status(500).json({ error: "Failed to save profile image" });
      }

      return res.json(mapProfileToClient(data as Record<string, unknown>));
    } catch (e) {
      console.error("POST /api/me/profile-image/commit", e);
      return res.status(500).json({ error: "Failed to commit profile image" });
    }
  });
}
