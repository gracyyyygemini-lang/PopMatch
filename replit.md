# PopMatch — UIUC Student Housing Matchmaker

## Overview
PopMatch is a UIUC student-first housing matchmaker and sublease mobile app (Expo/React Native).
@illinois.edu email gate enforced via real OTP verification. PostgreSQL backend for social trust graph (friendships, vouches), OTP codes, feedback, and stats.

## Architecture

### Stack
- **Frontend**: Expo Router (React Native + Web), TypeScript
- **Backend**: Express + TypeScript (port 5000) + PostgreSQL (via pg Pool)
- **State**: React Context + AsyncStorage (persistent) + PostgreSQL (social trust)
- **Fonts**: Nunito (400, 600, 700, 800) via @expo-google-fonts/nunito
- **Icons**: @expo/vector-icons (Ionicons only — NO emojis in UI)
- **Email**: Resend (`resend` npm package) — falls back to console.log if RESEND_API_KEY not set

### Design System ("Ponyo-Sea")
- `constants/colors.ts` — single source of truth
- Foam: #F8F9F3, Teal/Ocean: #005F73, Ponyo Orange: #FF6B4E, Bucket Yellow: #FFD966
- Charcoal: #1A2E35, Card: #FFFFFF, Border: #DDE0D8

## Navigation

### Entry
- `app/index.tsx` — Redirects to /onboarding or /(tabs) based on AsyncStorage
- `app/onboarding.tsx` — Email OTP step (Step 0) → 5-step onboarding with Ponyo fish animation
- `app/admin.tsx` — Hidden admin dashboard (5-tap on profile version label)

### Tabs (app/(tabs)/)
- `index.tsx` — Browse: 4 UIUC housing category cards + Matchmaker/Breaks shortcuts
- `matches.tsx` — My Circle: social trust graph (sub-tab) + roommate matches (sub-tab)
- `chats.tsx` — In-app chat list: all conversations sorted by most recent message
- `map.tsx` — PopMap: zone guide grid + listing pins
- `profile.tsx` — User profile, stats, Sign Out, Reset All Data; 5-tap version label → /admin

### Stack Screens
- `app/matchmaker.tsx` — Path A/B selection; Path A: swipe deck (auto-creates chat on like + match overlay); Path B: group profiles + Request to Join
- `app/marketplace.tsx` — Sublease listings with FacePile trust + Mark as Leased + Message Subleaser button
- `app/chat/[id].tsx` — Individual chat screen: inverted FlatList, 3s polling, listing context banner
- `app/create-group.tsx` — Create group profile (building, zone, rent, rooms, description)
- `app/post-sublease.tsx` — Post a sublease form with landlord warnings
- `app/breaks.tsx` — Break Stay bulletin board (sticky-note grid)
- `app/admin.tsx` — Hidden admin dashboard (accessed via 5-tap on profile version label)

## Features

### Email OTP Authentication
- Onboarding Step 0: email-only input → "Send Verification Code" button
- OTP screen: 6 individual digit boxes, countdown timer (60s resend), error handling
- Backend: POST /api/auth/send-otp (rate limited, 10min expiry), POST /api/auth/verify-otp (5 attempts max)
- After verification → name/housing steps (Steps 1–4)
- `otpVerifiedEmail` stored in AppContext
- Resend email: uses `RESEND_API_KEY` env var; falls back to console.log in dev
  - **NOTE**: Resend integration was dismissed by user. To enable real emails, set `RESEND_API_KEY` env secret.

### Face Pile UI (components/FacePile.tsx)
- Overlapping circular avatar initials for mutual friends
- Shows on marketplace listing cards when trust.degree === 2 + mutualFriends exist
- Tapping opens bottom sheet with full names + emails + "In your circle" badges
- `getTrustInfo()` in AppContext returns `mutualFriends: MutualFriend[]`

### Mark as Leased + MicroFeedback
- "Mark as Leased" button on your own listing cards (Ponyo Red)
- Removes post locally + calls DELETE /api/listings/:id + increments successful_subleases stat
- Shows congrats bottom sheet with wave animation → then MicroFeedback modal
- MicroFeedback (components/MicroFeedback.tsx): 🌊/🛶/🦈 rating cards
  - Smooth/Bumpy → auto-close with thanks after 2s
  - Rescue → issue chips + optional text → POST /api/feedback
- Feedback stored in `feedback` table with rating, issue_category, issue_detail

### Admin Dashboard (app/admin.tsx)
- Accessed by tapping profile version label 5 times within 3 seconds
- Sections: Live Stats (users/listings/leases), Feedback Overview (% breakdown + animated bars), Top Complaints, Recent Feedback
- Powered by GET /api/admin/stats

### 4-Category Home Screen (Browse Tab)
- **Summer Only**: Mid-May to Early August (May 15 – Aug 10)
- **The August Gap**: 1–2 week temporary stays in August
- **Semester / Full Year**: Fall (Aug–Dec), Spring (Jan–May), or 12-month takeovers
- **Short-Term & Events**: 1–14 days for Moms Weekend, Thanksgiving, graduation stays
- Each category card navigates to marketplace pre-filtered on that category

### Social Trust Graph (My Circle Tab)
- Two sub-tabs: "My Circle" (social graph) and "Matches" (roommate matches)
- Add friends by @illinois.edu email — looks up in mock users + backend
- **Trust display**: 1st Degree (green chip), 2nd Degree → FacePile component, Shared Org (gold chip)
- Vouch toggle: star button on each friend card
- Trust badges appear on **marketplace listing cards** and **roommate match cards**

### Trust Badge Logic (getTrustInfo in AppContext)
1. Email in friends list → degree: 1 (1st Degree Friend)
2. Friend shares an org with target → degree: 2, builds mutualFriends list
3. Current user shares org with target (no friend) → sharedOrg shown
4. Vouched by you → vouchedByFriend shown
5. 2nd degree + mutuals → FacePile shown instead of text badge

### Marketplace with Category Filters
- Filter chips: All, Summer Only, August Gap, Semester/Full Year, Short-Term & Events
- Category pre-selected via `?category=` URL param from home screen
- Category badges, trust FacePile, break-friendly tag, landlord badge
- "Your Post" tag on user's own listings, "Mark as Leased" button at bottom

### Sign Out (Profile Tab)
- Sign Out: clears only session (@popmatch_user + @popmatch_onboarded)
- Reset All Data: clears everything including friends, matches, subleases
- Version label at bottom: 5-tap unlocks hidden admin dashboard

## Database Schema (PostgreSQL)
Tables: `users`, `friendships` (bidirectional), `vouches`, `listings` (with `leased` column), `break_posts`, `otp_codes`, `feedback`, `stats`

Migrations: `ALTER TABLE listings ADD COLUMN IF NOT EXISTS leased BOOLEAN DEFAULT FALSE` runs on boot

## API Routes (server/routes.ts)
- POST /api/auth/send-otp — generate + email OTP code
- POST /api/auth/verify-otp — validate OTP (5 attempts max, 10 min expiry)
- POST /api/users — upsert user profile
- GET /api/users/by-email/:email — find user
- GET/POST/DELETE /api/friends/:email — manage friendships (bidirectional)
- POST/DELETE /api/vouches — manage vouches
- GET /api/trust/:viewerEmail/:targetEmail — compute trust info (SQL mutual-friend query)
- GET/POST /api/listings — housing listings
- DELETE /api/listings/:id — mark listing as leased
- POST /api/stats/increment — increment a stat counter
- POST /api/feedback — save user feedback
- GET /api/feedback/summary — aggregate feedback summary
- GET /api/admin/stats — full admin dashboard payload

## State (context/AppContext.tsx)
- UserProfile, SubleasePost, BreakPost, MatchRecord, FriendRecord, TrustInfo, MutualFriend
- Persisted: @popmatch_user, _onboarded, _matches, _liked, _passed, _scam, _subleases, _breaks, _friends
- `otpVerifiedEmail` (session only, not persisted)
- Demo seed data for subleases (6) and break posts (3) and mock users (8, with college/organizations)
- `removeSublease(id)` removes listing by ID from state + AsyncStorage
- `getTrustInfo()` returns mutualFriends list for FacePile rendering

## Components
- `components/FacePile.tsx` — overlapping avatar initials with tap-to-expand mutual friends modal
- `components/MicroFeedback.tsx` — post-lease emoji feedback modal (🌊/🛶/🦈 + rescue flow)
- `components/ScamBanner.tsx` — dismissable scam warning (orange, left border)
- `components/ErrorBoundary.tsx` — crash boundary with reloadAppAsync

## Workflows
- `Start Backend`: `npm run server:dev` → Express on port 5000
- `Start Frontend`: `npm run expo:dev` → Expo Metro on port 8081

## Onboarding Animation
- `PonyoProgress` component: fish swims across wave dots toward a home bucket
- `fishPx`: direct pixel Animated.Value, JS-driven spring (no interpolation)
- `bobY`: separate nested Animated.View, JS-driven timing loop
- Nested animated views prevent driver mixing (original iOS crash fix)

## Environment Variables
- `SESSION_SECRET` — set in Replit secrets
- `RESEND_API_KEY` — optional; enables real OTP emails via Resend. Without it, codes are logged to console.
- `RESEND_FROM_EMAIL` — optional; email address OTPs are sent from (default: onboarding@resend.dev)

## Notes
- react-native-maps@1.18.0 installed but NOT used (zone map is card-based grid)
- No emojis in UI components — @expo/vector-icons (Ionicons) throughout
- Web platform: 67px top / 34px bottom inset handling on all screens
- Resend integration was dismissed; add `RESEND_API_KEY` env secret to enable real emails
