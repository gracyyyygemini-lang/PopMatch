# Backend integration (Firebase Auth + Supabase)

This app keeps **Firebase Authentication** as the source of login identity. The Express server verifies Firebase **ID tokens** from the `Authorization: Bearer <token>` header and reads/writes MVP data in **Supabase** (Postgres + Storage) using the **service role** key on the server only.

## One-time Supabase setup

1. Create a Supabase project.
2. Run the SQL in `supabase/migrations/0001_core_mvp.sql` (SQL editor or Supabase CLI).
3. In **Storage**, create public buckets:
   - `listing-images`
   - `profile-images`
4. Allow **public read** on those buckets (or signed URLs only for reads if you prefer; the app expects public URLs for listing and profile images as returned by the API).

## Server environment

See `.env.example`. Required for the MVP API surface:

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server only; never ship to the client) |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Full JSON of the Firebase Admin service account |

When `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set, the server registers MVP routes and **stops** registering the legacy Postgres handlers for `/api/listings` and chat (`/api/conversations`, `/api/messages`). Other routes (OTP, friends, admin, stats) still use `DATABASE_URL` if configured.

## App environment

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_DOMAIN` | API host (already used by `getApiUrl()`) |
| `EXPO_PUBLIC_BACKEND_MVP` | Set to `1` to call MVP endpoints from onboarding, marketplace, post-sublease, and chat |

With `EXPO_PUBLIC_BACKEND_MVP=0` (default), the client behaves as before (local AsyncStorage + demo data), except unchanged screens.

## Main API routes (MVP)

- `POST /api/me/bootstrap` — create profile row from Firebase `uid` (requires Bearer token).
- `GET /api/me/profile` / `PUT /api/me/profile` — read/update profile.
- `POST /api/me/profile-image/sign` + `POST /api/me/profile-image/commit` — Supabase Storage upload for avatar.
- `GET /api/listings` — browse (no auth).
- `POST /api/listings` — create listing (auth).
- `DELETE /api/listings/:id` — mark leased (auth, owner).
- `POST /api/listings/:id/images/sign` + `POST /api/listings/:id/images/commit` — listing photos.
- `PATCH /api/listings/:id` — merge `extras` JSON (e.g. `floorPlanPath`).
- `GET /api/conversations` — inbox for current user (auth).
- `POST /api/conversations` — body uses `participant2Id` (profile UUID), listing metadata, optional `source`.
- `GET /api/messages/:conversationId` / `POST /api/messages` — load/send messages (auth).

## Local development

1. Apply the Supabase migration and configure buckets.
2. Set server env vars and run `npm run server:dev`.
3. Point `EXPO_PUBLIC_DOMAIN` at your server and set `EXPO_PUBLIC_BACKEND_MVP=1`.
4. Run the Expo app; sign in with Firebase (UIUC/Microsoft as configured).

## Identity and IDs

- Each user’s primary app id for listings and chat is `profiles.id` (UUID), returned as `UserProfile.id` after bootstrap/save.
- Firebase `uid` is stored as `profiles.firebase_uid` and is not used as the public `userId` on listings.

If you previously used random string ids in AsyncStorage, enable the backend flag and complete onboarding once so the profile UUID is synced.
