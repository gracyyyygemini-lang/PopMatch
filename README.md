# PopMatch

Housing for UIUC students — find roommates, sublets, and short-term space,
restricted to verified `@illinois.edu` accounts.

Students sign in with their university Microsoft account, so everyone on the
platform is a real UIUC student. No open signups.

## Stack

| Layer | What it uses |
| --- | --- |
| App | React Native + Expo Router (iOS, Android, web from one codebase) |
| Auth | Supabase Auth with Microsoft/Azure SSO through UIUC |
| Database | Supabase Postgres |
| Storage | Supabase Storage (profile pictures) |
| API | Express, talking to Postgres directly |

Supabase is the only backend. There is no Firebase and nothing Replit-specific.

## Getting started

Full walkthrough — creating the Supabase project, running the schema, and
wiring up Microsoft sign-in — lives in [`SETUP.md`](SETUP.md).

The short version:

```bash
npm install
cp .env.example .env     # then fill it in
npm run server:dev       # API on http://localhost:5000
npm run expo:dev         # app — press w for web
```

Both scripts run the same on PowerShell, macOS, and Linux.

## How sign-in works

"Continue with UIUC" sends students to the university's own Microsoft login.
The Azure app registration lives inside UIUC's tenant and is single-tenant, so
Microsoft itself turns away non-UIUC accounts before a password is ever typed.
`lib/auth.ts` checks the domain again after the fact as a second line of
defense.

An emailed 6-digit code is available as a fallback, but it is secondary and
needs custom SMTP configured to be usable beyond a couple of test messages.

## Layout

```
app/              screens and routing (expo-router)
  onboarding.tsx  sign-in and the 3-step profile setup
  (tabs)/         main app once signed in
lib/
  auth.ts         sessions, Microsoft sign-in, UIUC enforcement
  uploads.ts      avatar uploads to Supabase Storage
  supabase.ts     client
server/           Express API
  routes.ts       endpoints
  db.ts           Postgres pool
supabase/
  schema.sql      every table, index, RLS setting, and the avatars bucket
```

## Known gaps

Honest list of what is not finished:

1. **Some screens still run on demo data.** Profiles are real: onboarding and
   profile edits save to the `users` table (AsyncStorage is only a cache), and
   the swipe deck and map read other students from `GET /api/users`. Likes
   are real too: swiping right writes to the `likes` table, and a match fires
   only when the other student has liked you back (`GET /api/likes/mutual`).
   `DEMO_POSTS` and the crash posts are still hardcoded, passes and the
   match list are device-only, a like that fails to reach the server isn't
   retried, and `intent` / `vibeProfile` have no columns yet.
   `EXPO_PUBLIC_USE_MOCK_USERS=true` swaps the deck back to `MOCK_USERS`, with
   their canned "already liked you" matches, for development.
2. **RLS is on with no policies**, which denies everything by design. The
   Express layer works around this with a direct connection. Real policies are
   needed before the app could talk to Supabase directly and drop the server.
