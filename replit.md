# PopMatch — UIUC Student Housing Matchmaker

## Overview
PopMatch is a UIUC student-first housing matchmaker and sublease mobile app (Expo/React Native).
@illinois.edu email gate enforced on onboarding. No real backend auth — frontend validation only.

## Architecture

### Stack
- **Frontend**: Expo Router (React Native + Web), TypeScript
- **Backend**: Express + TypeScript (port 5000, serves static assets + API)
- **State**: React Context + AsyncStorage (persistent)
- **Fonts**: Nunito (400, 600, 700, 800) via @expo-google-fonts/nunito
- **Icons**: @expo/vector-icons (Ionicons only — NO emojis anywhere)

### Design System ("Sunset Beach Ghibli")
- `constants/colors.ts` — single source of truth
- Sand: #F4ECD8, Ocean: #00416A, Orange: #CC5500, Gold: #FFD700, Grass Green: #5A8A5A
- Charcoal: #2C2416, Card Background: #FFFDF6, Border: #DDD0B5

## Navigation

### Entry
- `app/index.tsx` — Redirects to /onboarding or /(tabs) based on AsyncStorage
- `app/onboarding.tsx` — 5-step onboarding with @illinois.edu gate

### Tabs (app/(tabs)/)
- `index.tsx` — Home hub: 3 section entry cards (Matchmaker / Marketplace / Break Board)
- `matches.tsx` — Liked matches with landlord alerts & agreement generator
- `map.tsx` — PopMap: zone guide grid + listing pins (no react-native-maps used)
- `profile.tsx` — User profile, stats, algorithm explanation, reset

### Stack Screens
- `app/matchmaker.tsx` — Year-Long swipe discovery (PanResponder, weighted score)
- `app/marketplace.tsx` — Sublease listings browse (filter by lease type)
- `app/post-sublease.tsx` — Post a sublease form with landlord warnings
- `app/breaks.tsx` — Break Stay bulletin board (sticky-note grid)

## Features

### Year-Long Matchmaker
- Swipe cards with PanResponder
- Weighted Euclidean distance: Budget 35%, Cleanliness 25%, Noise 20%, Zone 20%
- Gender filter, compatibility score badge
- Liked users stored via AsyncStorage

### Sublease Marketplace
- Browse with filter chips (All / Fall / Spring / Summer / Full Year)
- Demo seed data: Hub, 707 S Mathews, Fairview
- Break-friendly tag, landlord badge, poster info

### Post Sublease Form
- Building name, address, lease type, price, landlord, zone
- Break availability toggle + break type selection
- Real-time landlord warnings (info/warn/danger levels):
  - JSM: $50 fee + Renter's Insurance
  - UGroup: $125 fee + 72hr Move-In Report
  - Bailey: walk in TOGETHER warning
  - American Campus: up to $600 Relet fee flash alert
  - Smile: get written approval

### Break Stay Board
- Sticky-note grid (2-col) with colorful note backgrounds
- Filter by break type: Thanksgiving, Spring Break, Winter Break
- Post modal: role (offering/seeking), break period, price, zone, description
- Demo seed data: 3 posts

### PopMap
- Zone Guide tab: interactive 5-zone grid with pros/cons detail cards
- All Listings tab: expandable listing pins with poster info
- Zones: Campustown, North Campus, South Campus, Urbana, Downtown
- Average rent ranges, vibe labels

### Matches Tab
- Expanded landlord alerts per landlord
- Roommate agreement modal generator (utilities, deposit, house rules, breaks, signatures)
- Compatibility score colored badges

### Profile Tab
- Full profile display with cleanliness/noise dot ratings
- Algorithm weights explained
- Break plans with green/grey staying/leaving badges
- Reset & restart onboarding

## State (context/AppContext.tsx)
- UserProfile, SubleasePost, BreakPost, MatchRecord
- Persisted: AsyncStorage keys @popmatch_user, _onboarded, _matches, _liked, _passed, _scam, _subleases, _breaks
- Demo seed data for subleases (3) and break posts (3)
- computeScore(): weighted Euclidean distance formula

## Workflows
- `Start Backend`: `npm run server:dev` → Express on port 5000
- `Start Frontend`: `npm run expo:dev` → Expo Metro on port 8081

## Components
- `components/ScamBanner.tsx` — dismissable scam warning (orange, left border)
- `components/ErrorBoundary.tsx` — crash boundary with reloadAppAsync

## Notes
- react-native-maps@1.18.0 installed but NOT used (zone map is card-based grid)
- @illinois.edu validation is frontend-only
- No emojis — @expo/vector-icons (Ionicons) throughout
- Web platform: 67px top / 34px bottom inset handling on all screens
