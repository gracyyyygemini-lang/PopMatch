# PopMatch

Housing for UIUC students — find roommates, sublets, and short-term space.
Meant for `@illinois.edu` accounts only; see [Status](#status) for how far that
is actually enforced today.

## Stack

| Layer | What it uses |
| --- | --- |
| App | React Native + Expo Router (iOS, Android, web from one codebase) |
| Auth | Supabase Auth: Microsoft/Azure sign-in, or an emailed 6-digit code |
| Database | Supabase Postgres |
| Storage | Supabase Storage: `avatars` and `listing-photos` buckets |
| API | Express (`server/`), talking to Postgres directly |

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

Both scripts run the same on PowerShell, macOS, and Linux. The API server
doesn't watch files: restart it after changing anything in `server/`.

## How it fits together

- **Everything goes through Express.** The app never reads or writes tables
  with the Supabase client. Every table has RLS enabled with **no policies**,
  so the public anon key can't touch them; the server uses the direct
  database connection instead.
- **Every `/api` request is authenticated.** `apiRequest` in
  `lib/query-client.ts` sends the Supabase access token; `server/auth.ts`
  verifies it locally against the project's published signing keys and sets
  `req.caller = { email, userId }`. Routes act only as the caller — ids or
  emails in URLs and bodies never decide who is acting — and mutations check
  ownership. A 401 gets one session refresh and retry, then the app sends
  the student back to sign in. Tradeoff: a token stays valid until it expires
  (1 hour by default) even after sign-out.
- **Email is the internal key, never an API output.** `users.id` can differ
  per device until the client adopts the server's, so likes, passes, friend
  adds and vouches are stored by email. But no response contains anyone's
  email except your own profile: other students are `PublicProfile`s and are
  acted on by `users.id`, which the server resolves to an email itself.
- **The device is a cache.** AsyncStorage holds copies for first paint; the
  server's data wins on every refresh.

## Status

What's real — stored in Postgres, shared between students, and exercised
against the live database:

- **Profiles**, including `intent` and the compatibility `vibeProfile`
  (validated against a typed whitelist). Saves retry until they land.
- **Likes and mutual matching.** A match fires only when the other student
  liked you back. **Passes** are stored too and keep that student out of your
  swipe deck on every device (failed saves are queued and retried).
- **Messaging**: conversations and messages, with failed sends kept and
  retried. New messages arrive by **polling** (open chat every 3 s, inbox
  every 5 s), not push.
- **Sublet listings and Crash & Cash posts**, with photos uploaded to Supabase
  Storage (downscaled to 1600 px JPEG, written under the uploader's own folder;
  storage policies stop anyone writing to someone else's).
- **Search** on both feeds — see [Search](#search).
- **Per-user auth and authorization** on every route, and **email privacy** as
  described above. `/api/admin/stats` and `/api/feedback/summary` are limited
  to `ADMIN_EMAILS`.

What isn't:

1. **UIUC-only isn't enforced on the server.** The `@illinois.edu` check runs
   in the app: before sending an email code, and after *native* Microsoft
   sign-in (`enforceUiucDomain` in `lib/auth.ts`). Web Microsoft sign-in has no
   domain check, the email-code request can be made against Supabase
   directly, and the API accepts any valid Supabase session — `POST /api/users`
   only requires an address ending in `.edu`.
2. **RLS table policies are deliberately absent.** That's what keeps the anon
   key out, and it's why the Express layer is required: dropping it would mean
   rebuilding the auth, ownership and email-privacy rules as RLS policies.
3. **A like that fails to reach the server is dropped**, not retried — the
   swipe shows as done but no row is written. Passes and messages retry;
   likes don't yet.
4. **No list of your matches.** Mutual matches exist on the server but are
   only surfaced as the "It's a Match!" moment while swiping. The `matches`
   state in `AppContext` is a device-only record of your own likes.
5. **Friends and vouches aren't wired into the app.** The API is done
   (mutual-add: a friendship counts once both people have added each other,
   and a one-sided add is never visible), but no screen calls it. The app's
   friends list and the trust chips it drives are device-only.
6. **No goods marketplace.** The marketplace is sublets and roommate
   openings; there's no buying or selling of furniture or other items.
7. **Not deployed.** It runs locally; see SETUP → Deploying for what a host
   needs.
8. **Verified on web only.** Screens have been checked in the browser, never
   on an iOS or Android device or simulator.
9. **No automated tests.** Changes so far were checked with throwaway scripts
   against the live database, not a suite in the repo.

`EXPO_PUBLIC_USE_MOCK_USERS=true` swaps in the hardcoded `MOCK_USERS`,
`DEMO_POSTS` and demo crash posts for UI work; it's off by default and none of
that data is in Postgres.

## Search

Both feeds filter on the server: a search is the same query as the unfiltered
feed with conditions ANDed on, so it can only narrow what a student could
already see (leased listings and filled or expired crash posts never appear).

`GET /api/listings` — all params optional and combinable:

| Param | Matches |
| --- | --- |
| `q` | building name **or** address; partial, case-insensitive; `%` and `_` are literal; max 100 chars |
| `minPrice`, `maxPrice` | `price_per_month`, whole dollars, inclusive |
| `category` | exact `category` |
| `zone` | `campustown`, `north`, `south`, `urbana` or `downtown` |

`GET /api/crash-posts?q=` matches the story or the dates label ("This
weekend"), among active posts whose date hasn't passed.

Malformed or contradictory params (`maxPrice=-5`, `minPrice` above
`maxPrice`, an unknown zone) are a 400, never a silently unfiltered list.
Text matching uses `pg_trgm` GIN indexes; price has a btree index.

In the app, `searchListings` / `searchCrashPosts` (`lib/listings.ts`) back the
search fields on the marketplace and Crash & Cash. Typing is debounced 300 ms,
the price chips map to `maxPrice`/`minPrice` ("Under $700" is `maxPrice=699`),
and zone, category and the sub-filter chips still narrow the results on the
device.

## Layout

```
app/                screens and routing (expo-router)
  onboarding.tsx    sign-in and profile setup
  (tabs)/           main app once signed in
  marketplace.tsx   sublets + search
  crash-cash.tsx    Crash & Cash + search
  chat.tsx          a conversation
context/
  AppContext.tsx    app state; server data with an AsyncStorage cache
lib/
  query-client.ts   apiRequest: API URL, auth header, refresh-and-retry
  auth.ts           sessions, Microsoft / email-code sign-in
  users.ts          profiles          likes.ts     likes, passes, matches
  messages.ts       conversations     listings.ts  listings, crash posts, search
  uploads.ts        photo uploads to Supabase Storage
server/
  index.ts          Express app, CORS, static serving
  auth.ts           token verification, req.caller, admin check
  routes.ts         every endpoint and the snake_case → camelCase mappers
  db.ts             Postgres pool
supabase/
  schema.sql        tables, indexes, RLS, storage buckets and their policies
```
