import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { query } from "./db";

async function initDb() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR PRIMARY KEY,
      name VARCHAR NOT NULL,
      email VARCHAR UNIQUE NOT NULL,
      major VARCHAR DEFAULT '',
      bio VARCHAR DEFAULT '',
      budget INT DEFAULT 800,
      gender VARCHAR DEFAULT 'nonbinary',
      gender_pref VARCHAR DEFAULT 'mixed',
      cleanliness INT DEFAULT 3,
      noise INT DEFAULT 3,
      lease_type VARCHAR DEFAULT 'full_year',
      zone VARCHAR DEFAULT 'campustown',
      landlord VARCHAR DEFAULT 'other',
      stays_thanksgiving BOOLEAN DEFAULT FALSE,
      stays_spring_break BOOLEAN DEFAULT FALSE,
      avatar_color VARCHAR DEFAULT '#005F73',
      college VARCHAR DEFAULT '',
      organizations TEXT[] DEFAULT '{}',
      profile_image VARCHAR DEFAULT ''
    )
  `);

  await query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image VARCHAR DEFAULT ''
  `).catch(() => {});

  await query(`
    CREATE TABLE IF NOT EXISTS friendships (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
      friend_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, friend_id)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS vouches (
      id SERIAL PRIMARY KEY,
      voucher_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
      vouchee_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
      message TEXT DEFAULT '',
      UNIQUE(voucher_id, vouchee_id)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS listings (
      id VARCHAR PRIMARY KEY,
      user_id VARCHAR NOT NULL,
      building_name VARCHAR NOT NULL,
      address VARCHAR DEFAULT '',
      category VARCHAR DEFAULT 'semester_takeover',
      lease_type VARCHAR DEFAULT 'full_year',
      price_per_month INT DEFAULT 0,
      landlord VARCHAR DEFAULT 'other',
      zone VARCHAR DEFAULT 'campustown',
      available_during_breaks BOOLEAN DEFAULT FALSE,
      break_types TEXT[] DEFAULT '{}',
      description TEXT DEFAULT '',
      event_name VARCHAR DEFAULT '',
      start_date TIMESTAMPTZ,
      end_date TIMESTAMPTZ,
      leased BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      details JSONB NOT NULL DEFAULT '{}'::jsonb
    )
  `);

  // Everything a listing has that no column covers. toListingDetails decides
  // what goes in; nothing the server filters or sorts on belongs here.
  await query(`ALTER TABLE listings ADD COLUMN IF NOT EXISTS details JSONB NOT NULL DEFAULT '{}'::jsonb`);
  // start_date/end_date began as VARCHAR and were never written. They hold
  // the move-in and move-out instants, so make them timestamps.
  await query(`
    DO $$
    BEGIN
      IF (SELECT data_type FROM information_schema.columns
          WHERE table_name = 'listings' AND column_name = 'start_date') = 'character varying' THEN
        ALTER TABLE listings
          ALTER COLUMN start_date DROP DEFAULT,
          ALTER COLUMN start_date TYPE TIMESTAMPTZ USING NULLIF(start_date, '')::timestamptz,
          ALTER COLUMN end_date DROP DEFAULT,
          ALTER COLUMN end_date TYPE TIMESTAMPTZ USING NULLIF(end_date, '')::timestamptz;
      END IF;
    END
    $$
  `);
  await query(`ALTER TABLE listings ENABLE ROW LEVEL SECURITY`);

  await query(`
    CREATE TABLE IF NOT EXISTS break_posts (
      id VARCHAR PRIMARY KEY,
      user_id VARCHAR NOT NULL,
      break_type VARCHAR NOT NULL,
      role VARCHAR NOT NULL,
      price_per_week INT DEFAULT 0,
      zone VARCHAR DEFAULT 'campustown',
      description TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    ALTER TABLE listings ADD COLUMN IF NOT EXISTS leased BOOLEAN DEFAULT FALSE
  `).catch(() => {});

  await query(`
    CREATE TABLE IF NOT EXISTS crash_posts (
      id VARCHAR PRIMARY KEY,
      user_id VARCHAR NOT NULL,
      vibe VARCHAR NOT NULL,
      story TEXT NOT NULL DEFAULT '',
      image_url VARCHAR NOT NULL DEFAULT '',
      dates VARCHAR NOT NULL DEFAULT '',
      target_date TIMESTAMPTZ NOT NULL,
      zone VARCHAR NOT NULL DEFAULT 'campustown',
      currency VARCHAR NOT NULL,
      currency_label VARCHAR NOT NULL DEFAULT '',
      approx_location VARCHAR NOT NULL DEFAULT '',
      status VARCHAR NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_crash_posts_feed ON crash_posts (status, target_date)`);
  await query(`ALTER TABLE crash_posts ENABLE ROW LEVEL SECURITY`);

  await query(`
    CREATE TABLE IF NOT EXISTS feedback (
      id SERIAL PRIMARY KEY,
      user_email VARCHAR NOT NULL,
      rating VARCHAR NOT NULL,
      issue_category VARCHAR DEFAULT '',
      issue_detail TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS likes (
      id SERIAL PRIMARY KEY,
      liker_email VARCHAR NOT NULL,
      liked_email VARCHAR NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (liker_email, liked_email),
      CHECK (liker_email <> liked_email)
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_likes_liked ON likes (liked_email)`);
  // Match schema.sql: a table created here must not be readable via the anon key.
  await query(`ALTER TABLE likes ENABLE ROW LEVEL SECURITY`);

  await query(`
    CREATE TABLE IF NOT EXISTS stats (
      key VARCHAR PRIMARY KEY,
      value INT DEFAULT 0
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id VARCHAR PRIMARY KEY,
      participant1_id VARCHAR NOT NULL,
      participant2_id VARCHAR NOT NULL,
      listing_id VARCHAR DEFAULT '',
      listing_building VARCHAR DEFAULT '',
      listing_price INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS messages (
      id VARCHAR PRIMARY KEY,
      conversation_id VARCHAR NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id VARCHAR NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // One conversation per pair per listing, whichever side opens it first —
  // otherwise two people tapping "message" at once each get their own thread.
  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_conversations_pair_listing ON conversations (
      LEAST(participant1_id, participant2_id), GREATEST(participant1_id, participant2_id), listing_id
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (conversation_id)`);
  await query(`ALTER TABLE conversations ENABLE ROW LEVEL SECURITY`);
  await query(`ALTER TABLE messages ENABLE ROW LEVEL SECURITY`);

  await query(`
    INSERT INTO stats (key, value) VALUES ('successful_subleases', 0)
    ON CONFLICT (key) DO NOTHING
  `);
  await query(`
    INSERT INTO stats (key, value) VALUES ('total_matches', 0)
    ON CONFLICT (key) DO NOTHING
  `);

  console.log("Database initialized");
}

type MutualLikeRow = { email: string; matched_at: Date | string };

/** The match became mutual when the later of the two likes landed. */
function toMutualMatch(row: MutualLikeRow) {
  return {
    email: row.email,
    matchedAt: new Date(row.matched_at).getTime(),
  };
}

type UserRow = {
  id: string; name: string; email: string; major: string | null; bio: string | null;
  budget: number | null; gender: string | null; gender_pref: string | null;
  cleanliness: number | null; noise: number | null; lease_type: string | null;
  zone: string | null; landlord: string | null; stays_thanksgiving: boolean | null;
  stays_spring_break: boolean | null; avatar_color: string | null;
  college: string | null; organizations: string[] | null; profile_image: string | null;
};

/** `landlord` holds a JSON array written by POST /api/users, or a bare legacy value. */
function parseLandlords(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {}
  return [value];
}

/**
 * Postgres rows are snake_case; the app's UserProfile is camelCase. Every
 * users endpoint responds through this so column names never reach the UI.
 */
function toUserProfile(row: UserRow) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    major: row.major ?? "",
    bio: row.bio ?? "",
    budget: row.budget ?? 800,
    gender: row.gender ?? "nonbinary",
    genderPref: row.gender_pref ?? "mixed",
    cleanliness: row.cleanliness ?? 3,
    noise: row.noise ?? 3,
    leaseType: row.lease_type ?? "full_year",
    zone: row.zone ?? "campustown",
    landlords: parseLandlords(row.landlord),
    staysThanksgiving: row.stays_thanksgiving ?? false,
    staysSpringBreak: row.stays_spring_break ?? false,
    avatarColor: row.avatar_color ?? "#005F73",
    college: row.college ?? "",
    organizations: row.organizations ?? [],
    ...(row.profile_image ? { profileImage: row.profile_image } : {}),
  };
}

type ConversationRow = {
  id: string; participant1_id: string; participant2_id: string;
  listing_id: string | null; listing_building: string | null; listing_price: number | null;
  created_at: Date | string;
  participant1_name: string | null; participant1_avatar: string | null;
  participant1_email: string | null; participant1_image: string | null;
  participant2_name: string | null; participant2_avatar: string | null;
  participant2_email: string | null; participant2_image: string | null;
  last_message: string | null; last_message_at: Date | string | null;
};

/** Every conversations endpoint selects this, so each can describe the other person. */
const CONVERSATION_SELECT = `
  SELECT c.*,
    u1.name AS participant1_name, u1.avatar_color AS participant1_avatar,
    u1.email AS participant1_email, u1.profile_image AS participant1_image,
    u2.name AS participant2_name, u2.avatar_color AS participant2_avatar,
    u2.email AS participant2_email, u2.profile_image AS participant2_image,
    last.content AS last_message, last.created_at AS last_message_at
  FROM conversations c
  LEFT JOIN users u1 ON c.participant1_id = u1.id
  LEFT JOIN users u2 ON c.participant2_id = u2.id
  LEFT JOIN LATERAL (
    SELECT content, created_at FROM messages
    WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1
  ) last ON TRUE`;

/**
 * Same idea as toUserProfile. `otherUser*` is whoever isn't `viewerId`, which
 * is what the inbox and chat header show.
 */
function toConversation(row: ConversationRow, viewerId: string) {
  const viewerIsP1 = row.participant1_id === viewerId;
  const other = viewerIsP1
    ? { name: row.participant2_name, avatar: row.participant2_avatar, email: row.participant2_email, image: row.participant2_image }
    : { name: row.participant1_name, avatar: row.participant1_avatar, email: row.participant1_email, image: row.participant1_image };
  return {
    id: row.id,
    participant1Id: row.participant1_id,
    participant2Id: row.participant2_id,
    listingId: row.listing_id ?? "",
    listingBuilding: row.listing_building ?? "",
    listingPrice: row.listing_price ?? 0,
    createdAt: new Date(row.created_at).getTime(),
    ...(row.last_message != null ? { lastMessage: row.last_message } : {}),
    ...(row.last_message_at ? { lastMessageAt: new Date(row.last_message_at).getTime() } : {}),
    otherUserName: other.name ?? "",
    otherUserAvatar: other.avatar ?? "",
    otherUserEmail: other.email ?? "",
    ...(other.image ? { otherUserProfileImage: other.image } : {}),
  };
}

type MessageRow = {
  id: string; conversation_id: string; sender_id: string; content: string;
  created_at: Date | string; sender_name: string | null; sender_avatar: string | null;
};

const MESSAGE_SELECT = `
  SELECT m.*, u.name AS sender_name, u.avatar_color AS sender_avatar
  FROM messages m
  LEFT JOIN users u ON m.sender_id = u.id`;

const isHttpUrl = (v: unknown): v is string => typeof v === "string" && /^https?:\/\//i.test(v);
const asString = (v: unknown) => (typeof v === "string" && v ? v : undefined);
const asNumber = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const asBoolean = (v: unknown) => (typeof v === "boolean" ? v : undefined);
const asUrl = (v: unknown) => (isHttpUrl(v) ? v : undefined);
const asUrls = (v: unknown) => (Array.isArray(v) ? v.filter(isHttpUrl) : undefined);
const asFlags = (v: unknown) =>
  v && typeof v === "object" && !Array.isArray(v)
    ? Object.fromEntries(Object.entries(v).filter(([, flag]) => typeof flag === "boolean")) as Record<string, boolean>
    : undefined;

/**
 * The only fields stored in listings.details, each with the check its value
 * must pass. JSONB has no schema, so this list is the schema: a key that
 * isn't here is neither written nor read back.
 */
const LISTING_DETAILS = {
  listingType: asString,
  kitchenType: asString,
  bathroomType: asString,
  unitType: asString,
  isPrivateBedroom: asBoolean,
  isPrivateBathroom: asBoolean,
  floorPlanUrl: asUrl,
  roomsAvailable: asNumber,
  currentResidentBio: asString,
  roommatePreference: asString,
  amenities: asFlags,
  cleaningFrequency: asString,
  shoePolicy: asString,
  images: asUrls,
  subCategory: asString,
  hasParking: asBoolean,
};

type ListingDetails = {
  [K in keyof typeof LISTING_DETAILS]?: NonNullable<ReturnType<(typeof LISTING_DETAILS)[K]>>;
};

/** Used both ways: on a request body before saving, and on details when reading. */
function toListingDetails(source: unknown): ListingDetails {
  const record = (source && typeof source === "object" ? source : {}) as Record<string, unknown>;
  const details: Record<string, unknown> = {};
  for (const [key, check] of Object.entries(LISTING_DETAILS)) {
    const value = check(record[key]);
    if (value !== undefined) details[key] = value;
  }
  return details as ListingDetails;
}

type ListingRow = {
  id: string; user_id: string; building_name: string; address: string | null;
  category: string | null; lease_type: string | null; price_per_month: number | null;
  landlord: string | null; zone: string | null; available_during_breaks: boolean | null;
  break_types: string[] | null; description: string | null; event_name: string | null;
  start_date: Date | string | null; end_date: Date | string | null;
  created_at: Date | string; details: unknown;
  user_name: string | null; user_email: string | null; user_avatar: string | null;
};

/** Poster's name, email and color come from users, so they can't drift from the profile. */
const LISTING_SELECT = `
  SELECT l.*, u.name AS user_name, u.email AS user_email, u.avatar_color AS user_avatar
  FROM listings l
  LEFT JOIN users u ON l.user_id = u.id`;

const toIso = (value: Date | string | null) => (value ? new Date(value).toISOString() : undefined);

/** Same idea as toUserProfile: the SubleasePost shape the app uses, in camelCase. */
function toListing(row: ListingRow) {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name ?? "",
    userEmail: row.user_email ?? "",
    avatarColor: row.user_avatar ?? "#005F73",
    buildingName: row.building_name,
    address: row.address ?? "",
    category: row.category ?? "semester_takeover",
    leaseType: row.lease_type ?? "full_year",
    pricePerMonth: row.price_per_month ?? 0,
    landlords: parseLandlords(row.landlord),
    zone: row.zone ?? "campustown",
    availableDuringBreaks: row.available_during_breaks ?? false,
    breakTypes: row.break_types ?? [],
    description: row.description ?? "",
    ...(row.event_name ? { eventTag: row.event_name } : {}),
    ...(row.start_date ? { moveInDate: toIso(row.start_date) } : {}),
    ...(row.end_date ? { moveOutDate: toIso(row.end_date) } : {}),
    timestamp: new Date(row.created_at).getTime(),
    ...toListingDetails(row.details),
  };
}

type CrashPostRow = {
  id: string; user_id: string; vibe: string; story: string; image_url: string;
  dates: string; target_date: Date | string; zone: string; currency: string;
  currency_label: string; approx_location: string; status: string; created_at: Date | string;
  user_name: string | null; user_email: string | null; user_avatar: string | null;
};

const CRASH_POST_SELECT = `
  SELECT p.*, u.name AS user_name, u.email AS user_email, u.avatar_color AS user_avatar
  FROM crash_posts p
  LEFT JOIN users u ON p.user_id = u.id`;

const CRASH_VIBES = ["sos", "offering"];
const CRASH_CURRENCIES = ["cash", "boba", "lion_cover", "food", "favor"];

/** Timestamps are TIMESTAMPTZ in the table and epoch ms in the app. */
function toCrashPost(row: CrashPostRow) {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name ?? "",
    userEmail: row.user_email ?? "",
    avatarColor: row.user_avatar ?? "#005F73",
    vibe: row.vibe,
    story: row.story,
    imageUrl: row.image_url,
    dates: row.dates,
    targetDate: new Date(row.target_date).getTime(),
    zone: row.zone,
    currency: row.currency,
    currencyLabel: row.currency_label,
    timestamp: new Date(row.created_at).getTime(),
    status: row.status,
    ...(row.approx_location ? { approxLocation: row.approx_location } : {}),
  };
}

/** A post's author must be a saved profile, or nobody could see who posted it or reply. */
async function userExists(id: unknown): Promise<boolean> {
  if (typeof id !== "string" || !id) return false;
  const rows = await query<{ id: string }>("SELECT id FROM users WHERE id = $1", [id]);
  return rows.length > 0;
}

function toChatMessage(row: MessageRow) {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    content: row.content,
    createdAt: new Date(row.created_at).getTime(),
    senderName: row.sender_name ?? "",
    senderAvatar: row.sender_avatar ?? "",
  };
}


export async function registerRoutes(app: Express): Promise<Server> {
  await initDb();

  // ─── USERS ───────────────────────────────────────────────────────────────────

  app.post("/api/users", async (req: Request, res: Response) => {
    try {
      const {
        id, name, email, major = "", bio = "", budget = 800,
        gender = "nonbinary", genderPref = "mixed", cleanliness = 3,
        noise = 3, leaseType = "full_year", zone = "campustown",
        landlords = ["other"], staysThanksgiving = false, staysSpringBreak = false,
        avatarColor = "#005F73", college = "", organizations = [], profileImage = "",
      } = req.body;

      if (!id || !name || !email) {
        return res.status(400).json({ error: "id, name, and email are required" });
      }
      if (!email.endsWith(".edu")) {
        return res.status(400).json({ error: "Must use a .edu email address" });
      }

      const landlordJson = JSON.stringify(Array.isArray(landlords) ? landlords : [landlords]);
      await query(
        `INSERT INTO users (id, name, email, major, bio, budget, gender, gender_pref,
          cleanliness, noise, lease_type, zone, landlord, stays_thanksgiving,
          stays_spring_break, avatar_color, college, organizations, profile_image)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
         ON CONFLICT (email) DO UPDATE SET
           name = EXCLUDED.name, major = EXCLUDED.major, bio = EXCLUDED.bio,
           budget = EXCLUDED.budget, gender = EXCLUDED.gender,
           gender_pref = EXCLUDED.gender_pref, cleanliness = EXCLUDED.cleanliness,
           noise = EXCLUDED.noise, lease_type = EXCLUDED.lease_type,
           zone = EXCLUDED.zone, landlord = EXCLUDED.landlord,
           stays_thanksgiving = EXCLUDED.stays_thanksgiving,
           stays_spring_break = EXCLUDED.stays_spring_break,
           avatar_color = EXCLUDED.avatar_color, college = EXCLUDED.college,
           organizations = EXCLUDED.organizations,
           profile_image = EXCLUDED.profile_image`,
        [id, name, email, major, bio, budget, gender, genderPref, cleanliness,
          noise, leaseType, zone, landlordJson, staysThanksgiving, staysSpringBreak,
          avatarColor, college, organizations, profileImage]
      );

      // On conflict the row keeps its original id, so the client must adopt
      // the id returned here rather than the one it generated.
      const [user] = await query<UserRow>("SELECT * FROM users WHERE email = $1", [email]);
      return res.json(toUserProfile(user));
    } catch (err) {
      console.error("POST /api/users", err);
      return res.status(500).json({ error: "Failed to save user" });
    }
  });

  app.get("/api/users/by-email/:email", async (req: Request, res: Response) => {
    try {
      const [user] = await query<UserRow>("SELECT * FROM users WHERE email = $1", [req.params.email]);
      if (!user) return res.status(404).json({ error: "User not found" });
      return res.json(toUserProfile(user));
    } catch (err) {
      console.error("GET /api/users/by-email", err);
      return res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // ?exclude=<email> leaves out the viewer's own profile.
  app.get("/api/users", async (req: Request, res: Response) => {
    try {
      const exclude = typeof req.query.exclude === "string" ? req.query.exclude.toLowerCase() : "";
      const rows = await query<UserRow>(
        "SELECT * FROM users WHERE lower(email) <> $1 ORDER BY name",
        [exclude]
      );
      return res.json(rows.map(toUserProfile));
    } catch (err) {
      console.error("GET /api/users", err);
      return res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // ─── LIKES ───────────────────────────────────────────────────────────────────

  app.post("/api/likes", async (req: Request, res: Response) => {
    try {
      const likerEmail = typeof req.body?.likerEmail === "string" ? req.body.likerEmail.trim().toLowerCase() : "";
      const likedEmail = typeof req.body?.likedEmail === "string" ? req.body.likedEmail.trim().toLowerCase() : "";

      if (!likerEmail || !likedEmail) {
        return res.status(400).json({ error: "likerEmail and likedEmail are required" });
      }
      if (likerEmail === likedEmail) {
        return res.status(400).json({ error: "You can't like yourself" });
      }

      await query(
        `INSERT INTO likes (liker_email, liked_email) VALUES ($1, $2)
         ON CONFLICT (liker_email, liked_email) DO NOTHING`,
        [likerEmail, likedEmail]
      );
      return res.json({ ok: true });
    } catch (err) {
      console.error("POST /api/likes", err);
      return res.status(500).json({ error: "Failed to save like" });
    }
  });

  // Everyone :email liked who also liked :email back.
  app.get("/api/likes/mutual/:email", async (req: Request, res: Response) => {
    try {
      const email = String(req.params.email).trim().toLowerCase();
      const rows = await query<MutualLikeRow>(
        `SELECT mine.liked_email AS email,
                GREATEST(mine.created_at, theirs.created_at) AS matched_at
         FROM likes mine
         JOIN likes theirs
           ON theirs.liker_email = mine.liked_email
          AND theirs.liked_email = mine.liker_email
         WHERE mine.liker_email = $1
         ORDER BY matched_at DESC`,
        [email]
      );
      return res.json(rows.map(toMutualMatch));
    } catch (err) {
      console.error("GET /api/likes/mutual", err);
      return res.status(500).json({ error: "Failed to fetch mutual likes" });
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
        return res.json({ degree: 1, mutualFriends: [], vouchedBy: [], sharedOrgs: [] });
      }

      const [viewer] = await query<{ id: string; organizations: string[] }>(
        "SELECT id, organizations FROM users WHERE email = $1", [viewerEmail]
      );
      const [target] = await query<{ id: string; organizations: string[] }>(
        "SELECT id, organizations FROM users WHERE email = $1", [targetEmail]
      );

      if (!viewer || !target) {
        return res.json({ degree: null, mutualFriends: [], vouchedBy: [], sharedOrgs: [] });
      }

      const isDirect = await query<{ id: string }>(
        "SELECT fr.id FROM friendships fr WHERE fr.user_id = $1 AND fr.friend_id = $2",
        [viewer.id, target.id]
      );

      if (isDirect.length > 0) {
        const vouchedBy = await query<{ name: string; email: string }>(
          `SELECT u.name, u.email FROM vouches v
           JOIN users u ON v.voucher_id = u.id WHERE v.vouchee_id = $1`,
          [target.id]
        );
        const sharedOrgs = (viewer.organizations || []).filter(
          (org: string) => (target.organizations || []).includes(org)
        );
        return res.json({ degree: 1, mutualFriends: [], vouchedBy, sharedOrgs });
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
            `SELECT u.name, u.email FROM vouches v
             JOIN users u ON v.voucher_id = u.id
             WHERE v.vouchee_id = $1
               AND v.voucher_id IN (SELECT friend_id FROM friendships WHERE user_id = $2)`,
            [target.id, viewer.id]
          )
        : [];

      const sharedOrgs = (viewer.organizations || []).filter(
        (org: string) => (target.organizations || []).includes(org)
      );

      const degree = mutualFriends.length > 0 ? 2 : null;
      return res.json({ degree, mutualFriends, vouchedBy, sharedOrgs });
    } catch (err) {
      console.error("GET /api/trust", err);
      return res.status(500).json({ error: "Failed to compute trust" });
    }
  });

  // ─── LISTINGS ────────────────────────────────────────────────────────────────
  // All filtering beyond ?category happens in the app over this list, which is
  // fine at campus scale. A field the server ever filters on needs a real
  // column, not a key in details.

  app.get("/api/listings", async (req: Request, res: Response) => {
    try {
      const { category } = req.query;
      const rows = await query<ListingRow>(
        `${LISTING_SELECT}
         WHERE l.leased = FALSE ${category ? "AND l.category = $1" : ""}
         ORDER BY l.created_at DESC`,
        category ? [category] : []
      );
      return res.json(rows.map(toListing));
    } catch (err) {
      console.error("GET /api/listings", err);
      return res.status(500).json({ error: "Failed to fetch listings" });
    }
  });

  app.post("/api/listings", async (req: Request, res: Response) => {
    try {
      const {
        id, userId, buildingName, address = "", category = "semester_takeover",
        leaseType = "full_year", pricePerMonth = 0, landlords = ["other"],
        zone = "campustown", availableDuringBreaks = false, breakTypes = [],
        description = "", eventTag = "", moveInDate, moveOutDate,
      } = req.body;

      if (!id || !userId || !buildingName) {
        return res.status(400).json({ error: "id, userId, and buildingName are required" });
      }
      // A file:// path saved here looks fine to the poster and is broken for
      // everyone else, so anything that isn't an uploaded URL is refused.
      const { images, floorPlanUrl } = req.body;
      if (images !== undefined && (!Array.isArray(images) || !images.every(isHttpUrl))) {
        return res.status(400).json({ error: "Photos must be uploaded (http/https URLs) before posting" });
      }
      if (floorPlanUrl && !isHttpUrl(floorPlanUrl)) {
        return res.status(400).json({ error: "The floor plan must be uploaded (http/https URL) before posting" });
      }
      const startDate = moveInDate ? new Date(moveInDate) : null;
      const endDate = moveOutDate ? new Date(moveOutDate) : null;
      if ((startDate && isNaN(startDate.getTime())) || (endDate && isNaN(endDate.getTime()))) {
        return res.status(400).json({ error: "moveInDate and moveOutDate must be ISO dates" });
      }
      if (!(await userExists(userId))) {
        return res.status(404).json({ error: "Your profile isn't saved on the server yet" });
      }

      const landlordJson = JSON.stringify(Array.isArray(landlords) ? landlords : [landlords]);
      // ON CONFLICT: retrying a post whose response was lost is a no-op.
      await query(
        `INSERT INTO listings (id, user_id, building_name, address, category, lease_type,
          price_per_month, landlord, zone, available_during_breaks, break_types,
          description, event_name, start_date, end_date, details)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         ON CONFLICT (id) DO NOTHING`,
        [id, userId, buildingName, address, category, leaseType, pricePerMonth,
          landlordJson, zone, availableDuringBreaks, breakTypes, description,
          eventTag, startDate, endDate, JSON.stringify(toListingDetails(req.body))]
      );

      const [row] = await query<ListingRow>(`${LISTING_SELECT} WHERE l.id = $1`, [id]);
      if (row.user_id !== userId) {
        return res.status(409).json({ error: "Listing id already in use" });
      }
      return res.json(toListing(row));
    } catch (err) {
      console.error("POST /api/listings", err);
      return res.status(500).json({ error: "Failed to save listing" });
    }
  });

  app.delete("/api/listings/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const rows = await query("UPDATE listings SET leased = TRUE WHERE id = $1 RETURNING id", [id]);
      if (rows.length === 0) return res.status(404).json({ error: "Listing not found" });
      return res.json({ success: true });
    } catch (err) {
      console.error("DELETE /api/listings/:id", err);
      return res.status(500).json({ error: "Failed to mark listing as leased" });
    }
  });

  // ─── CRASH POSTS ─────────────────────────────────────────────────────────────

  // Active posts whose date hasn't passed; the app narrows the window further.
  app.get("/api/crash-posts", async (_req: Request, res: Response) => {
    try {
      const rows = await query<CrashPostRow>(
        `${CRASH_POST_SELECT}
         WHERE p.status = 'active' AND p.target_date >= NOW()
         ORDER BY p.created_at DESC`
      );
      return res.json(rows.map(toCrashPost));
    } catch (err) {
      console.error("GET /api/crash-posts", err);
      return res.status(500).json({ error: "Failed to fetch crash posts" });
    }
  });

  app.post("/api/crash-posts", async (req: Request, res: Response) => {
    try {
      const {
        id, userId, vibe, story = "", imageUrl = "", dates = "", targetDate,
        zone = "campustown", currency, currencyLabel = "", approxLocation = "",
      } = req.body;

      if (!id || !userId) {
        return res.status(400).json({ error: "id and userId are required" });
      }
      if (!CRASH_VIBES.includes(vibe)) {
        return res.status(400).json({ error: `vibe must be one of ${CRASH_VIBES.join(", ")}` });
      }
      if (!CRASH_CURRENCIES.includes(currency)) {
        return res.status(400).json({ error: `currency must be one of ${CRASH_CURRENCIES.join(", ")}` });
      }
      if (typeof targetDate !== "number" || !Number.isFinite(targetDate)) {
        return res.status(400).json({ error: "targetDate must be a timestamp in milliseconds" });
      }
      if (imageUrl && !isHttpUrl(imageUrl)) {
        return res.status(400).json({ error: "The photo must be uploaded (http/https URL) before posting" });
      }
      if (!(await userExists(userId))) {
        return res.status(404).json({ error: "Your profile isn't saved on the server yet" });
      }

      await query(
        `INSERT INTO crash_posts (id, user_id, vibe, story, image_url, dates, target_date,
          zone, currency, currency_label, approx_location)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (id) DO NOTHING`,
        [id, userId, vibe, story, imageUrl, dates, new Date(targetDate), zone,
          currency, currencyLabel, approxLocation]
      );

      const [row] = await query<CrashPostRow>(`${CRASH_POST_SELECT} WHERE p.id = $1`, [id]);
      if (row.user_id !== userId) {
        return res.status(409).json({ error: "Post id already in use" });
      }
      return res.json(toCrashPost(row));
    } catch (err) {
      console.error("POST /api/crash-posts", err);
      return res.status(500).json({ error: "Failed to save crash post" });
    }
  });

  // "Mark as filled": kept for history, gone from the feed.
  app.delete("/api/crash-posts/:id", async (req: Request, res: Response) => {
    try {
      const rows = await query(
        "UPDATE crash_posts SET status = 'completed' WHERE id = $1 RETURNING id",
        [req.params.id]
      );
      if (rows.length === 0) return res.status(404).json({ error: "Post not found" });
      return res.json({ success: true });
    } catch (err) {
      console.error("DELETE /api/crash-posts/:id", err);
      return res.status(500).json({ error: "Failed to mark post as filled" });
    }
  });

  // ─── STATS ───────────────────────────────────────────────────────────────────

  app.post("/api/stats/increment", async (req: Request, res: Response) => {
    try {
      const { key } = req.body;
      if (!key) return res.status(400).json({ error: "key is required" });
      await query(
        `INSERT INTO stats (key, value) VALUES ($1, 1)
         ON CONFLICT (key) DO UPDATE SET value = stats.value + 1`,
        [key]
      );
      const [row] = await query<{ value: number }>("SELECT value FROM stats WHERE key = $1", [key]);
      return res.json({ key, value: row?.value ?? 1 });
    } catch (err) {
      console.error("POST /api/stats/increment", err);
      return res.status(500).json({ error: "Failed to increment stat" });
    }
  });

  // ─── FEEDBACK ────────────────────────────────────────────────────────────────

  app.post("/api/feedback", async (req: Request, res: Response) => {
    try {
      const { userEmail, rating, issueCategory = "", issueDetail = "" } = req.body;
      if (!userEmail || !rating) {
        return res.status(400).json({ error: "userEmail and rating are required" });
      }
      await query(
        `INSERT INTO feedback (user_email, rating, issue_category, issue_detail)
         VALUES ($1, $2, $3, $4)`,
        [userEmail, rating, issueCategory, issueDetail]
      );
      return res.json({ success: true });
    } catch (err) {
      console.error("POST /api/feedback", err);
      return res.status(500).json({ error: "Failed to save feedback" });
    }
  });

  app.get("/api/feedback/summary", async (_req: Request, res: Response) => {
    try {
      const totals = await query<{ rating: string; count: string }>(
        `SELECT rating, COUNT(*) as count FROM feedback GROUP BY rating ORDER BY count DESC`
      );
      const topIssues = await query<{ issue_category: string; count: string }>(
        `SELECT issue_category, COUNT(*) as count
         FROM feedback WHERE rating = 'rescue' AND issue_category != ''
         GROUP BY issue_category ORDER BY count DESC LIMIT 5`
      );
      const recent = await query<{
        user_email: string; rating: string; issue_category: string;
        issue_detail: string; created_at: string
      }>(
        `SELECT user_email, rating, issue_category, issue_detail, created_at
         FROM feedback ORDER BY created_at DESC LIMIT 10`
      );
      const totalCount = totals.reduce((acc, r) => acc + parseInt(r.count), 0);
      return res.json({ totals, totalCount, topIssues, recent });
    } catch (err) {
      console.error("GET /api/feedback/summary", err);
      return res.status(500).json({ error: "Failed to fetch feedback summary" });
    }
  });

  // ─── ADMIN ───────────────────────────────────────────────────────────────────

  app.get("/api/admin/stats", async (_req: Request, res: Response) => {
    try {
      const [userCount] = await query<{ count: string }>("SELECT COUNT(*) as count FROM users");
      const [listingCount] = await query<{ count: string }>(
        "SELECT COUNT(*) as count FROM listings WHERE leased = FALSE"
      );
      const [leasedCount] = await query<{ count: string }>(
        "SELECT COUNT(*) as count FROM listings WHERE leased = TRUE"
      );
      const statsRows = await query<{ key: string; value: number }>("SELECT * FROM stats");
      const feedbackSummary = await query<{ rating: string; count: string }>(
        `SELECT rating, COUNT(*) as count FROM feedback GROUP BY rating`
      );
      const topIssues = await query<{ issue_category: string; count: string }>(
        `SELECT issue_category, COUNT(*) as count
         FROM feedback WHERE rating = 'rescue' AND issue_category != ''
         GROUP BY issue_category ORDER BY count DESC LIMIT 5`
      );
      const recentFeedback = await query<{
        user_email: string; rating: string; issue_category: string;
        issue_detail: string; created_at: string
      }>(
        `SELECT user_email, rating, issue_category, issue_detail, created_at
         FROM feedback ORDER BY created_at DESC LIMIT 10`
      );

      const stats = Object.fromEntries(statsRows.map(r => [r.key, r.value]));
      const totalFeedback = feedbackSummary.reduce((acc, r) => acc + parseInt(r.count), 0);

      return res.json({
        users: parseInt(userCount?.count ?? "0"),
        activeListings: parseInt(listingCount?.count ?? "0"),
        leasedListings: parseInt(leasedCount?.count ?? "0"),
        stats,
        feedback: { totals: feedbackSummary, totalCount: totalFeedback, topIssues, recent: recentFeedback },
      });
    } catch (err) {
      console.error("GET /api/admin/stats", err);
      return res.status(500).json({ error: "Failed to fetch admin stats" });
    }
  });

  // ─── CONVERSATIONS & MESSAGES ────────────────────────────────────────────────
  // Participants are users.id values. That id never changes once a row exists
  // (POST /api/users upserts by email and keeps it), and the client adopts it,
  // so it is stable per person across devices.

  app.post("/api/conversations", async (req: Request, res: Response) => {
    try {
      const { participant1Id, participant2Id, listingId = "", listingBuilding = "", listingPrice = 0 } = req.body;
      if (!participant1Id || !participant2Id) {
        return res.status(400).json({ error: "participant1Id and participant2Id are required" });
      }
      if (participant1Id === participant2Id) {
        return res.status(400).json({ error: "You can't message yourself" });
      }

      // A conversation with an id that isn't a saved profile could never be
      // read by anyone, so refuse it instead of storing messages into the void.
      const known = await query<{ id: string }>(
        "SELECT id FROM users WHERE id = ANY($1::varchar[])",
        [[participant1Id, participant2Id]]
      );
      if (!known.some(u => u.id === participant1Id)) {
        return res.status(404).json({ error: "Your profile isn't saved on the server yet" });
      }
      if (!known.some(u => u.id === participant2Id)) {
        return res.status(404).json({ error: "That person isn't on PopMatch yet" });
      }

      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      // uniq_conversations_pair_listing makes this a no-op when either side
      // already opened a conversation about this listing.
      await query(
        `INSERT INTO conversations (id, participant1_id, participant2_id, listing_id, listing_building, listing_price)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT DO NOTHING`,
        [id, participant1Id, participant2Id, listingId, listingBuilding, listingPrice]
      );

      const [conv] = await query<ConversationRow>(
        `${CONVERSATION_SELECT}
         WHERE ((c.participant1_id = $1 AND c.participant2_id = $2)
             OR (c.participant1_id = $2 AND c.participant2_id = $1))
           AND c.listing_id = $3`,
        [participant1Id, participant2Id, listingId]
      );
      return res.json(toConversation(conv, participant1Id));
    } catch (err) {
      console.error("POST /api/conversations", err);
      return res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  app.get("/api/conversations/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const rows = await query<ConversationRow>(
        `${CONVERSATION_SELECT}
         WHERE c.participant1_id = $1 OR c.participant2_id = $1
         ORDER BY COALESCE(last.created_at, c.created_at) DESC`,
        [userId]
      );
      return res.json(rows.map(row => toConversation(row, String(userId))));
    } catch (err) {
      console.error("GET /api/conversations/:userId", err);
      return res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.post("/api/messages", async (req: Request, res: Response) => {
    try {
      const { conversationId, senderId } = req.body;
      const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";
      if (!conversationId || !senderId || !content) {
        return res.status(400).json({ error: "conversationId, senderId, and content are required" });
      }

      const [conv] = await query<{ participant1_id: string; participant2_id: string }>(
        "SELECT participant1_id, participant2_id FROM conversations WHERE id = $1",
        [conversationId]
      );
      if (!conv) return res.status(404).json({ error: "Conversation not found" });
      if (senderId !== conv.participant1_id && senderId !== conv.participant2_id) {
        return res.status(403).json({ error: "Sender is not in this conversation" });
      }

      // The client sends its own id so a retry after a lost response can't
      // post the same message twice.
      const clientId = typeof req.body?.id === "string" && req.body.id ? req.body.id : null;
      const id = clientId ?? Date.now().toString() + Math.random().toString(36).substr(2, 9);
      await query(
        `INSERT INTO messages (id, conversation_id, sender_id, content)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO NOTHING`,
        [id, conversationId, senderId, content]
      );

      const [msg] = await query<MessageRow>(`${MESSAGE_SELECT} WHERE m.id = $1`, [id]);
      if (msg.conversation_id !== conversationId || msg.sender_id !== senderId) {
        return res.status(409).json({ error: "Message id already in use" });
      }
      return res.json(toChatMessage(msg));
    } catch (err) {
      console.error("POST /api/messages", err);
      return res.status(500).json({ error: "Failed to send message" });
    }
  });

  app.get("/api/messages/:conversationId", async (req: Request, res: Response) => {
    try {
      const { conversationId } = req.params;
      const rows = await query<MessageRow>(
        `${MESSAGE_SELECT}
         WHERE m.conversation_id = $1
         ORDER BY m.created_at ASC`,
        [conversationId]
      );
      return res.json(rows.map(toChatMessage));
    } catch (err) {
      console.error("GET /api/messages/:conversationId", err);
      return res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
