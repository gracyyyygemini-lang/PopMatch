# PopMatch — UIUC Student Housing Matchmaker

## Overview
PopMatch is a UIUC student-first housing matchmaker and sublease mobile app (Expo/React Native).
@illinois.edu email gate enforced on onboarding, with 6-digit PIN email verification. PostgreSQL backend for social trust graph (friendships, vouches, feedback).

## Architecture

### Stack
- **Frontend**: Expo Router (React Native + Web), TypeScript
- **Backend**: Express + TypeScript (port 5000) + PostgreSQL (via pg Pool)
- **State**: React Context + AsyncStorage (persistent) + PostgreSQL (social trust)
- **Fonts**: Nunito (400, 600, 700, 800) via @expo-google-fonts/nunito
- **Icons**: @expo/vector-icons (Ionicons only — NO emojis anywhere)
- **Language**: English only — no language system, no translations

### Design System ("Ponyo-Sea")
- `constants/colors.ts` — single source of truth
- Foam: #F8F9F3, Teal/Ocean: #005F73, Ponyo Orange: #FF6B4E, Bucket Yellow: #FFD966
- Charcoal: #1A2E35, Card: #FFFFFF, Border: #DDE0D8

## Navigation

### Entry
- `app/index.tsx` — Redirects to /onboarding or /(tabs) based on AsyncStorage `@popmatch_onboarded`
- `app/onboarding.tsx` — 5-step onboarding with @illinois.edu PIN verification + Ponyo fish animation

### Tabs (app/(tabs)/)
- `index.tsx` — Browse: 4 UIUC housing category cards + Matchmaker/Breaks shortcuts + trust icon strip
- `matches.tsx` — My Circle: social graph (Friends sub-tab) + roommate matches (Matches sub-tab)
- `map.tsx` — PopMap: zone guide grid + listing pins
- `profile.tsx` — User profile, stats, 5-star feedback section, Sign Out, Reset All Data

### Stack Screens
- `app/matchmaker.tsx` — Year-Long swipe discovery (PanResponder, weighted score)
- `app/marketplace.tsx` — Sublease listings with 4 UIUC category filters, trust line, date ranges
- `app/post-sublease.tsx` — Post a sublease form (move-in/out dates required, landlord warnings)
- `app/breaks.tsx` — Break Stay bulletin board (sticky-note grid)

## Features

### Email PIN Verification (Onboarding Step 0)
- Phase A: name + @illinois.edu email → "Send Code" → POST /api/send-pin
- Phase B: 6-digit PIN entry (large digit cells, hidden TextInput trick) → POST /api/verify-pin
- PIN stored in-memory Map with 10-minute expiry
- Without SENDGRID_API_KEY: PIN logged to server console (dev mode)
- With SENDGRID_API_KEY env secret: real email sent via SendGrid REST API
- Sender must be verified at noreply@popmatch.app in SendGrid dashboard

### 4-Category Home Screen (Browse Tab)
- **Summer Only**: May 15 – Aug 10
- **The August Gap**: 1–2 weeks in August
- **Semester / Full Year**: Fall, Spring, or 12-month takeovers
- **Short-Term & Events**: 1–14 days for events, graduation, etc.
- Each category card navigates to marketplace pre-filtered on that category
- Trust icon strip below features (Verified, Connections, Vouched, Landlord alerts)

### Social Trust Graph (My Circle Tab)
- Two sub-tabs: "Friends" and "Matches"
- Add friends by @illinois.edu email — looks up in MOCK_USERS + backend
- **Trust terminology (NO degree numbers)**:
  - Direct connections → "Friend" (green people icon)
  - Mutual friends → "N mutual friends: Name1, Name2" (actual first names)
  - Vouched → "Vouched by Name" (gold star)
  - Shared org → "Both in [Org]"
- Vouch toggle: star button on each friend card
- Suggested connections: People You May Know section with mutual info
- Trust info appears inline on marketplace listing cards and match cards

### Trust Logic (getTrustInfo in AppContext)
- `isFriend: boolean` — in friends list
- `mutualFriendNames: string[]` — first names of shared connections (via org overlap in mock data)
- `vouchedByFriend: string | null` — name of friend who vouched
- `sharedOrg: string | null` — org both user and target share

### Marketplace with Category Filters
- Filter chips: All, Summer Only, August Gap, Semester/Full Year, Short-Term
- Category pre-selected via `?category=` URL param from home screen
- Move-in → move-out date range shown prominently below price ("Aug 20 → Dec 15")
- "Break OK" tag (not "Break-Friendly")
- Trust inline line under poster name: "Friend · Vouched" or "2 mutual: Mei, Jake"

### Sublease Post Form
- Required fields: building name, price, move-in date, move-out date
- Optional: address, description
- Landlord picker with real-time warnings (info/warn/danger)
- Break availability toggle

### In-App Feedback (Profile Tab)
- 5-star tap-to-rate row
- Optional message (max 300 chars)
- POST /api/feedback → PostgreSQL `feedback` table
- Thank-you state for 3 seconds after submit, then form resets
- Requires logged-in user (hidden if no profile)

### Sign Out & Reset (Profile Tab)
- Sign Out: clears @popmatch_user + @popmatch_onboarded only
- Reset All Data: clears all 9 AsyncStorage keys; navigates to onboarding

### Year-Long Matchmaker
- Swipe cards with PanResponder
- Weighted Euclidean distance: Budget 35%, Cleanliness 25%, Noise 20%, Zone 20%
- Gender filter, compatibility score badge
- Liked users stored in AsyncStorage (@popmatch_liked)

### Break Stay Board
- Sticky-note grid (2-col) with colorful note backgrounds
- Filter by break type: Thanksgiving, Spring Break, Winter Break
- Post modal: role (offering/seeking), break period, price, zone, description

### PopMap
- Zone Guide tab: interactive 5-zone grid with pros/cons detail cards
- All Listings tab: expandable listing pins with poster info
- Zones: Campustown, North Campus, South Campus, Urbana, Downtown

### Roommate Matches (My Circle → Matches sub-tab)
- Expanded landlord alerts per landlord
- Roommate agreement modal generator (PDF-style, downloadable)
- Compatibility score colored badges (green ≥80%, ocean ≥60%, gray below)
- Trust info inline on match card

## Database Schema (PostgreSQL)
Tables: users, friendships (bidirectional), vouches, listings, break_posts, feedback

## API Routes (server/routes.ts)
- POST /api/send-pin — validate @illinois.edu, generate 6-digit PIN, store with 10-min expiry, send email
- POST /api/verify-pin — check PIN against stored value, return { valid: boolean, reason? }
- POST /api/users — upsert user profile
- GET /api/users/by-email/:email — find user
- GET/POST/DELETE /api/friends — manage friendships (bidirectional)
- GET /api/friends/:email — list friends
- POST/DELETE /api/vouches — manage vouches
- GET /api/trust/:viewerEmail/:targetEmail — compute trust info (SQL mutual-friend query)
- GET/POST /api/listings — housing listings
- POST /api/feedback — save user feedback (rating + message)

## State (context/AppContext.tsx)
- Exported types: UserProfile, SubleasePost (with moveInDate/moveOutDate), BreakPost, MatchRecord, FriendRecord, TrustInfo
- TrustInfo: { isFriend, mutualFriendNames: string[], vouchedByFriend, sharedOrg }
- Exported function: computeScore(a, b) — standalone, importable directly
- Persisted: @popmatch_user, _onboarded, _matches, _liked, _passed, _scam, _subleases, _breaks, _friends
- Demo seed data: 6 subleases (with moveInDate/moveOutDate), 3 break posts, 8 mock users (with college/organizations)
- getTrustInfo(): client-side trust computation using MOCK_USERS org overlap

## Workflows
- `Start Backend`: `npm run server:dev` → Express on port 5000
- `Start Frontend`: `npm run expo:dev` → Expo Metro on port 8081

## Components
- `components/ScamBanner.tsx` — dismissable scam warning (orange, left border)
- `components/ErrorBoundary.tsx` — crash boundary with reloadAppAsync

## Onboarding Animation
- `PonyoProgress` component: fish swims across wave dots toward a home bucket
- `fishPx`: direct pixel Animated.Value, JS-driven spring (no interpolation)
- `bobY`: separate nested Animated.View, JS-driven timing loop
- Nested animated views prevent driver mixing (the original iOS crash fix)

## Environment Secrets
- `SESSION_SECRET` — already set
- `SENDGRID_API_KEY` — optional; without it, PINs are logged to server console in dev mode

## Notes
- react-native-maps@1.18.0 installed but NOT used (zone map is card-based grid)
- Language system fully removed — no tr(), no LANGUAGES, no @popmatch_language
- No emojis — @expo/vector-icons (Ionicons) throughout
- Web platform: 67px top / 34px bottom inset handling on all screens
- `Colors.errorRed` = #E53935, `Colors.alertRed` = #C62828 (both valid, used in different contexts)
