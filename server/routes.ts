import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import type { JWTVerifyGetKey } from "jose";
import { query } from "./db";
import { adminClient, deleteAccount } from "./account";
import {
  callerUserId, namesSomeoneElse, requireAdmin, requireAuth, supabaseSigningKeys,
} from "./auth";

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
      profile_image VARCHAR DEFAULT '',
      intent VARCHAR,
      vibe_profile JSONB
    )
  `);

  await query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image VARCHAR DEFAULT ''
  `).catch(() => {});
  // What the student came for (Intent) and their compatibility answers
  // (VibeProfile). vibe_profile only ever holds what toVibeProfile allows.
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS intent VARCHAR`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS vibe_profile JSONB`);

  // One row per block, keyed by email like likes. Blocking is mutual in
  // effect: either row hides the two people from each other everywhere.
  await query(`
    CREATE TABLE IF NOT EXISTS blocks (
      id SERIAL PRIMARY KEY,
      blocker_email VARCHAR NOT NULL,
      blocked_email VARCHAR NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (blocker_email, blocked_email),
      CHECK (blocker_email <> blocked_email)
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON blocks (blocked_email)`);
  await query(`ALTER TABLE blocks ENABLE ROW LEVEL SECURITY`);

  await query(`
    CREATE TABLE IF NOT EXISTS vouches (
      id SERIAL PRIMARY KEY,
      voucher_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
      vouchee_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
      message TEXT DEFAULT '',
      UNIQUE(voucher_id, vouchee_id)
    )
  `);
  // Vouches are keyed by email like friend_adds (voucher_id / vouchee_id are
  // legacy and no longer written). Existing rows get their emails filled in.
  await query(`ALTER TABLE vouches ADD COLUMN IF NOT EXISTS voucher_email VARCHAR`);
  await query(`ALTER TABLE vouches ADD COLUMN IF NOT EXISTS vouchee_email VARCHAR`);
  await query(`
    UPDATE vouches v SET voucher_email = lower(u.email)
    FROM users u WHERE v.voucher_email IS NULL AND u.id = v.voucher_id
  `);
  await query(`
    UPDATE vouches v SET vouchee_email = lower(u.email)
    FROM users u WHERE v.vouchee_email IS NULL AND u.id = v.vouchee_id
  `);
  await query(`CREATE UNIQUE INDEX IF NOT EXISTS uniq_vouches_emails ON vouches (voucher_email, vouchee_email)`);
  await query(`ALTER TABLE vouches ENABLE ROW LEVEL SECURITY`);

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

  // Search: price ranges use a plain index; partial, case-insensitive text
  // matches (ILIKE '%green%') need trigram GIN indexes. Supabase keeps
  // extensions in the `extensions` schema; plain Postgres uses the default.
  await query(`CREATE INDEX IF NOT EXISTS idx_listings_price ON listings (price_per_month)`);
  try {
    await query(`CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions`)
      .catch(() => query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`));
    for (const [name, table, column] of [
      ["idx_listings_building_trgm", "listings", "building_name"],
      ["idx_listings_address_trgm", "listings", "address"],
      ["idx_crash_posts_story_trgm", "crash_posts", "story"],
      ["idx_crash_posts_dates_trgm", "crash_posts", "dates"],
    ]) {
      await query(`CREATE INDEX IF NOT EXISTS ${name} ON ${table} USING gin (${column} gin_trgm_ops)`);
    }
  } catch (err) {
    // Search still works without these, just by scanning.
    console.warn("pg_trgm unavailable; text search will be unindexed:", err);
  }
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

  // One row per swipe-left, keyed by email like likes (users.id can differ
  // per device until the client adopts the server's).
  await query(`
    CREATE TABLE IF NOT EXISTS passes (
      id SERIAL PRIMARY KEY,
      passer_email VARCHAR NOT NULL,
      passed_email VARCHAR NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (passer_email, passed_email),
      CHECK (passer_email <> passed_email)
    )
  `);
  await query(`ALTER TABLE passes ENABLE ROW LEVEL SECURITY`);

  // One row per "add friend". A friendship is two rows pointing at each other
  // (see confirmedFriendsOf); one row alone is a pending add nobody else sees.
  await query(`
    CREATE TABLE IF NOT EXISTS friend_adds (
      id SERIAL PRIMARY KEY,
      adder_email VARCHAR NOT NULL,
      added_email VARCHAR NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (adder_email, added_email),
      CHECK (adder_email <> added_email)
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_friend_adds_added ON friend_adds (added_email)`);
  await query(`ALTER TABLE friend_adds ENABLE ROW LEVEL SECURITY`);

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

type MutualLikeRow = { user_id: string; matched_at: Date | string };

/**
 * The match became mutual when the later of the two likes landed. Identified
 * by users.id: likes are stored by email, but no email but your own ever
 * leaves the server.
 */
function toMutualMatch(row: MutualLikeRow) {
  return {
    userId: row.user_id,
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
  intent: string | null; vibe_profile: unknown;
};

const INTENTS = ["host", "joiner", "co_seeker", "sublessor", "sublessee"];

/**
 * SQL that's true when either of two people (lowercased-email expressions)
 * has blocked the other. Every read that shows one student to another, and
 * every way of contacting someone, is gated on NOT this.
 */
const blockedBetween = (a: string, b: string) => `EXISTS (
  SELECT 1 FROM blocks bl
  WHERE (bl.blocker_email = ${a} AND bl.blocked_email = ${b})
     OR (bl.blocker_email = ${b} AND bl.blocked_email = ${a}))`;

/** Whether the caller and the student with users.id `otherId` are blocked either way. */
async function isBlockedWith(callerEmail: string, otherId: string): Promise<boolean> {
  const [row] = await query<{ blocked: boolean }>(
    `SELECT EXISTS (SELECT 1 FROM users ou WHERE ou.id = $2 AND ${blockedBetween("$1", "lower(ou.email)")}) AS blocked`,
    [callerEmail, otherId]
  );
  return !!row?.blocked;
}

/**
 * APP REVIEW ONLY. REVIEW_EMAIL is the one non-.edu address allowed a
 * profile: the App Review demo account (lib/auth.ts, isReviewEmail). It
 * must match the app's EXPO_PUBLIC_REVIEW_EMAIL. Unset means none.
 */
function isReviewEmail(email: string): boolean {
  const review = (process.env.REVIEW_EMAIL ?? "").trim().toLowerCase();
  return review !== "" && email === review;
}

/** A string from `allowed`, or undefined. */
const oneOf = (allowed: readonly string[]) => (v: unknown) =>
  typeof v === "string" && allowed.includes(v) ? v : undefined;
/** Free text, trimmed and capped so a profile can't carry a novel. */
const shortText = (max: number) => (v: unknown) =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined;
const shortTexts = (v: unknown) =>
  Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string" && !!x.trim()).map(x => x.trim().slice(0, 40)).slice(0, 20)
    : undefined;

/**
 * The only fields stored in users.vibe_profile, each with the check its value
 * must pass (mirrors VibeProfile in context/AppContext.tsx). Like
 * LISTING_DETAILS, this list is the schema: anything else is dropped.
 */
const VIBE_PROFILE = {
  identity: oneOf(["girl", "guy", "nonbinary"]),
  lookingFor: oneOf(["girls", "guys", "coed"]),
  starSign: oneOf(["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio",
    "sagittarius", "capricorn", "aquarius", "pisces"]),
  mbti: oneOf(["INTJ", "INTP", "ENTJ", "ENTP", "INFJ", "INFP", "ENFJ", "ENFP", "ISTJ", "ISFJ",
    "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP", "idk"]),
  year: oneOf(["freshman", "sophomore", "junior", "senior", "grad_phd"]),
  greekLife: oneOf(["independent", "sorority", "fraternity", "prof_frat"]),
  vices: shortTexts,
  pets: shortTexts,
  sleep: shortText(40),
  alarms: shortText(40),
  cleanlinessVibe: shortText(40),
  groceries: shortText(40),
  guests: shortText(40),
  prompt: shortText(120),
  promptAnswer: shortText(500),
};

type VibeProfile = {
  [K in keyof typeof VIBE_PROFILE]?: NonNullable<ReturnType<(typeof VIBE_PROFILE)[K]>>;
};

/**
 * Used both ways: on a request body before saving and on the column when
 * reading. identity and lookingFor are required by the app's type, so a
 * profile without valid ones isn't a vibe profile at all (undefined).
 */
function toVibeProfile(source: unknown): VibeProfile | undefined {
  if (!source || typeof source !== "object" || Array.isArray(source)) return undefined;
  const record = source as Record<string, unknown>;
  const vibe: Record<string, unknown> = {};
  for (const [key, check] of Object.entries(VIBE_PROFILE)) {
    const value = check(record[key]);
    if (value !== undefined) vibe[key] = value;
  }
  if (!vibe.identity || !vibe.lookingFor) return undefined;
  vibe.vices ??= [];
  vibe.pets ??= [];
  return vibe as VibeProfile;
}

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
 * `email` is included only on the caller's own profile: anyone else's would
 * let any signed-in student harvest addresses and test who has an account.
 */
function toUserProfile(row: UserRow, callerEmail: string) {
  const vibeProfile = toVibeProfile(row.vibe_profile);
  const own = row.email.trim().toLowerCase() === callerEmail;
  return {
    id: row.id,
    name: row.name,
    ...(own ? { email: row.email } : {}),
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
    ...(row.intent && INTENTS.includes(row.intent) ? { intent: row.intent } : {}),
    ...(vibeProfile ? { vibeProfile } : {}),
  };
}

type ConversationRow = {
  id: string; participant1_id: string; participant2_id: string;
  listing_id: string | null; listing_building: string | null; listing_price: number | null;
  created_at: Date | string;
  participant1_name: string | null; participant1_avatar: string | null;
  participant1_image: string | null;
  participant2_name: string | null; participant2_avatar: string | null;
  participant2_image: string | null;
  last_message: string | null; last_message_at: Date | string | null;
};

/** Every conversations endpoint selects this, so each can describe the other person. */
const CONVERSATION_SELECT = `
  SELECT c.*,
    u1.name AS participant1_name, u1.avatar_color AS participant1_avatar,
    u1.profile_image AS participant1_image,
    u2.name AS participant2_name, u2.avatar_color AS participant2_avatar,
    u2.profile_image AS participant2_image,
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
    ? { id: row.participant2_id, name: row.participant2_name, avatar: row.participant2_avatar, image: row.participant2_image }
    : { id: row.participant1_id, name: row.participant1_name, avatar: row.participant1_avatar, image: row.participant1_image };
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
    otherUserId: other.id,
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
  user_name: string | null; user_avatar: string | null;
};

/**
 * Poster's name and color come from users, so they can't drift from the
 * profile. Their email is never selected: posts identify people by userId.
 */
const LISTING_SELECT = `
  SELECT l.*, u.name AS user_name, u.avatar_color AS user_avatar
  FROM listings l
  LEFT JOIN users u ON l.user_id = u.id`;

const toIso = (value: Date | string | null) => (value ? new Date(value).toISOString() : undefined);

/** Same idea as toUserProfile: the SubleasePost shape the app uses, in camelCase. */
function toListing(row: ListingRow) {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name ?? "",
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
  user_name: string | null; user_avatar: string | null;
};

const CRASH_POST_SELECT = `
  SELECT p.*, u.name AS user_name, u.avatar_color AS user_avatar
  FROM crash_posts p
  LEFT JOIN users u ON p.user_id = u.id`;

type PersonRow = {
  id: string; name: string; avatar_color: string | null; major?: string | null;
  college?: string | null; organizations?: string[] | null;
};

/** Another student as the friends list and trust info show them: no email. */
function toPerson(row: PersonRow) {
  return {
    id: row.id,
    name: row.name,
    avatarColor: row.avatar_color ?? "#005F73",
    ...(row.major != null ? { major: row.major } : {}),
    ...(row.college != null ? { college: row.college } : {}),
    ...(row.organizations != null ? { organizations: row.organizations } : {}),
  };
}

/** The email behind a users.id, for acting on someone the client knows only by id. */
async function emailOfUser(id: unknown): Promise<string | null> {
  if (typeof id !== "string" || !id) return null;
  const [row] = await query<{ email: string }>("SELECT lower(email) AS email FROM users WHERE id = $1", [id]);
  return row?.email ?? null;
}

const ZONES = ["campustown", "north", "south", "urbana", "downtown"];
const SEARCH_MAX_LENGTH = 100;

/** `%text%` for ILIKE, with the user's own % and _ matched literally. */
const containsPattern = (text: string) => `%${text.replace(/[\\%_]/g, ch => "\\" + ch)}%`;

/** A non-negative whole-dollar amount from a query param; null if absent, NaN if malformed. */
function priceParam(value: unknown): number | null {
  if (value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : NaN;
}

/**
 * The WHERE clause for listing searches. It always starts from the same
 * condition as the unfiltered list (not leased) and only ever ANDs more
 * conditions onto it, so a search can narrow what the marketplace shows but
 * never reveal anything it wouldn't.
 */
function listingFilter(q: Request["query"], callerEmail: string): { where: string; params: unknown[] } | { error: string } {
  // Never listings by someone the caller blocked or who blocked the caller.
  const params: unknown[] = [callerEmail];
  const conditions = [
    "l.leased = FALSE",
    `NOT EXISTS (SELECT 1 FROM users bu WHERE bu.id = l.user_id AND ${blockedBetween("$1", "lower(bu.email)")})`,
  ];
  const add = (sql: (n: string) => string, value: unknown) => {
    params.push(value);
    conditions.push(sql(`$${params.length}`));
  };

  if (typeof q.category === "string" && q.category) add(n => `l.category = ${n}`, q.category);
  if (typeof q.zone === "string" && q.zone) {
    if (!ZONES.includes(q.zone)) return { error: `zone must be one of ${ZONES.join(", ")}` };
    add(n => `l.zone = ${n}`, q.zone);
  }
  const text = typeof q.q === "string" ? q.q.trim() : "";
  if (text) {
    if (text.length > SEARCH_MAX_LENGTH) return { error: `q can be at most ${SEARCH_MAX_LENGTH} characters` };
    add(n => `(l.building_name ILIKE ${n} ESCAPE '\\' OR l.address ILIKE ${n} ESCAPE '\\')`, containsPattern(text));
  }
  const min = priceParam(q.minPrice);
  const max = priceParam(q.maxPrice);
  if (Number.isNaN(min) || Number.isNaN(max)) return { error: "minPrice and maxPrice must be whole dollars, 0 or more" };
  if (min !== null && max !== null && min > max) return { error: "minPrice can't be more than maxPrice" };
  if (min !== null) add(n => `l.price_per_month >= ${n}`, min);
  if (max !== null) add(n => `l.price_per_month <= ${n}`, max);

  return { where: conditions.join(" AND "), params };
}

const INCREMENTABLE_STATS = ["successful_subleases", "total_matches"];

const CRASH_VIBES = ["sos", "offering"];
const CRASH_CURRENCIES = ["cash", "boba", "lion_cover", "food", "favor"];

/** Timestamps are TIMESTAMPTZ in the table and epoch ms in the app. */
function toCrashPost(row: CrashPostRow) {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name ?? "",
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

/**
 * Runs an UPDATE that only matches the caller's own row (`id = $1 AND
 * user_id = $2`). Ownership is part of the WHERE clause, so there's no gap
 * between checking and changing; the follow-up lookup only decides which
 * error to report.
 */
async function updateOwnRow(
  updateSql: string, existsSql: string, id: string, userId: string,
): Promise<"updated" | "missing" | "not_owner"> {
  const updated = await query(updateSql, [id, userId]);
  if (updated.length > 0) return "updated";
  const exists = await query(existsSql, [id]);
  return exists.length > 0 ? "not_owner" : "missing";
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


export interface RouteOptions {
  /** Where token signing keys come from; defaults to the Supabase project's JWKS. */
  getKey?: JWTVerifyGetKey;
}

export async function registerRoutes(app: Express, options: RouteOptions = {}): Promise<Server> {
  await initDb();

  // ─── AUTH ────────────────────────────────────────────────────────────────────
  // Every /api route below acts as req.caller, the account behind a verified
  // Supabase access token. Ids and emails in URLs and bodies are never
  // trusted to say who is calling: where a route still accepts one for the
  // caller, anything but the caller's own is a 403 (namesSomeoneElse).

  const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL (or EXPO_PUBLIC_SUPABASE_URL) must be set to verify sign-ins.");
  }
  app.use("/api", requireAuth({
    getKey: options.getKey ?? supabaseSigningKeys(supabaseUrl),
    issuer: new URL("/auth/v1", supabaseUrl).href,
  }));

  // ─── USERS ───────────────────────────────────────────────────────────────────

  // Creates or edits the caller's own profile; there is no way to name another.
  app.post("/api/users", async (req: Request, res: Response) => {
    try {
      const caller = req.caller!;
      const {
        id, name, email: claimedEmail, major = "", bio = "", budget = 800,
        gender = "nonbinary", genderPref = "mixed", cleanliness = 3,
        noise = 3, leaseType = "full_year", zone = "campustown",
        landlords = ["other"], staysThanksgiving = false, staysSpringBreak = false,
        avatarColor = "#005F73", college = "", organizations = [], profileImage = "",
        intent: rawIntent, vibeProfile: rawVibe,
      } = req.body;

      if (namesSomeoneElse(claimedEmail, caller.email, true)) {
        return res.status(403).json({ error: "You can only save your own profile" });
      }
      const email = caller.email;
      if (!id || !name) {
        return res.status(400).json({ error: "id and name are required" });
      }
      if (!email.endsWith(".edu") && !isReviewEmail(email)) {
        return res.status(400).json({ error: "Must use a .edu email address" });
      }
      if (rawIntent !== undefined && rawIntent !== null && !INTENTS.includes(rawIntent)) {
        return res.status(400).json({ error: `intent must be one of ${INTENTS.join(", ")}` });
      }
      // null = not sent: the stored values are kept (COALESCE below), so a
      // device that hasn't filled these in yet can't wipe them.
      const intent: string | null = rawIntent ?? null;
      const vibeProfile = rawVibe === undefined || rawVibe === null ? undefined : toVibeProfile(rawVibe);
      if (rawVibe !== undefined && rawVibe !== null && !vibeProfile) {
        return res.status(400).json({ error: "vibeProfile needs a valid identity and lookingFor" });
      }

      const landlordJson = JSON.stringify(Array.isArray(landlords) ? landlords : [landlords]);
      try {
        await query(
          `INSERT INTO users (id, name, email, major, bio, budget, gender, gender_pref,
            cleanliness, noise, lease_type, zone, landlord, stays_thanksgiving,
            stays_spring_break, avatar_color, college, organizations, profile_image,
            intent, vibe_profile)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
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
             profile_image = EXCLUDED.profile_image,
             intent = COALESCE(EXCLUDED.intent, users.intent),
             vibe_profile = COALESCE(EXCLUDED.vibe_profile, users.vibe_profile)`,
          [id, name, email, major, bio, budget, gender, genderPref, cleanliness,
            noise, leaseType, zone, landlordJson, staysThanksgiving, staysSpringBreak,
            avatarColor, college, organizations, profileImage,
            intent, vibeProfile ? JSON.stringify(vibeProfile) : null]
        );
      } catch (err) {
        // A new profile whose id is already someone else's: never overwrite theirs.
        if ((err as { code?: string }).code === "23505") {
          return res.status(409).json({ error: "That profile id is taken; generate a new one" });
        }
        throw err;
      }

      // On conflict the row keeps its original id, so the client must adopt
      // the id returned here rather than the one it generated.
      const [user] = await query<UserRow>("SELECT * FROM users WHERE email = $1", [email]);
      return res.json(toUserProfile(user, caller.email));
    } catch (err) {
      console.error("POST /api/users", err);
      return res.status(500).json({ error: "Failed to save user" });
    }
  });

  // Deletes the caller's account: photos, every row about them, and their
  // sign-in (server/account.ts). Needs SUPABASE_SERVICE_ROLE_KEY; without it
  // this refuses up front rather than deleting half and calling it done.
  app.delete("/api/account", async (req: Request, res: Response) => {
    const caller = req.caller!;
    const admin = adminClient(supabaseUrl);
    if (!admin) {
      console.error("DELETE /api/account: SUPABASE_SERVICE_ROLE_KEY is not set");
      return res.status(503).json({ error: "Account deletion isn't available right now. Nothing was deleted. Please try again later." });
    }
    if (!caller.authId) {
      return res.status(401).json({ error: "Your session isn't valid. Sign in again.", code: "invalid_token" });
    }
    try {
      const done = await deleteAccount(admin, { authId: caller.authId, email: caller.email, userId: caller.userId });
      console.log(`DELETE /api/account: deleted ${done.rows} rows and ${done.photos} photos`);
      return res.json({ deleted: true });
    } catch (err) {
      console.error("DELETE /api/account", err);
      return res.status(500).json({ error: "Your account couldn't be fully deleted. Please try again — anything already removed stays removed." });
    }
  });

  // The caller's own profile only (the app syncs it on launch). Looking up
  // anyone else by email would tell you whether they have an account, so any
  // other address is a 403 — the same 403 whether or not it exists.
  app.get("/api/users/by-email/:email", async (req: Request, res: Response) => {
    try {
      const email = req.caller!.email;
      if (String(req.params.email).trim().toLowerCase() !== email) {
        return res.status(403).json({ error: "You can only look up your own profile" });
      }
      const [user] = await query<UserRow>("SELECT * FROM users WHERE lower(email) = $1", [email]);
      if (!user) return res.status(404).json({ error: "User not found" });
      return res.json(toUserProfile(user, email));
    } catch (err) {
      console.error("GET /api/users/by-email", err);
      return res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Everyone but the caller. ?deck=true (the swipe deck only) also leaves
  // out anyone the caller passed on: a pass means "not a roommate match for
  // me", so the map and friend lookups still see them. (?exclude= is ignored;
  // the caller is always left out.)
  app.get("/api/users", async (req: Request, res: Response) => {
    try {
      const deck = req.query.deck === "true";
      const rows = await query<UserRow>(
        `SELECT * FROM users u
         WHERE lower(u.email) <> $1
           AND NOT ${blockedBetween("$1", "lower(u.email)")}
           ${deck ? `AND NOT EXISTS (
             SELECT 1 FROM passes p WHERE p.passer_email = $1 AND p.passed_email = lower(u.email)
           )` : ""}
         ORDER BY u.name`,
        [req.caller!.email]
      );
      return res.json(rows.map(row => toUserProfile(row, req.caller!.email)));
    } catch (err) {
      console.error("GET /api/users", err);
      return res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // ─── LIKES ───────────────────────────────────────────────────────────────────

  // The caller likes likedUserId. Stored by email (see likes), resolved here
  // so the client never needs anyone else's address.
  app.post("/api/likes", async (req: Request, res: Response) => {
    try {
      const likerEmail = req.caller!.email;
      if (namesSomeoneElse(req.body?.likerEmail, likerEmail, true)) {
        return res.status(403).json({ error: "You can only like as yourself" });
      }
      if (!req.body?.likedUserId) {
        return res.status(400).json({ error: "likedUserId is required" });
      }
      const likedEmail = await emailOfUser(req.body.likedUserId);
      // Blocked either way looks the same as not existing.
      if (!likedEmail || await isBlockedWith(likerEmail, String(req.body.likedUserId))) {
        return res.status(404).json({ error: "Student not found" });
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

  // The caller passes on passedUserId; GET /api/users?deck=true stops
  // returning them.
  app.post("/api/passes", async (req: Request, res: Response) => {
    try {
      const passerEmail = req.caller!.email;
      if (namesSomeoneElse(req.body?.passerEmail, passerEmail, true)) {
        return res.status(403).json({ error: "You can only pass as yourself" });
      }
      if (!req.body?.passedUserId) {
        return res.status(400).json({ error: "passedUserId is required" });
      }
      const passedEmail = await emailOfUser(req.body.passedUserId);
      if (!passedEmail) {
        return res.status(404).json({ error: "Student not found" });
      }
      if (passerEmail === passedEmail) {
        return res.status(400).json({ error: "You can't pass on yourself" });
      }

      await query(
        `INSERT INTO passes (passer_email, passed_email) VALUES ($1, $2)
         ON CONFLICT (passer_email, passed_email) DO NOTHING`,
        [passerEmail, passedEmail]
      );
      return res.json({ ok: true });
    } catch (err) {
      console.error("POST /api/passes", err);
      return res.status(500).json({ error: "Failed to save pass" });
    }
  });

  // Everyone the caller liked who liked them back. :email must be the caller.
  app.get("/api/likes/mutual/:email", async (req: Request, res: Response) => {
    try {
      const email = req.caller!.email;
      if (namesSomeoneElse(req.params.email, email, true)) {
        return res.status(403).json({ error: "You can only see your own matches" });
      }
      const rows = await query<MutualLikeRow>(
        `SELECT u.id AS user_id,
                GREATEST(mine.created_at, theirs.created_at) AS matched_at
         FROM likes mine
         JOIN likes theirs
           ON theirs.liker_email = mine.liked_email
          AND theirs.liked_email = mine.liker_email
         JOIN users u ON lower(u.email) = mine.liked_email
         WHERE mine.liker_email = $1
           AND NOT ${blockedBetween("$1", "mine.liked_email")}
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
  // Mutual-add, like likes becoming a match: POST records only the caller's
  // side (friend_adds), and a friendship exists once both people have added
  // each other. Every read below goes through confirmedFriendsOf, so a
  // one-sided add never shows anywhere — not in friend lists, mutual-friend
  // counts or vouches — and adding never reveals whether the other person
  // added you or is even on PopMatch. Responses name people by id, never email.

  /** SQL for the emails confirmed (two-sided) friends with the email in `param`. */
  const confirmedFriendsOf = (param: string) => `
    SELECT mine.added_email FROM friend_adds mine
    JOIN friend_adds theirs
      ON theirs.adder_email = mine.added_email AND theirs.added_email = mine.adder_email
    WHERE mine.adder_email = ${param}
      AND NOT ${blockedBetween("mine.adder_email", "mine.added_email")}`;

  // The caller's confirmed friends. :email must be the caller.
  app.get("/api/friends/:email", async (req: Request, res: Response) => {
    try {
      if (namesSomeoneElse(req.params.email, req.caller!.email, true)) {
        return res.status(403).json({ error: "You can only see your own friends" });
      }
      const rows = await query<PersonRow>(
        `SELECT u.id, u.name, u.avatar_color, u.major, u.college, u.organizations
         FROM users u
         WHERE lower(u.email) IN (${confirmedFriendsOf("$1")})
         ORDER BY u.name`,
        [req.caller!.email]
      );
      return res.json(rows.map(toPerson));
    } catch (err) {
      console.error("GET /api/friends", err);
      return res.status(500).json({ error: "Failed to fetch friends" });
    }
  });

  // Records the caller's side. Adding by typed email is the intended flow,
  // so this one route still takes an email. The response is the same whether
  // or not the other person has added back or has an account, so it can't be
  // used to probe either; the friends list shows the result.
  app.post("/api/friends", async (req: Request, res: Response) => {
    try {
      const adderEmail = req.caller!.email;
      if (namesSomeoneElse(req.body?.userEmail, adderEmail, true)) {
        return res.status(403).json({ error: "You can only add friends for yourself" });
      }
      const addedEmail = typeof req.body?.friendEmail === "string" ? req.body.friendEmail.trim().toLowerCase() : "";
      if (!addedEmail) {
        return res.status(400).json({ error: "friendEmail is required" });
      }
      if (addedEmail === adderEmail) {
        return res.status(400).json({ error: "Cannot friend yourself" });
      }

      // Blocked either way: record nothing, but answer the same, so this
      // can't be used to find out about a block.
      const [{ blocked }] = await query<{ blocked: boolean }>(
        `SELECT ${blockedBetween("$1", "$2")} AS blocked`, [adderEmail, addedEmail]
      );
      if (!blocked) {
        await query(
          `INSERT INTO friend_adds (adder_email, added_email) VALUES ($1, $2)
           ON CONFLICT (adder_email, added_email) DO NOTHING`,
          [adderEmail, addedEmail]
        );
      }
      return res.json({ success: true });
    } catch (err) {
      console.error("POST /api/friends", err);
      return res.status(500).json({ error: "Failed to add friend" });
    }
  });

  // Withdraws the caller's side; the friendship stops counting for both.
  // friendUserId for a friend from the list, or friendEmail to cancel an add
  // the caller typed themselves. Always the same response.
  app.delete("/api/friends", async (req: Request, res: Response) => {
    try {
      const adderEmail = req.caller!.email;
      if (namesSomeoneElse(req.body?.userEmail, adderEmail, true)) {
        return res.status(403).json({ error: "You can only remove your own friends" });
      }
      const addedEmail = req.body?.friendUserId
        ? await emailOfUser(req.body.friendUserId)
        : String(req.body?.friendEmail ?? "").trim().toLowerCase();
      if (addedEmail) {
        await query(
          "DELETE FROM friend_adds WHERE adder_email = $1 AND added_email = $2",
          [adderEmail, addedEmail]
        );
      }
      return res.json({ success: true });
    } catch (err) {
      console.error("DELETE /api/friends", err);
      return res.status(500).json({ error: "Failed to remove friend" });
    }
  });

  // ─── BLOCKS ──────────────────────────────────────────────────────────────────
  // The caller blocks userId. From then on neither sees the other anywhere
  // (blockedBetween) and neither can message the other. The blocked student
  // is never told.

  app.post("/api/blocks", async (req: Request, res: Response) => {
    try {
      const blockerEmail = req.caller!.email;
      const blockedEmail = await emailOfUser(req.body?.userId);
      if (!blockedEmail) return res.status(404).json({ error: "Student not found" });
      if (blockedEmail === blockerEmail) return res.status(400).json({ error: "You can't block yourself" });
      await query(
        `INSERT INTO blocks (blocker_email, blocked_email) VALUES ($1, $2)
         ON CONFLICT (blocker_email, blocked_email) DO NOTHING`,
        [blockerEmail, blockedEmail]
      );
      return res.json({ blocked: true });
    } catch (err) {
      console.error("POST /api/blocks", err);
      return res.status(500).json({ error: "Failed to block" });
    }
  });

  // Undoes the caller's own block. A block the other person made stays.
  app.delete("/api/blocks", async (req: Request, res: Response) => {
    try {
      const blockedEmail = await emailOfUser(req.body?.userId);
      if (blockedEmail) {
        await query("DELETE FROM blocks WHERE blocker_email = $1 AND blocked_email = $2", [req.caller!.email, blockedEmail]);
      }
      return res.json({ success: true });
    } catch (err) {
      console.error("DELETE /api/blocks", err);
      return res.status(500).json({ error: "Failed to unblock" });
    }
  });

  // Who the caller has blocked, newest first (for unblocking). Never who
  // blocked the caller.
  app.get("/api/blocks", async (req: Request, res: Response) => {
    try {
      const rows = await query<PersonRow>(
        `SELECT u.id, u.name, u.avatar_color FROM blocks b
         JOIN users u ON lower(u.email) = b.blocked_email
         WHERE b.blocker_email = $1
         ORDER BY b.created_at DESC`,
        [req.caller!.email]
      );
      return res.json(rows.map(toPerson));
    } catch (err) {
      console.error("GET /api/blocks", err);
      return res.status(500).json({ error: "Failed to fetch blocked students" });
    }
  });

  // ─── VOUCHES ─────────────────────────────────────────────────────────────────

  // The caller vouches for a confirmed friend, named by voucheeUserId. An
  // unknown id gets the same 403 as a non-friend.
  app.post("/api/vouches", async (req: Request, res: Response) => {
    try {
      const voucherEmail = req.caller!.email;
      if (namesSomeoneElse(req.body?.voucherEmail, voucherEmail, true)) {
        return res.status(403).json({ error: "You can only vouch as yourself" });
      }
      const { message = "" } = req.body;
      if (!req.body?.voucheeUserId) {
        return res.status(400).json({ error: "voucheeUserId is required" });
      }
      const voucheeEmail = await emailOfUser(req.body.voucheeUserId);

      const [friends] = await query<{ yes: boolean }>(
        `SELECT $2::varchar IS NOT NULL AND $2 IN (${confirmedFriendsOf("$1")}) AS yes`,
        [voucherEmail, voucheeEmail]
      );
      if (!friends.yes) {
        return res.status(403).json({ error: "You can only vouch for friends who've added you back" });
      }

      await query(
        `INSERT INTO vouches (voucher_email, vouchee_email, message) VALUES ($1, $2, $3)
         ON CONFLICT (voucher_email, vouchee_email) DO UPDATE SET message = EXCLUDED.message`,
        [voucherEmail, voucheeEmail, message]
      );
      return res.json({ success: true });
    } catch (err) {
      console.error("POST /api/vouches", err);
      return res.status(500).json({ error: "Failed to vouch" });
    }
  });

  // Withdraws the caller's own vouch for voucheeUserId.
  app.delete("/api/vouches", async (req: Request, res: Response) => {
    try {
      if (namesSomeoneElse(req.body?.voucherEmail, req.caller!.email, true)) {
        return res.status(403).json({ error: "You can only withdraw your own vouch" });
      }
      const voucheeEmail = await emailOfUser(req.body?.voucheeUserId);
      if (voucheeEmail) {
        await query(
          "DELETE FROM vouches WHERE voucher_email = $1 AND vouchee_email = $2",
          [req.caller!.email, voucheeEmail]
        );
      }
      return res.json({ success: true });
    } catch (err) {
      console.error("DELETE /api/vouches", err);
      return res.status(500).json({ error: "Failed to remove vouch" });
    }
  });

  // ─── TRUST INFO ───────────────────────────────────────────────────────────────

  // How the caller is connected to the student :userId, counting only
  // confirmed friendships. Always about the caller, so it can't reveal anyone
  // else's friend graph; people come back as id + name, never email.
  app.get("/api/trust/:userId", async (req: Request, res: Response) => {
    try {
      const viewerEmail = req.caller!.email;
      const [target] = await query<{ email: string; organizations: string[] | null }>(
        "SELECT lower(email) AS email, organizations FROM users WHERE id = $1",
        [String(req.params.userId)]
      );

      if (target?.email === viewerEmail) {
        return res.json({ degree: 1, mutualFriends: [], vouchedBy: [], sharedOrgs: [] });
      }
      // An unknown id runs the same queries as a stranger and finds nothing.
      const targetEmail = target?.email ?? "";
      // Blocked either way: the same answer as for a stranger.
      if (targetEmail && await isBlockedWith(viewerEmail, String(req.params.userId))) {
        return res.json({ degree: null, mutualFriends: [], vouchedBy: [], sharedOrgs: [] });
      }

      const [viewer] = await query<{ organizations: string[] | null }>(
        "SELECT organizations FROM users WHERE lower(email) = $1", [viewerEmail]
      );
      const sharedOrgs = (viewer?.organizations || []).filter(
        (org: string) => (target?.organizations || []).includes(org)
      );
      // A vouch counts only while the voucher is still the target's confirmed
      // friend, so a lapsed friendship can't keep vouching.
      const vouchesFrom = async (voucherFilter: string) =>
        (await query<PersonRow>(
          `SELECT u.id, u.name, u.avatar_color FROM vouches v
           JOIN users u ON lower(u.email) = v.voucher_email
           WHERE v.vouchee_email = $1
             AND v.voucher_email IN (${confirmedFriendsOf("$1")})
             ${voucherFilter}`,
          voucherFilter ? [targetEmail, viewerEmail] : [targetEmail]
        )).map(row => ({ id: row.id, name: row.name }));

      const [direct] = await query<{ friends: boolean }>(
        `SELECT $2 IN (${confirmedFriendsOf("$1")}) AS friends`,
        [viewerEmail, targetEmail]
      );
      if (direct.friends) {
        return res.json({ degree: 1, mutualFriends: [], vouchedBy: await vouchesFrom(""), sharedOrgs });
      }

      const mutualFriends = (await query<PersonRow>(
        `SELECT u.id, u.name, u.avatar_color
         FROM users u
         WHERE lower(u.email) IN (${confirmedFriendsOf("$1")})
           AND lower(u.email) IN (${confirmedFriendsOf("$2")})`,
        [viewerEmail, targetEmail]
      )).map(toPerson);

      // Second degree: only vouches from people who are friends with both.
      const vouchedBy = mutualFriends.length > 0
        ? await vouchesFrom(`AND v.voucher_email IN (${confirmedFriendsOf("$2")})`)
        : [];

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

  // Optional, combinable filters: ?q= (building name or address, partial,
  // case-insensitive), ?minPrice= / ?maxPrice= (per month, inclusive),
  // ?category=, ?zone=. Filtering happens here rather than in the app so a
  // search is the same query as the list with conditions added (see
  // listingFilter), and keeps working once listings outgrow one download.
  app.get("/api/listings", async (req: Request, res: Response) => {
    try {
      const filter = listingFilter(req.query, req.caller!.email);
      if ("error" in filter) return res.status(400).json({ error: filter.error });
      const rows = await query<ListingRow>(
        `${LISTING_SELECT}
         WHERE ${filter.where}
         ORDER BY l.created_at DESC`,
        filter.params
      );
      return res.json(rows.map(toListing));
    } catch (err) {
      console.error("GET /api/listings", err);
      return res.status(500).json({ error: "Failed to fetch listings" });
    }
  });

  // The caller posts a listing as themselves.
  app.post("/api/listings", async (req: Request, res: Response) => {
    try {
      if (namesSomeoneElse(req.body?.userId, req.caller!.userId ?? "")) {
        return res.status(403).json({ error: "You can only post listings as yourself" });
      }
      const userId = callerUserId(req, res);
      if (!userId) return;
      const {
        id, buildingName, address = "", category = "semester_takeover",
        leaseType = "full_year", pricePerMonth = 0, landlords = ["other"],
        zone = "campustown", availableDuringBreaks = false, breakTypes = [],
        description = "", eventTag = "", moveInDate, moveOutDate,
      } = req.body;

      if (!id || !buildingName) {
        return res.status(400).json({ error: "id and buildingName are required" });
      }
      // price_per_month is an INT: 850.5 would fail the insert as a bare 500.
      if (!Number.isInteger(Number(pricePerMonth)) || Number(pricePerMonth) < 0) {
        return res.status(400).json({ error: "pricePerMonth must be whole dollars, 0 or more" });
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

  // Marks the caller's own listing leased.
  app.delete("/api/listings/:id", async (req: Request, res: Response) => {
    try {
      const userId = callerUserId(req, res);
      if (!userId) return;
      const outcome = await updateOwnRow(
        "UPDATE listings SET leased = TRUE WHERE id = $1 AND user_id = $2 RETURNING id",
        "SELECT 1 FROM listings WHERE id = $1",
        String(req.params.id), userId
      );
      if (outcome === "missing") return res.status(404).json({ error: "Listing not found" });
      if (outcome === "not_owner") return res.status(403).json({ error: "You can only change your own listings" });
      // Counted here, not by a separate client call, so it can't be inflated.
      await query(
        `INSERT INTO stats (key, value) VALUES ('successful_subleases', 1)
         ON CONFLICT (key) DO UPDATE SET value = stats.value + 1`
      ).catch(err => console.error("DELETE /api/listings/:id: counting the sublease", err));
      return res.json({ success: true });
    } catch (err) {
      console.error("DELETE /api/listings/:id", err);
      return res.status(500).json({ error: "Failed to mark listing as leased" });
    }
  });

  // ─── CRASH POSTS ─────────────────────────────────────────────────────────────

  // Active posts whose date hasn't passed; the app narrows the window further.
  // ?q= matches the story or the dates label (partial, case-insensitive),
  // ANDed onto the same conditions as the unfiltered feed.
  app.get("/api/crash-posts", async (req: Request, res: Response) => {
    try {
      const text = typeof req.query.q === "string" ? req.query.q.trim() : "";
      if (text.length > SEARCH_MAX_LENGTH) {
        return res.status(400).json({ error: `q can be at most ${SEARCH_MAX_LENGTH} characters` });
      }
      const rows = await query<CrashPostRow>(
        `${CRASH_POST_SELECT}
         WHERE p.status = 'active' AND p.target_date >= NOW()
           AND NOT EXISTS (SELECT 1 FROM users bu WHERE bu.id = p.user_id AND ${blockedBetween("$1", "lower(bu.email)")})
           ${text ? `AND (p.story ILIKE $2 ESCAPE '\\' OR p.dates ILIKE $2 ESCAPE '\\')` : ""}
         ORDER BY p.created_at DESC`,
        text ? [req.caller!.email, containsPattern(text)] : [req.caller!.email]
      );
      return res.json(rows.map(toCrashPost));
    } catch (err) {
      console.error("GET /api/crash-posts", err);
      return res.status(500).json({ error: "Failed to fetch crash posts" });
    }
  });

  // The caller posts as themselves.
  app.post("/api/crash-posts", async (req: Request, res: Response) => {
    try {
      if (namesSomeoneElse(req.body?.userId, req.caller!.userId ?? "")) {
        return res.status(403).json({ error: "You can only post as yourself" });
      }
      const userId = callerUserId(req, res);
      if (!userId) return;
      const {
        id, vibe, story = "", imageUrl = "", dates = "", targetDate,
        zone = "campustown", currency, currencyLabel = "", approxLocation = "",
      } = req.body;

      if (!id) {
        return res.status(400).json({ error: "id is required" });
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

  // "Mark as filled" on the caller's own post: kept for history, gone from the feed.
  app.delete("/api/crash-posts/:id", async (req: Request, res: Response) => {
    try {
      const userId = callerUserId(req, res);
      if (!userId) return;
      const outcome = await updateOwnRow(
        "UPDATE crash_posts SET status = 'completed' WHERE id = $1 AND user_id = $2 RETURNING id",
        "SELECT 1 FROM crash_posts WHERE id = $1",
        String(req.params.id), userId
      );
      if (outcome === "missing") return res.status(404).json({ error: "Post not found" });
      if (outcome === "not_owner") return res.status(403).json({ error: "You can only change your own posts" });
      return res.json({ success: true });
    } catch (err) {
      console.error("DELETE /api/crash-posts/:id", err);
      return res.status(500).json({ error: "Failed to mark post as filled" });
    }
  });

  // ─── STATS ───────────────────────────────────────────────────────────────────

  // Only the counters the app actually bumps; anything else would let a
  // signed-in student create or inflate arbitrary admin stats.
  app.post("/api/stats/increment", async (req: Request, res: Response) => {
    try {
      const { key } = req.body;
      if (!INCREMENTABLE_STATS.includes(key)) {
        return res.status(400).json({ error: `key must be one of ${INCREMENTABLE_STATS.join(", ")}` });
      }
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

  // Feedback is always filed under the caller's email.
  app.post("/api/feedback", async (req: Request, res: Response) => {
    try {
      const userEmail = req.caller!.email;
      if (namesSomeoneElse(req.body?.userEmail, userEmail, true)) {
        return res.status(403).json({ error: "You can only send feedback as yourself" });
      }
      const { rating, issueCategory = "", issueDetail = "" } = req.body;
      if (!rating) {
        return res.status(400).json({ error: "rating is required" });
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

  // ADMIN_EMAILS only: includes other students' emails and complaints.
  app.get("/api/feedback/summary", requireAdmin, async (_req: Request, res: Response) => {
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

  // ADMIN_EMAILS only.
  app.get("/api/admin/stats", requireAdmin, async (_req: Request, res: Response) => {
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
  // so it is stable per person across devices. Only the two participants can
  // see or add to a conversation.

  /** The conversation's participants, or null if it doesn't exist. */
  async function participantsOf(conversationId: string) {
    const [conv] = await query<{ participant1_id: string; participant2_id: string }>(
      "SELECT participant1_id, participant2_id FROM conversations WHERE id = $1",
      [conversationId]
    );
    return conv ? [conv.participant1_id, conv.participant2_id] : null;
  }

  // The caller opens a conversation with participant2Id (the other person).
  app.post("/api/conversations", async (req: Request, res: Response) => {
    try {
      if (namesSomeoneElse(req.body?.participant1Id, req.caller!.userId ?? "")) {
        return res.status(403).json({ error: "You can only start conversations as yourself" });
      }
      const participant1Id = callerUserId(req, res);
      if (!participant1Id) return;
      const { participant2Id, listingId = "", listingBuilding = "", listingPrice = 0 } = req.body;
      if (!participant2Id) {
        return res.status(400).json({ error: "participant2Id is required" });
      }
      if (participant1Id === participant2Id) {
        return res.status(400).json({ error: "You can't message yourself" });
      }

      // A conversation with an id that isn't a saved profile could never be
      // read by anyone, so refuse it instead of storing messages into the void.
      const known = await query<{ id: string }>("SELECT id FROM users WHERE id = $1", [participant2Id]);
      if (known.length === 0) {
        return res.status(404).json({ error: "That person isn't on PopMatch yet" });
      }
      if (await isBlockedWith(req.caller!.email, participant2Id)) {
        return res.status(403).json({ error: "You can't message this person" });
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

  // The caller's conversations. :userId must be the caller.
  app.get("/api/conversations/:userId", async (req: Request, res: Response) => {
    try {
      if (namesSomeoneElse(req.params.userId, req.caller!.userId ?? "")) {
        return res.status(403).json({ error: "You can only see your own conversations" });
      }
      const userId = callerUserId(req, res);
      if (!userId) return;
      const rows = await query<ConversationRow>(
        `${CONVERSATION_SELECT}
         WHERE (c.participant1_id = $1 OR c.participant2_id = $1)
           AND NOT EXISTS (
             SELECT 1 FROM users ou
             WHERE ou.id = CASE WHEN c.participant1_id = $1 THEN c.participant2_id ELSE c.participant1_id END
               AND ${blockedBetween("$2", "lower(ou.email)")})
         ORDER BY COALESCE(last.created_at, c.created_at) DESC`,
        [userId, req.caller!.email]
      );
      return res.json(rows.map(row => toConversation(row, userId)));
    } catch (err) {
      console.error("GET /api/conversations/:userId", err);
      return res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // The caller sends a message; the sender is always the caller.
  app.post("/api/messages", async (req: Request, res: Response) => {
    try {
      if (namesSomeoneElse(req.body?.senderId, req.caller!.userId ?? "")) {
        return res.status(403).json({ error: "You can only send messages as yourself" });
      }
      const senderId = callerUserId(req, res);
      if (!senderId) return;
      const { conversationId } = req.body;
      const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";
      if (!conversationId || !content) {
        return res.status(400).json({ error: "conversationId and content are required" });
      }

      const participants = await participantsOf(conversationId);
      if (!participants) return res.status(404).json({ error: "Conversation not found" });
      if (!participants.includes(senderId)) {
        return res.status(403).json({ error: "You're not in this conversation" });
      }
      const otherId = participants.find(id => id !== senderId) ?? senderId;
      if (await isBlockedWith(req.caller!.email, otherId)) {
        return res.status(403).json({ error: "You can't message this person" });
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

  // Only the two participants may read a conversation.
  app.get("/api/messages/:conversationId", async (req: Request, res: Response) => {
    try {
      const userId = callerUserId(req, res);
      if (!userId) return;
      const conversationId = String(req.params.conversationId);
      const participants = await participantsOf(conversationId);
      if (!participants) return res.status(404).json({ error: "Conversation not found" });
      if (!participants.includes(userId)) {
        return res.status(403).json({ error: "You're not in this conversation" });
      }
      const otherId = participants.find(id => id !== userId) ?? userId;
      if (await isBlockedWith(req.caller!.email, otherId)) {
        return res.status(403).json({ error: "This conversation isn't available" });
      }
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
