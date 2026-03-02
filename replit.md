# PopMatch — UIUC Student Housing Matchmaker

## Overview
PopMatch is a UIUC student-first housing matchmaker and sublease mobile app (Expo/React Native).
@illinois.edu email gate enforced on onboarding. PostgreSQL backend for social trust graph (friendships, vouches).

## Architecture

### Stack
- **Frontend**: Expo Router (React Native + Web), TypeScript
- **Backend**: Express + TypeScript (port 5000) + PostgreSQL (via pg Pool)
- **State**: React Context + AsyncStorage (persistent) + PostgreSQL (social trust)
- **Fonts**: Nunito (400, 600, 700, 800) via @expo-google-fonts/nunito
- **Icons**: @expo/vector-icons (Ionicons only — NO emojis anywhere)

### Design System ("Ponyo-Sea")
- `constants/colors.ts` — single source of truth
- Foam: #F8F9F3, Teal/Ocean: #005F73, Ponyo Orange: #FF6B4E, Bucket Yellow: #FFD966
- Charcoal: #2C2416, Card: #FFFFFF, Border: #DDD0B5

## Navigation

### Entry
- `app/index.tsx` — Redirects to /onboarding or /(tabs) based on AsyncStorage
- `app/onboarding.tsx` — 5-step onboarding with @illinois.edu gate + Ponyo fish animation

### Tabs (app/(tabs)/)
- `index.tsx` — Browse: 4 UIUC housing category cards + Matchmaker/Breaks shortcuts
- `matches.tsx` — My Circle: social trust graph (sub-tab) + roommate matches (sub-tab)
- `map.tsx` — PopMap: zone guide grid + listing pins
- `profile.tsx` — User profile, stats, Sign Out, Reset All Data

### Stack Screens
- `app/matchmaker.tsx` — Year-Long swipe discovery (PanResponder, weighted score)
- `app/marketplace.tsx` — Sublease listings browse with 4 UIUC category filters + trust badges
- `app/post-sublease.tsx` — Post a sublease form with landlord warnings
- `app/breaks.tsx` — Break Stay bulletin board (sticky-note grid)

## Features

### 4-Category Home Screen (Browse Tab)
- **Summer Only**: Mid-May to Early August (May 15 – Aug 10)
- **The August Gap**: 1–2 week temporary stays in August
- **Semester / Full Year**: Fall (Aug–Dec), Spring (Jan–May), or 12-month takeovers
- **Short-Term & Events**: 1–14 days for Moms Weekend, Thanksgiving, graduation stays
- Each category card navigates to marketplace pre-filtered on that category

### Social Trust Graph (My Circle Tab)
- Two sub-tabs: "My Circle" (social graph) and "Matches" (roommate matches)
- Add friends by @illinois.edu email — looks up in mock users + backend
- **Trust badges**: 1st Degree (direct friend, green), 2nd Degree (mutual friend, teal), Vouched (orange star), Shared Org (gold)
- Vouch toggle: star button on each friend card
- Suggested connections shown below your circle
- Trust badges appear on **marketplace listing cards** and **roommate match cards**
- Organizations system: Gies, Grainger, LAS, FAA, Media, iSchool + RSOs (ACM, BSA, etc.)
- Friends stored in AsyncStorage (@popmatch_friends) + PostgreSQL for persistence

### Trust Badge Logic (getTrustInfo in AppContext)
1. Email in friends list → degree: 1 (1st Degree Friend)
2. Friend shares an org with target → degree: 2 (2nd Degree Connection)
3. Current user shares org with target (no friend) → sharedOrg shown
4. Vouched by you → vouchedByFriend shown

### Marketplace with Category Filters
- Filter chips: All, Summer Only, August Gap, Semester/Full Year, Short-Term & Events
- Category pre-selected via `?category=` URL param from home screen
- Category badges on listing cards (colored tags matching category)
- Trust badges on poster row (1st Degree, 2nd Degree, Vouched, Shared Org)
- Date ranges shown on August Gap and Short-Term listings

### Sign Out (Profile Tab)
- Sign Out: clears only session (@popmatch_user + @popmatch_onboarded), keeps all other data
- Reset All Data: clears everything including friends, matches, subleases
- Sign-out icon in header + full-width button at bottom of profile

### Year-Long Matchmaker
- Swipe cards with PanResponder
- Weighted Euclidean distance: Budget 35%, Cleanliness 25%, Noise 20%, Zone 20%
- Gender filter, compatibility score badge
- Liked users stored via AsyncStorage

### Sublease Marketplace
- Browse with 4 UIUC category filter chips
- Demo seed data: 6 listings across all 4 categories
- Break-friendly tag, landlord badge, poster info, trust badges

### Post Sublease Form
- Building name, address, lease type, price, landlord, zone
- Break availability toggle + break type selection
- Real-time landlord warnings (info/warn/danger levels):
  - JSM: $50 fee + Renter's Insurance
  - UGroup: $125 fee + 72hr Move-In Report
  - Bailey: walk in TOGETHER warning
  - American Campus: up to $600 Relet fee flash alert

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
- Roommate agreement modal generator
- Compatibility score colored badges
- Trust badges on each match card (degree + vouch)

## Database Schema (PostgreSQL)
Tables: users, friendships (bidirectional), vouches, listings, break_posts

## API Routes (server/routes.ts)
- POST /api/users — upsert user profile
- GET /api/users/by-email/:email — find user
- GET/POST/DELETE /api/friends/:email — manage friendships (bidirectional)
- POST/DELETE /api/vouches — manage vouches
- GET /api/trust/:viewerEmail/:targetEmail — compute trust info (SQL mutual-friend query)
- GET/POST /api/listings — housing listings

## State (context/AppContext.tsx)
- UserProfile, SubleasePost, BreakPost, MatchRecord, FriendRecord, TrustInfo
- Persisted: @popmatch_user, _onboarded, _matches, _liked, _passed, _scam, _subleases, _breaks, _friends
- Demo seed data for subleases (6) and break posts (3) and mock users (8, with college/organizations)
- computeScore(): weighted Euclidean distance formula
- getTrustInfo(): client-side trust computation from friends list

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

## Notes
- react-native-maps@1.18.0 installed but NOT used (zone map is card-based grid)
- @illinois.edu validation is frontend-only (no real auth backend)
- No emojis — @expo/vector-icons (Ionicons) throughout
- Web platform: 67px top / 34px bottom inset handling on all screens
