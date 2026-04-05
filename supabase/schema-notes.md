# Supabase schema (MVP)

## Tables

- **profiles** — One row per Firebase user (`firebase_uid` unique). Application user id for listings and chat is `profiles.id` (UUID).
- **listings** — Sublease / roommate posts. Extended UI fields live in `extras` (JSON). `owner_profile_id` references `profiles`.
- **listing_images** — Rows point at Storage paths under the `listing-images` bucket.
- **conversations** / **messages** — Chat threads; participants are profile UUIDs. `listing_id` is a string (listing UUID or synthetic ids like `match_*`).
- **saved_listings** — Optional join for future “saved” UI.

## Storage

Create these buckets in the Supabase dashboard (Storage):

| Bucket            | Suggested policy                                      |
|-------------------|-------------------------------------------------------|
| `listing-images`  | Public read; uploads via signed URLs from your API    |
| `profile-images`  | Public read; same pattern for onboarding avatars     |

The Express server uses the **service role** key only on the backend; clients never see it. Clients upload using **signed upload URLs** from `POST /api/listings/:id/images/sign` (and the profile image flow can mirror that against `profile-images`).

## Migrations

Apply `migrations/0001_core_mvp.sql` in the Supabase SQL editor, or use the Supabase CLI linked to this project.

## Auth

Firebase Auth is the identity source. Supabase Auth is not used for login. The API verifies `Authorization: Bearer <Firebase ID token>` and maps `uid` → `profiles.firebase_uid`.
