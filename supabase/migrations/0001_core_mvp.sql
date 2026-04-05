-- MVP core: profiles (Firebase UID), listings, images, chat.
-- Run against your Supabase project (SQL editor or supabase db push).
-- Create Storage buckets in dashboard: listing-images, profile-images (public read).

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  firebase_uid text not null unique,
  email text not null,
  name text not null default '',
  major text not null default '',
  bio text not null default '',
  budget int not null default 800,
  gender text not null default 'nonbinary',
  gender_pref text not null default 'mixed',
  cleanliness int not null default 3,
  noise int not null default 3,
  lease_type text not null default 'full_year',
  zone text not null default 'campustown',
  landlord jsonb not null default '[]'::jsonb,
  stays_thanksgiving boolean not null default false,
  stays_spring_break boolean not null default false,
  avatar_color text not null default '#005F73',
  college text not null default '',
  organizations text[] not null default '{}',
  intent text,
  profile_image_url text,
  vibe_profile jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_email_idx on public.profiles (lower(email));

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  building_name text not null,
  address text not null default '',
  category text not null default 'semester_takeover',
  lease_type text not null default 'full_year',
  price_per_month int not null default 0,
  landlord jsonb not null default '[]'::jsonb,
  zone text not null default 'campustown',
  available_during_breaks boolean not null default false,
  break_types text[] not null default '{}',
  description text not null default '',
  leased boolean not null default false,
  extras jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists listings_owner_idx on public.listings (owner_profile_id);
create index if not exists listings_zone_idx on public.listings (zone);
create index if not exists listings_category_idx on public.listings (category);
create index if not exists listings_leased_created_idx on public.listings (leased, created_at desc);

create table if not exists public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  storage_path text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists listing_images_listing_idx on public.listing_images (listing_id, sort_order);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  participant_1_id uuid not null references public.profiles (id) on delete cascade,
  participant_2_id uuid not null references public.profiles (id) on delete cascade,
  listing_id text not null default '',
  listing_building text not null default '',
  listing_price int not null default 0,
  listing_unit_type text,
  source text,
  created_at timestamptz not null default now(),
  constraint conversations_distinct_participants check (participant_1_id <> participant_2_id)
);

create index if not exists conversations_p1_idx on public.conversations (participant_1_id);
create index if not exists conversations_p2_idx on public.conversations (participant_2_id);

create unique index if not exists conversations_pair_listing_uidx
  on public.conversations (
    least(participant_1_id, participant_2_id),
    greatest(participant_1_id, participant_2_id),
    listing_id
  );

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_profile_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);

create table if not exists public.saved_listings (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (profile_id, listing_id)
);
