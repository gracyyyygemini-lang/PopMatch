import type { Express, Request, Response } from "express";
import { getSupabaseAdmin } from "../../lib/supabaseAdmin";
import { requireFirebaseAuth } from "../../middleware/requireFirebaseAuth";

function canonicalParticipants(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export function registerChatRoutes(app: Express) {
  app.get("/api/conversations", requireFirebaseAuth(true), async (req: Request, res: Response) => {
    try {
      const sb = getSupabaseAdmin();
      if (!sb) return res.status(503).json({ error: "Supabase is not configured" });

      const me = req.profile!.id;

      const { data: convos, error } = await sb
        .from("conversations")
        .select("*")
        .or(`participant_1_id.eq.${me},participant_2_id.eq.${me}`)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("GET /api/conversations", error);
        return res.status(500).json({ error: "Failed to fetch conversations" });
      }

      const rows = convos ?? [];
      const otherIds = rows.map((c) => {
        const r = c as { participant_1_id: string; participant_2_id: string };
        return r.participant_1_id === me ? r.participant_2_id : r.participant_1_id;
      });
      const uniqueOther = [...new Set(otherIds)];

      const { data: profiles } =
        uniqueOther.length > 0
          ? await sb
              .from("profiles")
              .select("id,name,email,avatar_color,profile_image_url")
              .in("id", uniqueOther)
          : { data: [] };

      const profileMap = new Map(
        (profiles ?? []).map((p) => [
          (p as { id: string }).id,
          p as { id: string; name: string; email: string; avatar_color: string; profile_image_url: string | null },
        ]),
      );

      const convoIds = rows.map((c) => (c as { id: string }).id);
      let lastByConvo = new Map<string, { content: string; created_at: string }>();
      if (convoIds.length > 0) {
        const { data: msgs } = await sb
          .from("messages")
          .select("conversation_id,content,created_at")
          .in("conversation_id", convoIds)
          .order("created_at", { ascending: false });

        for (const m of msgs ?? []) {
          const row = m as { conversation_id: string; content: string; created_at: string };
          if (!lastByConvo.has(row.conversation_id)) {
            lastByConvo.set(row.conversation_id, { content: row.content, created_at: row.created_at });
          }
        }
      }

      const out = rows.map((c) => {
        const r = c as {
          id: string;
          participant_1_id: string;
          participant_2_id: string;
          listing_id: string;
          listing_building: string;
          listing_price: number;
          listing_unit_type: string | null;
          source: string | null;
          created_at: string;
        };
        const otherId = r.participant_1_id === me ? r.participant_2_id : r.participant_1_id;
        const p = profileMap.get(otherId);
        const last = lastByConvo.get(r.id);
        return {
          id: r.id,
          participant1Id: r.participant_1_id,
          participant2Id: r.participant_2_id,
          listingId: r.listing_id,
          listingBuilding: r.listing_building,
          listingPrice: r.listing_price,
          listingUnitType: r.listing_unit_type ?? undefined,
          source: r.source ?? undefined,
          lastMessage: last?.content,
          lastMessageAt: last ? new Date(last.created_at).getTime() : undefined,
          otherUserName: p?.name,
          otherUserAvatar: p?.avatar_color,
          otherUserEmail: p?.email,
          otherUserProfileImage: p?.profile_image_url ?? undefined,
        };
      });

      return res.json(out);
    } catch (e) {
      console.error("GET /api/conversations", e);
      return res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.post("/api/conversations", requireFirebaseAuth(true), async (req: Request, res: Response) => {
    try {
      const sb = getSupabaseAdmin();
      if (!sb) return res.status(503).json({ error: "Supabase is not configured" });

      const me = req.profile!.id;
      const other = req.body?.participant2Id as string | undefined;
      const listingId = (req.body?.listingId as string) ?? "";
      const listingBuilding = (req.body?.listingBuilding as string) ?? "";
      const listingPrice = typeof req.body?.listingPrice === "number" ? req.body.listingPrice : 0;
      const listingUnitType = (req.body?.listingUnitType as string) || null;
      const source = (req.body?.source as string) || null;

      if (!other) {
        return res.status(400).json({ error: "participant2Id is required" });
      }
      if (other === me) {
        return res.status(400).json({ error: "Invalid participant" });
      }

      const [p1, p2] = canonicalParticipants(me, other);

      const { data: existing } = await sb
        .from("conversations")
        .select("*")
        .eq("listing_id", listingId)
        .eq("participant_1_id", p1)
        .eq("participant_2_id", p2)
        .maybeSingle();

      if (existing) {
        return res.json({
          id: (existing as { id: string }).id,
          participant1Id: (existing as { participant_1_id: string }).participant_1_id,
          participant2Id: (existing as { participant_2_id: string }).participant_2_id,
          listingId: (existing as { listing_id: string }).listing_id,
          listingBuilding: (existing as { listing_building: string }).listing_building,
          listingPrice: (existing as { listing_price: number }).listing_price,
          listingUnitType: (existing as { listing_unit_type: string | null }).listing_unit_type ?? undefined,
          source: (existing as { source: string | null }).source ?? undefined,
        });
      }

      const { data: created, error } = await sb
        .from("conversations")
        .insert({
          participant_1_id: p1,
          participant_2_id: p2,
          listing_id: listingId,
          listing_building: listingBuilding,
          listing_price: listingPrice,
          listing_unit_type: listingUnitType,
          source,
        })
        .select("*")
        .single();

      if (error) {
        console.error("POST /api/conversations", error);
        return res.status(500).json({ error: "Failed to create conversation" });
      }

      const r = created as {
        id: string;
        participant_1_id: string;
        participant_2_id: string;
        listing_id: string;
        listing_building: string;
        listing_price: number;
        listing_unit_type: string | null;
        source: string | null;
      };

      return res.json({
        id: r.id,
        participant1Id: r.participant_1_id,
        participant2Id: r.participant_2_id,
        listingId: r.listing_id,
        listingBuilding: r.listing_building,
        listingPrice: r.listing_price,
        listingUnitType: r.listing_unit_type ?? undefined,
        source: r.source ?? undefined,
      });
    } catch (e) {
      console.error("POST /api/conversations", e);
      return res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  app.get("/api/messages/:conversationId", requireFirebaseAuth(true), async (req: Request, res: Response) => {
    try {
      const sb = getSupabaseAdmin();
      if (!sb) return res.status(503).json({ error: "Supabase is not configured" });

      const me = req.profile!.id;
      const conversationId = req.params.conversationId;

      const { data: convo, error: cErr } = await sb.from("conversations").select("*").eq("id", conversationId).maybeSingle();
      if (cErr || !convo) return res.status(404).json({ error: "Conversation not found" });

      const c = convo as { participant_1_id: string; participant_2_id: string };
      if (c.participant_1_id !== me && c.participant_2_id !== me) {
        return res.status(403).json({ error: "Not allowed" });
      }

      const { data: rows, error } = await sb
        .from("messages")
        .select("id,conversation_id,sender_profile_id,content,created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("GET /api/messages/:conversationId", error);
        return res.status(500).json({ error: "Failed to fetch messages" });
      }

      const out = (rows ?? []).map((m) => {
        const r = m as { id: string; conversation_id: string; sender_profile_id: string; content: string; created_at: string };
        return {
          id: r.id,
          conversationId: r.conversation_id,
          senderId: r.sender_profile_id,
          content: r.content,
          createdAt: new Date(r.created_at).getTime(),
        };
      });

      return res.json(out);
    } catch (e) {
      console.error("GET /api/messages/:conversationId", e);
      return res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/messages", requireFirebaseAuth(true), async (req: Request, res: Response) => {
    try {
      const sb = getSupabaseAdmin();
      if (!sb) return res.status(503).json({ error: "Supabase is not configured" });

      const me = req.profile!.id;
      const conversationId = req.body?.conversationId as string | undefined;
      const content = req.body?.content as string | undefined;

      if (!conversationId || !content?.trim()) {
        return res.status(400).json({ error: "conversationId and content are required" });
      }

      const { data: convo, error: cErr } = await sb.from("conversations").select("*").eq("id", conversationId).maybeSingle();
      if (cErr || !convo) return res.status(404).json({ error: "Conversation not found" });

      const c = convo as { participant_1_id: string; participant_2_id: string };
      if (c.participant_1_id !== me && c.participant_2_id !== me) {
        return res.status(403).json({ error: "Not allowed" });
      }

      const { data: msg, error } = await sb
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_profile_id: me,
          content: content.trim(),
        })
        .select("id,conversation_id,sender_profile_id,content,created_at")
        .single();

      if (error || !msg) {
        console.error("POST /api/messages", error);
        return res.status(500).json({ error: "Failed to send message" });
      }

      const r = msg as { id: string; conversation_id: string; sender_profile_id: string; content: string; created_at: string };
      return res.json({
        id: r.id,
        conversationId: r.conversation_id,
        senderId: r.sender_profile_id,
        content: r.content,
        createdAt: new Date(r.created_at).getTime(),
      });
    } catch (e) {
      console.error("POST /api/messages", e);
      return res.status(500).json({ error: "Failed to send message" });
    }
  });
}
