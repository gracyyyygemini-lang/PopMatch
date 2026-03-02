import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { query } from "./db";

const pinStore = new Map<string, { pin: string; expiry: number }>();

async function sendPinEmail(email: string, pin: string): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    console.log(`[PopMatch PIN] ${email} → ${pin} (set SENDGRID_API_KEY to send real emails)`);
    return;
  }

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email }] }],
      from: { email: "noreply@popmatch.app", name: "PopMatch" },
      subject: "Your PopMatch verification code",
      content: [
        {
          type: "text/plain",
          value: `Your PopMatch verification code is: ${pin}\n\nThis code expires in 10 minutes. Do not share it with anyone.`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("SendGrid error:", res.status, body);
    throw new Error("Failed to send email");
  }
}

async function ensureFeedbackTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS feedback (
      id SERIAL PRIMARY KEY,
      user_email TEXT NOT NULL,
      rating INT NOT NULL,
      message TEXT DEFAULT '',
      created_at BIGINT NOT NULL
    )
  `);
}

export async function registerRoutes(app: Express): Promise<Server> {
  await ensureFeedbackTable();

  // ─── PIN VERIFICATION ────────────────────────────────────────────────────────

  app.post("/api/send-pin", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email || !email.endsWith("@illinois.edu")) {
        return res.status(400).json({ error: "Only @illinois.edu emails are accepted." });
      }

      const pin = Math.floor(100000 + Math.random() * 900000).toString();
      pinStore.set(email.toLowerCase(), { pin, expiry: Date.now() + 10 * 60 * 1000 });

      await sendPinEmail(email.toLowerCase(), pin);

      return res.json({ success: true });
    } catch (err) {
      console.error("POST /api/send-pin", err);
      return res.status(500).json({ error: "Failed to send verification code." });
    }
  });

  app.post("/api/verify-pin", async (req: Request, res: Response) => {
    try {
      const { email, pin } = req.body;
      if (!email || !pin) {
        return res.status(400).json({ error: "email and pin are required" });
      }

      const stored = pinStore.get(email.toLowerCase());
      if (!stored) {
        return res.json({ valid: false, reason: "No code sent to this email." });
      }
      if (Date.now() > stored.expiry) {
        pinStore.delete(email.toLowerCase());
        return res.json({ valid: false, reason: "Code expired. Request a new one." });
      }
      if (stored.pin !== pin.toString()) {
        return res.json({ valid: false, reason: "Incorrect code. Try again." });
      }

      pinStore.delete(email.toLowerCase());
      return res.json({ valid: true });
    } catch (err) {
      console.error("POST /api/verify-pin", err);
      return res.status(500).json({ error: "Failed to verify code." });
    }
  });

  // ─── USERS ───────────────────────────────────────────────────────────────────

  app.post("/api/users", async (req: Request, res: Response) => {
    try {
      const {
        id, name, email, major = "", bio = "", budget = 800,
        gender = "nonbinary", genderPref = "mixed", cleanliness = 3,
        noise = 3, leaseType = "full_year", zone = "campustown",
        landlord = "other", staysThanksgiving = false, staysSpringBreak = false,
        avatarColor = "#005F73", college = "", organizations = [],
      } = req.body;

      if (!id || !name || !email) {
        return res.status(400).json({ error: "id, name, and email are required" });
      }
      if (!email.endsWith(".edu")) {
        return res.status(400).json({ error: "Must use a .edu email address" });
      }

      await query(
        `INSERT INTO users (id, name, email, major, bio, budget, gender, gender_pref,
          cleanliness, noise, lease_type, zone, landlord, stays_thanksgiving,
          stays_spring_break, avatar_color, college, organizations)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
         ON CONFLICT (email) DO UPDATE SET
           name = EXCLUDED.name, major = EXCLUDED.major, bio = EXCLUDED.bio,
           budget = EXCLUDED.budget, gender = EXCLUDED.gender,
           gender_pref = EXCLUDED.gender_pref, cleanliness = EXCLUDED.cleanliness,
           noise = EXCLUDED.noise, lease_type = EXCLUDED.lease_type,
           zone = EXCLUDED.zone, landlord = EXCLUDED.landlord,
           stays_thanksgiving = EXCLUDED.stays_thanksgiving,
           stays_spring_break = EXCLUDED.stays_spring_break,
           avatar_color = EXCLUDED.avatar_color, college = EXCLUDED.college,
           organizations = EXCLUDED.organizations`,
        [id, name, email, major, bio, budget, gender, genderPref, cleanliness,
          noise, leaseType, zone, landlord, staysThanksgiving, staysSpringBreak,
          avatarColor, college, organizations]
      );

      const [user] = await query("SELECT * FROM users WHERE email = $1", [email]);
      return res.json(user);
    } catch (err) {
      console.error("POST /api/users", err);
      return res.status(500).json({ error: "Failed to save user" });
    }
  });

  app.get("/api/users/by-email/:email", async (req: Request, res: Response) => {
    try {
      const [user] = await query("SELECT * FROM users WHERE email = $1", [req.params.email]);
      if (!user) return res.status(404).json({ error: "User not found" });
      return res.json(user);
    } catch (err) {
      console.error("GET /api/users/by-email", err);
      return res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // ─── FRIENDS ─────────────────────────────────────────────────────────────────

  app.get("/api/friends/:email", async (req: Request, res: Response) => {
    try {
      const rows = await query<{
        email: string; name: string; avatar_color: string; major: string;
        college: string; organizations: string[];
      }>(
        `SELECT u2.email, u2.name, u2.avatar_color, u2.major, u2.college, u2.organizations
         FROM friendships fr
         JOIN users u1 ON fr.user_id = u1.id AND u1.email = $1
         JOIN users u2 ON fr.friend_id = u2.id`,
        [req.params.email]
      );
      return res.json(rows);
    } catch (err) {
      console.error("GET /api/friends", err);
      return res.status(500).json({ error: "Failed to fetch friends" });
    }
  });

  app.post("/api/friends", async (req: Request, res: Response) => {
    try {
      const { userEmail, friendEmail } = req.body;
      if (!userEmail || !friendEmail) {
        return res.status(400).json({ error: "userEmail and friendEmail are required" });
      }
      if (userEmail === friendEmail) {
        return res.status(400).json({ error: "Cannot friend yourself" });
      }

      const [user] = await query<{ id: string }>("SELECT id FROM users WHERE email = $1", [userEmail]);
      const [friend] = await query<{ id: string }>("SELECT id FROM users WHERE email = $1", [friendEmail]);

      if (!user) return res.status(404).json({ error: "Your account not found — complete onboarding first" });
      if (!friend) return res.status(404).json({ error: "That @illinois.edu email is not registered on PopMatch yet" });

      await query(
        `INSERT INTO friendships (user_id, friend_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [user.id, friend.id]
      );
      await query(
        `INSERT INTO friendships (user_id, friend_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [friend.id, user.id]
      );

      return res.json({ success: true });
    } catch (err) {
      console.error("POST /api/friends", err);
      return res.status(500).json({ error: "Failed to add friend" });
    }
  });

  app.delete("/api/friends", async (req: Request, res: Response) => {
    try {
      const { userEmail, friendEmail } = req.body;
      const [user] = await query<{ id: string }>("SELECT id FROM users WHERE email = $1", [userEmail]);
      const [friend] = await query<{ id: string }>("SELECT id FROM users WHERE email = $1", [friendEmail]);
      if (!user || !friend) return res.status(404).json({ error: "User not found" });

      await query("DELETE FROM friendships WHERE user_id = $1 AND friend_id = $2", [user.id, friend.id]);
      await query("DELETE FROM friendships WHERE user_id = $1 AND friend_id = $2", [friend.id, user.id]);
      return res.json({ success: true });
    } catch (err) {
      console.error("DELETE /api/friends", err);
      return res.status(500).json({ error: "Failed to remove friend" });
    }
  });

  // ─── VOUCHES ─────────────────────────────────────────────────────────────────

  app.post("/api/vouches", async (req: Request, res: Response) => {
    try {
      const { voucherEmail, voucheeEmail, message = "" } = req.body;
      if (!voucherEmail || !voucheeEmail) {
        return res.status(400).json({ error: "voucherEmail and voucheeEmail are required" });
      }

      const [voucher] = await query<{ id: string }>("SELECT id FROM users WHERE email = $1", [voucherEmail]);
      const [vouchee] = await query<{ id: string }>("SELECT id FROM users WHERE email = $1", [voucheeEmail]);
      if (!voucher || !vouchee) return res.status(404).json({ error: "User not found" });

      await query(
        `INSERT INTO vouches (voucher_id, vouchee_id, message) VALUES ($1, $2, $3)
         ON CONFLICT (voucher_id, vouchee_id) DO UPDATE SET message = EXCLUDED.message`,
        [voucher.id, vouchee.id, message]
      );
      return res.json({ success: true });
    } catch (err) {
      console.error("POST /api/vouches", err);
      return res.status(500).json({ error: "Failed to vouch" });
    }
  });

  app.delete("/api/vouches", async (req: Request, res: Response) => {
    try {
      const { voucherEmail, voucheeEmail } = req.body;
      const [voucher] = await query<{ id: string }>("SELECT id FROM users WHERE email = $1", [voucherEmail]);
      const [vouchee] = await query<{ id: string }>("SELECT id FROM users WHERE email = $1", [voucheeEmail]);
      if (!voucher || !vouchee) return res.status(404).json({ error: "User not found" });

      await query("DELETE FROM vouches WHERE voucher_id = $1 AND vouchee_id = $2", [voucher.id, vouchee.id]);
      return res.json({ success: true });
    } catch (err) {
      console.error("DELETE /api/vouches", err);
      return res.status(500).json({ error: "Failed to remove vouch" });
    }
  });

  // ─── TRUST INFO ───────────────────────────────────────────────────────────────

  app.get("/api/trust/:viewerEmail/:targetEmail", async (req: Request, res: Response) => {
    try {
      const { viewerEmail, targetEmail } = req.params;

      if (viewerEmail === targetEmail) {
        return res.json({ isFriend: true, mutualFriends: [], vouchedBy: [], sharedOrgs: [] });
      }

      const [viewer] = await query<{ id: string; organizations: string[] }>(
        "SELECT id, organizations FROM users WHERE email = $1", [viewerEmail]
      );
      const [target] = await query<{ id: string; organizations: string[] }>(
        "SELECT id, organizations FROM users WHERE email = $1", [targetEmail]
      );

      if (!viewer || !target) {
        return res.json({ isFriend: false, mutualFriends: [], vouchedBy: [], sharedOrgs: [] });
      }

      const isDirect = await query<{ id: string }>(
        "SELECT fr.id FROM friendships fr WHERE fr.user_id = $1 AND fr.friend_id = $2",
        [viewer.id, target.id]
      );

      if (isDirect.length > 0) {
        const vouchedBy = await query<{ name: string; email: string }>(
          `SELECT u.name, u.email FROM vouches v JOIN users u ON v.voucher_id = u.id WHERE v.vouchee_id = $1`,
          [target.id]
        );
        const sharedOrgs = (viewer.organizations || []).filter(
          (org: string) => (target.organizations || []).includes(org)
        );
        return res.json({ isFriend: true, mutualFriends: [], vouchedBy, sharedOrgs });
      }

      const mutualFriends = await query<{ name: string; email: string; avatar_color: string }>(
        `SELECT u.name, u.email, u.avatar_color
         FROM users u
         WHERE u.id IN (SELECT friend_id FROM friendships WHERE user_id = $1)
           AND u.id IN (SELECT friend_id FROM friendships WHERE user_id = $2)`,
        [viewer.id, target.id]
      );

      const vouchedBy = mutualFriends.length > 0
        ? await query<{ name: string; email: string }>(
            `SELECT u.name, u.email FROM vouches v JOIN users u ON v.voucher_id = u.id
             WHERE v.vouchee_id = $1 AND v.voucher_id IN (SELECT friend_id FROM friendships WHERE user_id = $2)`,
            [target.id, viewer.id]
          )
        : [];

      const sharedOrgs = (viewer.organizations || []).filter(
        (org: string) => (target.organizations || []).includes(org)
      );

      return res.json({ isFriend: false, mutualFriends, vouchedBy, sharedOrgs });
    } catch (err) {
      console.error("GET /api/trust", err);
      return res.status(500).json({ error: "Failed to compute trust" });
    }
  });

  // ─── LISTINGS ────────────────────────────────────────────────────────────────

  app.get("/api/listings", async (req: Request, res: Response) => {
    try {
      const { category } = req.query;
      const sql = category
        ? `SELECT l.*, u.name as user_name, u.avatar_color as user_avatar
           FROM listings l LEFT JOIN users u ON l.user_id = u.id
           WHERE l.category = $1 ORDER BY l.created_at DESC`
        : `SELECT l.*, u.name as user_name, u.avatar_color as user_avatar
           FROM listings l LEFT JOIN users u ON l.user_id = u.id
           ORDER BY l.created_at DESC`;
      const params = category ? [category] : [];
      const rows = await query(sql, params);
      return res.json(rows);
    } catch (err) {
      console.error("GET /api/listings", err);
      return res.status(500).json({ error: "Failed to fetch listings" });
    }
  });

  app.post("/api/listings", async (req: Request, res: Response) => {
    try {
      const {
        id, userId, buildingName, address = "", category = "semester_takeover",
        leaseType = "full_year", pricePerMonth = 0, landlord = "other",
        zone = "campustown", availableDuringBreaks = false, breakTypes = [],
        description = "", eventName = "", startDate = "", endDate = "",
        moveInDate = "", moveOutDate = "",
      } = req.body;

      if (!id || !userId || !buildingName) {
        return res.status(400).json({ error: "id, userId, and buildingName are required" });
      }

      await query(
        `INSERT INTO listings (id, user_id, building_name, address, category, lease_type,
          price_per_month, landlord, zone, available_during_breaks, break_types,
          description, event_name, start_date, end_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         ON CONFLICT (id) DO NOTHING`,
        [id, userId, buildingName, address, category, leaseType, pricePerMonth,
          landlord, zone, availableDuringBreaks, breakTypes, description,
          eventName, startDate || moveInDate, endDate || moveOutDate]
      );
      return res.json({ success: true });
    } catch (err) {
      console.error("POST /api/listings", err);
      return res.status(500).json({ error: "Failed to save listing" });
    }
  });

  // ─── FEEDBACK ────────────────────────────────────────────────────────────────

  app.post("/api/feedback", async (req: Request, res: Response) => {
    try {
      const { userEmail, rating, message = "" } = req.body;
      if (!userEmail || !rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: "userEmail and rating (1–5) are required" });
      }

      await query(
        `INSERT INTO feedback (user_email, rating, message, created_at) VALUES ($1, $2, $3, $4)`,
        [userEmail, rating, message.slice(0, 300), Date.now()]
      );

      return res.json({ success: true });
    } catch (err) {
      console.error("POST /api/feedback", err);
      return res.status(500).json({ error: "Failed to save feedback" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
