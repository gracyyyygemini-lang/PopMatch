# PopMatch — UIUC Student Housing Matchmaker

## Overview
PopMatch is a UIUC student-first housing matchmaker and sublease mobile app (Expo/React Native).
@illinois.edu email gate enforced via real OTP verification. PostgreSQL backend for social trust graph (friendships, vouches), OTP codes, feedback, and stats.
5-pathway intent system (Host, Joiner, Co-Seeker, Sublessor, Sublessee) with 16-point amenity tracking and zone-filtered marketplace.

## Architecture

### Stack
- **Frontend**: Expo Router (React Native + Web), TypeScript
- **Backend**: Express + TypeScript (port 5000) + PostgreSQL (via pg Pool)
- **State**: React Context + AsyncStorage (persistent) + PostgreSQL (social trust)
- **Fonts**: Nunito (400, 600, 700, 800) via @expo-google-fonts/nunito
- **Icons**: @expo/vector-icons (Ionicons only — NO emojis in UI)
- **Email**: Resend (`resend` npm package) — falls back to console.log if RESEND_API_KEY not set
- **Images**: expo-image-picker for listing photo uploads

### Design System ("Ponyo-Sea")
- `constants/colors.ts` — single source of truth
- Foam: #F8F9F3, Teal/Ocean: #005F73, Ponyo Orange: #FF6B4E, Bucket Yellow: #FFD966
- Charcoal: #1A2E35, Card: #FFFFFF, Border: #DDE0D8

## Navigation

### Entry
- `app/index.tsx` — Redirects to /onboarding or /(tabs) based on AsyncStorage
- `app/onboarding.tsx` — Email OTP step (Step 0) → Intent step (Step 1) → 4-step onboarding with Ponyo fish animation (6 total steps)
- `app/admin.tsx` — Hidden admin dashboard (5-tap on profile version label)

### Tabs (app/(tabs)/) — 3 tabs (PopMap removed)
- `index.tsx` — Browse: ZonePicker + 4 UIUC housing category cards + Matchmaker/Breaks shortcuts
- `matches.tsx` — My Circle: social trust graph (sub-tab) + roommate matches (sub-tab)
- `profile.tsx` — User profile, stats, Sign Out, Reset All Data; 5-tap version label → /admin
- `map.tsx` — Hidden from tab bar (href: null), legacy PopMap screen

### Stack Screens
- `app/matchmaker.tsx` — Year-Long swipe discovery with ZonePicker filter + intent bridge (Host/Sublessor redirect)
- `app/marketplace.tsx` — Sublease listings with ZonePicker, amenity icon grid, FacePile trust + Mark as Leased
- `app/post-sublease.tsx` — Multi-step listing form (4 steps: Basic Info → Kitchen/Photos → Amenities → Cleanliness/Dates)
- `app/link-listing.tsx` — Bridge screen for Host/Sublessor users without listings
- `app/breaks.tsx` — Break Stay bulletin board (sticky-note grid)
- `app/admin.tsx` — Hidden admin dashboard (accessed via 5-tap on profile version label)

## Features

### 5-Pathway Intent System
- Intent types: Host, Joiner, Co-Seeker, Sublessor, Sublessee
- Selected during onboarding Step 1 (after email verification)
- Host/Sublessor users without listings are redirected to "Link a Listing First" screen when accessing Matchmaker
- Intent stored in UserProfile (`intent` field)

### Email OTP Authentication
- Onboarding Step 0: email-only input → "Send Verification Code" button
- OTP screen: 6 individual digit boxes, countdown timer (60s resend), error handling
- Backend: POST /api/auth/send-otp (rate limited, 10min expiry), POST /api/auth/verify-otp (5 attempts max)
- After verification → Intent selection (Step 1) → name/housing steps (Steps 2–5)
- `otpVerifiedEmail` stored in AppContext
- Resend email: uses `RESEND_API_KEY` env var; falls back to console.log in dev
- **OTP is hardcoded to `123456` for testing**

### 16-Point Amenity System
- **Foundational**: isFurnished, hasLaundry, hasWifi, hasAC
- **Collegiate**: hasStudyLounge, hasPrinting, hasBikeStorage, hasSecurity
- **Financial**: utilsIncluded, noDeposit, parkingIncluded
- **Building**: hasGym, hasPool, hasElevator, hasRooftop, hasLockers
- Amenities interface + DEFAULT_AMENITIES exported from AppContext
- 2x2 foundational amenity icon grid displayed on marketplace listing cards

### Smart Create Listing Form (4 steps)
- **Step 1**: Basic info — building, address, price, lease type, landlord, zone, breaks, description
- **Step 2**: Kitchen type (Private/Communal) → 3 required photo uploads (Bedroom, Bathroom, Kitchen/Communal Area)
- **Step 3**: 16 amenity toggles in grouped sections (Foundational, Collegiate, Financial, Building)
- **Step 4**: Cleaning frequency + shoe policy + move-in/move-out dates
- Validation: Submit disabled until all 3 photos uploaded + dates entered

### Zone Filtering
- `components/ZonePicker.tsx` — Horizontal scrolling zone chips (All, Campustown, North, South, Urbana, Champaign)
- Available on Browse tab, Marketplace, and Matchmaker screens
- Zone filter passed via URL params between screens

### Face Pile UI (components/FacePile.tsx)
- Overlapping circular avatar initials for mutual friends
- Shows on marketplace listing cards when trust.degree === 2 + mutualFriends exist
- Tapping opens bottom sheet with full names + emails + "In your circle" badges

### Mark as Leased + MicroFeedback
- "Mark as Leased" button on your own listing cards (Ponyo Red)
- Removes post locally + calls DELETE /api/listings/:id + increments successful_subleases stat
- Shows congrats bottom sheet with wave animation → then MicroFeedback modal
- MicroFeedback (components/MicroFeedback.tsx): rating cards
  - Smooth/Bumpy → auto-close with thanks after 2s
  - Rescue → issue chips + optional text → POST /api/feedback

### Admin Dashboard (app/admin.tsx)
- Accessed by tapping profile version label 5 times within 3 seconds
- Sections: Live Stats, Feedback Overview, Top Complaints, Recent Feedback
- Powered by GET /api/admin/stats

### 4-Category Home Screen (Browse Tab)
- **Summer Only**: Mid-May to Early August (May 15 – Aug 10)
- **The August Gap**: 1–2 week temporary stays in August
- **Semester / Full Year**: Fall (Aug–Dec), Spring (Jan–May), or 12-month takeovers
- **Short-Term & Events**: 1–14 days for Moms Weekend, Thanksgiving, graduation stays

### Social Trust Graph (My Circle Tab)
- Two sub-tabs: "My Circle" (social graph) and "Matches" (roommate matches)
- Add friends by @illinois.edu email
- Trust display: 1st Degree (green chip), 2nd Degree → FacePile, Shared Org (gold chip)

## Data Types (context/AppContext.tsx)
- `Intent`: 'host' | 'joiner' | 'co_seeker' | 'sublessor' | 'sublessee'
- `CleaningFrequency`: 'daily' | 'weekly' | 'monthly'
- `ShoePolicy`: 'shoes_off' | 'front_door' | 'no_policy'
- `KitchenType`: 'private' | 'communal'
- `Amenities`: 16-boolean interface with DEFAULT_AMENITIES constant
- `SubleasePost`: includes kitchenType, moveInDate, moveOutDate, amenities, cleaningFrequency, shoePolicy, images
- `UserProfile`: includes intent field

## Database Schema (PostgreSQL)
Tables: `users`, `friendships` (bidirectional), `vouches`, `listings` (with `leased` column), `break_posts`, `otp_codes`, `feedback`, `stats`

## API Routes (server/routes.ts)
- POST /api/auth/send-otp — generate + email OTP code
- POST /api/auth/verify-otp — validate OTP (5 attempts max, 10 min expiry)
- POST /api/users — upsert user profile
- GET /api/users/by-email/:email — find user
- GET/POST/DELETE /api/friends/:email — manage friendships
- POST/DELETE /api/vouches — manage vouches
- GET /api/trust/:viewerEmail/:targetEmail — compute trust info
- GET/POST /api/listings — housing listings
- DELETE /api/listings/:id — mark listing as leased
- POST /api/stats/increment — increment a stat counter
- POST /api/feedback — save user feedback
- GET /api/admin/stats — full admin dashboard payload

## Components
- `components/ZonePicker.tsx` — horizontal scrolling zone filter chips
- `components/FacePile.tsx` — overlapping avatar initials with tap-to-expand
- `components/MicroFeedback.tsx` — post-lease feedback modal
- `components/ScamBanner.tsx` — dismissable scam warning
- `components/ErrorBoundary.tsx` — crash boundary with reloadAppAsync

## Workflows
- `Start Backend`: `npm run server:dev` → Express on port 5000
- `Start Frontend`: `npm run expo:dev` → Expo Metro on port 8081

## Environment Variables
- `SESSION_SECRET` — set in Replit secrets
- `RESEND_API_KEY` — optional; enables real OTP emails via Resend
- `RESEND_FROM_EMAIL` — optional; email address OTPs are sent from

## Notes
- OTP hardcoded to `123456` for testing — revert `randomCode()` in server/routes.ts for production
- react-native-maps@1.18.0 installed but NOT used (zone map is card-based)
- Web platform: 67px top / 34px bottom inset handling on all screens
- PopMap tab hidden from tab bar (href: null) but route still accessible
