-- PopMatch database schema
-- ---------------------------------------------------------------------------
-- Paste this whole file into a brand-new Supabase project:
--   Dashboard -> SQL Editor -> New query -> paste -> Run
--
-- Safe to re-run: every statement is IF NOT EXISTS / ON CONFLICT guarded.
-- ---------------------------------------------------------------------------

-- ─── Tables ─────────────────────────────────────────────────────────────────

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
);

CREATE TABLE IF NOT EXISTS friendships (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
  friend_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS vouches (
  id SERIAL PRIMARY KEY,
  voucher_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
  vouchee_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
  message TEXT DEFAULT '',
  UNIQUE (voucher_id, vouchee_id)
);

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
  start_date VARCHAR DEFAULT '',
  end_date VARCHAR DEFAULT '',
  leased BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS break_posts (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  break_type VARCHAR NOT NULL,
  role VARCHAR NOT NULL,
  price_per_week INT DEFAULT 0,
  zone VARCHAR DEFAULT 'campustown',
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feedback (
  id SERIAL PRIMARY KEY,
  user_email VARCHAR NOT NULL,
  rating VARCHAR NOT NULL,
  issue_category VARCHAR DEFAULT '',
  issue_detail TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stats (
  key VARCHAR PRIMARY KEY,
  value INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS conversations (
  id VARCHAR PRIMARY KEY,
  participant1_id VARCHAR NOT NULL,
  participant2_id VARCHAR NOT NULL,
  listing_id VARCHAR DEFAULT '',
  listing_building VARCHAR DEFAULT '',
  listing_price INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR PRIMARY KEY,
  conversation_id VARCHAR NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id VARCHAR NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- One row per swipe-right. A match is two rows pointing at each other.
-- Keyed by email (lowercased by the API) rather than users.id, because the
-- upsert in POST /api/users keeps the first id it saw for an email.
CREATE TABLE IF NOT EXISTS likes (
  id SERIAL PRIMARY KEY,
  liker_email VARCHAR NOT NULL,
  liked_email VARCHAR NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (liker_email, liked_email),
  CHECK (liker_email <> liked_email)
);

-- ─── Indexes ────────────────────────────────────────────────────────────────
-- The app filters listings constantly; these keep the marketplace fast as the
-- table grows past a few hundred rows.

CREATE INDEX IF NOT EXISTS idx_listings_category ON listings (category);
CREATE INDEX IF NOT EXISTS idx_listings_zone ON listings (zone);
CREATE INDEX IF NOT EXISTS idx_listings_leased ON listings (leased);
CREATE INDEX IF NOT EXISTS idx_listings_user ON listings (user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_p1 ON conversations (participant1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_p2 ON conversations (participant2_id);
-- One conversation per pair per listing, whichever participant opens it first.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_conversations_pair_listing ON conversations (
  LEAST(participant1_id, participant2_id), GREATEST(participant1_id, participant2_id), listing_id
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
-- The UNIQUE constraint already indexes (liker_email, liked_email); this one
-- covers the reverse lookup "who liked me".
CREATE INDEX IF NOT EXISTS idx_likes_liked ON likes (liked_email);

-- ─── Seed rows ──────────────────────────────────────────────────────────────

INSERT INTO stats (key, value) VALUES ('successful_subleases', 0)
  ON CONFLICT (key) DO NOTHING;

INSERT INTO stats (key, value) VALUES ('total_matches', 0)
  ON CONFLICT (key) DO NOTHING;

-- ─── Row level security ─────────────────────────────────────────────────────
-- These tables are reached through the Express API using the connection
-- string, which bypasses RLS. Enabling it anyway means that if the anon key is
-- ever pointed straight at these tables, nothing leaks by default.
--
-- If you later drop the Express server and query Supabase directly from the
-- app, replace these with real per-user policies first, or the app will read
-- nothing.

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouches ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE break_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- ─── Avatar storage ─────────────────────────────────────────────────────────
-- Creates the public "avatars" bucket that lib/uploads.ts writes to, so you
-- don't have to click through Storage in the dashboard.

-- Wrapped in a guard so this file also runs against a plain Postgres database
-- (local development, CI), where the storage schema does not exist.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'storage') THEN
    RAISE NOTICE 'No storage schema here — skipping avatar bucket setup.';
    RETURN;
  END IF;

  INSERT INTO storage.buckets (id, name, public)
  VALUES ('avatars', 'avatars', TRUE)
  ON CONFLICT (id) DO UPDATE SET public = TRUE;

  DROP POLICY IF EXISTS "Avatar images are publicly readable" ON storage.objects;
  CREATE POLICY "Avatar images are publicly readable"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

  DROP POLICY IF EXISTS "Signed-in users can upload avatars" ON storage.objects;
  CREATE POLICY "Signed-in users can upload avatars"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'avatars');

  DROP POLICY IF EXISTS "Signed-in users can replace avatars" ON storage.objects;
  CREATE POLICY "Signed-in users can replace avatars"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'avatars');

  RAISE NOTICE 'Avatar bucket ready.';
END
$$;
