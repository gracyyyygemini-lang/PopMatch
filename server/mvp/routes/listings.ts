import type { Express, Request, Response } from "express";
import { getSupabaseAdmin, publicStorageUrl } from "../../lib/supabaseAdmin";
import { requireFirebaseAuth } from "../../middleware/requireFirebaseAuth";
import { mapListingToSubleasePost } from "../mappers";

const BUCKET = "listing-images";

function buildExtras(body: Record<string, unknown>): Record<string, unknown> {
  const keys = [
    "kitchenType",
    "bathroomType",
    "unitType",
    "isPrivateBedroom",
    "isPrivateBathroom",
    "roomsAvailable",
    "currentResidentBio",
    "listingType",
    "moveInDate",
    "moveOutDate",
    "amenities",
    "cleaningFrequency",
    "shoePolicy",
    "eventTag",
    "subCategory",
    "hasParking",
    "roommatePreference",
    "floorPlanUrl",
    "floorPlanPath",
  ];
  const extras: Record<string, unknown> = {};
  for (const k of keys) {
    if (body[k] !== undefined) extras[k] = body[k];
  }
  return extras;
}

async function loadListingBundle(sb: NonNullable<ReturnType<typeof getSupabaseAdmin>>, listingId: string) {
  const { data: listing, error: lErr } = await sb.from("listings").select("*").eq("id", listingId).maybeSingle();
  if (lErr || !listing) return null;

  const { data: owner } = await sb
    .from("profiles")
    .select("id,name,email,avatar_color")
    .eq("id", (listing as { owner_profile_id: string }).owner_profile_id)
    .maybeSingle();

  const { data: imgs } = await sb
    .from("listing_images")
    .select("listing_id,storage_path,sort_order")
    .eq("listing_id", listingId);

  const extras = ((listing as { extras: Record<string, unknown> }).extras) ?? {};
  const floorPlanPath = (extras.floorPlanPath as string) || null;

  return {
    listing: listing as Record<string, unknown>,
    owner: owner as { id: string; name: string; email: string; avatar_color: string } | undefined,
    images: (imgs ?? []) as { listing_id: string; storage_path: string; sort_order: number }[],
    floorPlanPath,
  };
}

export function registerListingRoutes(app: Express) {
  app.get("/api/listings", async (req: Request, res: Response) => {
    try {
      const sb = getSupabaseAdmin();
      if (!sb) return res.status(503).json({ error: "Supabase is not configured" });

      const zone = typeof req.query.zone === "string" ? req.query.zone : undefined;
      const category = typeof req.query.category === "string" ? req.query.category : undefined;

      let q = sb.from("listings").select("*").eq("leased", false).order("created_at", { ascending: false });
      if (zone) q = q.eq("zone", zone);
      if (category) q = q.eq("category", category);

      const { data: listings, error } = await q;
      if (error) {
        console.error("GET /api/listings", error);
        return res.status(500).json({ error: "Failed to fetch listings" });
      }

      const rows = listings ?? [];
      const ownerIds = [...new Set(rows.map((l) => (l as { owner_profile_id: string }).owner_profile_id))];
      const listingIds = rows.map((l) => (l as { id: string }).id);

      const { data: owners } =
        ownerIds.length > 0
          ? await sb.from("profiles").select("id,name,email,avatar_color").in("id", ownerIds)
          : { data: [] };

      const { data: allImgs } =
        listingIds.length > 0
          ? await sb.from("listing_images").select("listing_id,storage_path,sort_order").in("listing_id", listingIds)
          : { data: [] };

      const ownerMap = new Map((owners ?? []).map((o) => [(o as { id: string }).id, o as { id: string; name: string; email: string; avatar_color: string }]));
      const imgByListing = new Map<string, { listing_id: string; storage_path: string; sort_order: number }[]>();
      for (const im of allImgs ?? []) {
        const row = im as { listing_id: string; storage_path: string; sort_order: number };
        const arr = imgByListing.get(row.listing_id) ?? [];
        arr.push(row);
        imgByListing.set(row.listing_id, arr);
      }

      const out = rows.map((l) => {
        const listing = l as Record<string, unknown>;
        const oid = listing.owner_profile_id as string;
        const extras = (listing.extras as Record<string, unknown>) ?? {};
        const floorPlanPath = (extras.floorPlanPath as string) || null;
        return mapListingToSubleasePost(listing, ownerMap.get(oid), imgByListing.get(listing.id as string) ?? [], floorPlanPath);
      });

      return res.json(out);
    } catch (e) {
      console.error("GET /api/listings", e);
      return res.status(500).json({ error: "Failed to fetch listings" });
    }
  });

  app.post("/api/listings", requireFirebaseAuth(true), async (req: Request, res: Response) => {
    try {
      const sb = getSupabaseAdmin();
      if (!sb) return res.status(503).json({ error: "Supabase is not configured" });

      const b = req.body as Record<string, unknown>;
      const buildingName = b.buildingName as string | undefined;
      if (!buildingName?.trim()) {
        return res.status(400).json({ error: "buildingName is required" });
      }

      const landlords = Array.isArray(b.landlords) ? b.landlords : ["other"];
      const extras = buildExtras(b);

      const insertRow = {
        owner_profile_id: req.profile!.id,
        building_name: buildingName.trim(),
        address: (b.address as string) || "",
        category: (b.category as string) || "semester_takeover",
        lease_type: (b.leaseType as string) || "full_year",
        price_per_month: typeof b.pricePerMonth === "number" ? b.pricePerMonth : Number(b.pricePerMonth) || 0,
        landlord: landlords,
        zone: (b.zone as string) || "campustown",
        available_during_breaks: !!b.availableDuringBreaks,
        break_types: Array.isArray(b.breakTypes) ? b.breakTypes : [],
        description: (b.description as string) || "",
        extras,
      };

      const { data: listing, error } = await sb.from("listings").insert(insertRow).select("*").single();
      if (error) {
        console.error("POST /api/listings", error);
        return res.status(500).json({ error: "Failed to create listing" });
      }

      const bundle = await loadListingBundle(sb, (listing as { id: string }).id);
      if (!bundle) return res.status(500).json({ error: "Failed to load listing" });

      const post = mapListingToSubleasePost(bundle.listing, bundle.owner, bundle.images, bundle.floorPlanPath);
      return res.json({ success: true, listing: post });
    } catch (e) {
      console.error("POST /api/listings", e);
      return res.status(500).json({ error: "Failed to create listing" });
    }
  });

  app.delete("/api/listings/:id", requireFirebaseAuth(true), async (req: Request, res: Response) => {
    try {
      const sb = getSupabaseAdmin();
      if (!sb) return res.status(503).json({ error: "Supabase is not configured" });

      const id = req.params.id;
      const { data: row, error: fErr } = await sb.from("listings").select("id,owner_profile_id").eq("id", id).maybeSingle();
      if (fErr || !row) return res.status(404).json({ error: "Listing not found" });
      if ((row as { owner_profile_id: string }).owner_profile_id !== req.profile!.id) {
        return res.status(403).json({ error: "Not allowed" });
      }

      const { error } = await sb.from("listings").update({ leased: true }).eq("id", id);
      if (error) {
        console.error("DELETE /api/listings/:id", error);
        return res.status(500).json({ error: "Failed to update listing" });
      }

      return res.json({ success: true });
    } catch (e) {
      console.error("DELETE /api/listings/:id", e);
      return res.status(500).json({ error: "Failed to update listing" });
    }
  });

  app.post("/api/listings/:id/images/sign", requireFirebaseAuth(true), async (req: Request, res: Response) => {
    try {
      const sb = getSupabaseAdmin();
      if (!sb) return res.status(503).json({ error: "Supabase is not configured" });

      const listingId = req.params.id;
      const { data: row } = await sb.from("listings").select("owner_profile_id").eq("id", listingId).maybeSingle();
      if (!row) return res.status(404).json({ error: "Listing not found" });
      if ((row as { owner_profile_id: string }).owner_profile_id !== req.profile!.id) {
        return res.status(403).json({ error: "Not allowed" });
      }

      const ext = typeof req.body?.fileExt === "string" ? req.body.fileExt.replace(/^\./, "") : "jpg";
      const safeExt = ["jpg", "jpeg", "png", "webp", "heic"].includes(ext.toLowerCase()) ? ext.toLowerCase() : "jpg";
      const path = `${listingId}/${req.profile!.id}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${safeExt}`;

      const { data, error } = await sb.storage.from(BUCKET).createSignedUploadUrl(path);
      if (error || !data) {
        console.error("createSignedUploadUrl", error);
        return res.status(500).json({ error: "Failed to sign upload" });
      }

      return res.json({
        path: data.path,
        token: data.token,
        signedUrl: data.signedUrl,
        publicUrl: publicStorageUrl(BUCKET, path),
      });
    } catch (e) {
      console.error("POST /api/listings/:id/images/sign", e);
      return res.status(500).json({ error: "Failed to sign upload" });
    }
  });

  app.patch("/api/listings/:id", requireFirebaseAuth(true), async (req: Request, res: Response) => {
    try {
      const sb = getSupabaseAdmin();
      if (!sb) return res.status(503).json({ error: "Supabase is not configured" });

      const id = req.params.id;
      const { data: row, error: fErr } = await sb.from("listings").select("id,owner_profile_id,extras").eq("id", id).maybeSingle();
      if (fErr || !row) return res.status(404).json({ error: "Listing not found" });
      if ((row as { owner_profile_id: string }).owner_profile_id !== req.profile!.id) {
        return res.status(403).json({ error: "Not allowed" });
      }

      const bodyExtras = req.body?.extras as Record<string, unknown> | undefined;
      if (!bodyExtras || typeof bodyExtras !== "object") {
        return res.status(400).json({ error: "extras object is required" });
      }

      const prev = ((row as { extras: Record<string, unknown> }).extras) ?? {};
      const merged = { ...prev, ...bodyExtras };

      const { error } = await sb.from("listings").update({ extras: merged }).eq("id", id);
      if (error) {
        console.error("PATCH /api/listings/:id", error);
        return res.status(500).json({ error: "Failed to update listing" });
      }

      return res.json({ success: true });
    } catch (e) {
      console.error("PATCH /api/listings/:id", e);
      return res.status(500).json({ error: "Failed to update listing" });
    }
  });

  app.post("/api/listings/:id/images/commit", requireFirebaseAuth(true), async (req: Request, res: Response) => {
    try {
      const sb = getSupabaseAdmin();
      if (!sb) return res.status(503).json({ error: "Supabase is not configured" });

      const listingId = req.params.id;
      const storagePath = req.body?.path as string | undefined;
      const sortOrder = typeof req.body?.sortOrder === "number" ? req.body.sortOrder : 0;

      if (!storagePath?.trim()) {
        return res.status(400).json({ error: "path is required" });
      }

      const { data: row } = await sb.from("listings").select("owner_profile_id").eq("id", listingId).maybeSingle();
      if (!row) return res.status(404).json({ error: "Listing not found" });
      if ((row as { owner_profile_id: string }).owner_profile_id !== req.profile!.id) {
        return res.status(403).json({ error: "Not allowed" });
      }

      if (!storagePath.startsWith(`${listingId}/${req.profile!.id}/`)) {
        return res.status(400).json({ error: "Invalid path" });
      }

      const { error } = await sb.from("listing_images").insert({
        listing_id: listingId,
        storage_path: storagePath,
        sort_order: sortOrder,
      });

      if (error) {
        console.error("images/commit", error);
        return res.status(500).json({ error: "Failed to save image metadata" });
      }

      return res.json({
        publicUrl: publicStorageUrl(BUCKET, storagePath),
      });
    } catch (e) {
      console.error("POST /api/listings/:id/images/commit", e);
      return res.status(500).json({ error: "Failed to commit image" });
    }
  });
}
