# PopMatch – UIUC Student-First Sublease & Matchmaker

## Overview
A mobile-first app for University of Illinois (UIUC) students to find compatible roommates and subleases, featuring a Studio Ghibli-inspired aesthetic.

## Tech Stack
- **Frontend**: Expo Router (React Native) with TypeScript
- **Backend**: Express.js on port 5000
- **State**: AsyncStorage + React Context
- **Font**: Nunito (Google Fonts)
- **Icons**: @expo/vector-icons (Ionicons, MaterialCommunityIcons)

## Key Features
1. **Illinois Email Gate** – Only @illinois.edu emails allowed during onboarding
2. **Scam Shield Banner** – Permanent dismissible fake-check scam warning
3. **5-Step Onboarding** – Name, major, bio, budget, gender, lease type, zone, landlord, break plans
4. **Swipe Discovery** – Tinder-style swipe cards with gender filter + weighted matching
5. **Weighted Euclidean Match Score** – Budget (35%), Cleanliness (25%), Noise (20%), Zone (20%)
6. **UIUC Zone Map** – Interactive 5-zone explorer with pros/cons and resident counts
7. **Matches + Landlord Alerts** – JSM ($50 fee), UGroup ($125 + 72hr report), Bailey (walk in together!), American Campus ($600 relet fee), Private
8. **Roommate Agreement Generator** – Timestamped summary covering utility splits, security deposit, house rules

## Navigation Structure
- `/` → redirects to /onboarding or /(tabs) based on auth
- `/onboarding` – 5-step wizard
- `/(tabs)/index` – Discovery (swipe cards)
- `/(tabs)/matches` – Matched users + landlord alerts + agreement generator
- `/(tabs)/map` – UIUC zone explorer
- `/(tabs)/profile` – User profile + algorithm explanation

## Color Palette (Studio Ghibli "Sun & Hope")
- Parchment: #FDFBF7
- Sky Blue: #87CEEB
- Sunflower Yellow: #FFD700
- Grass Green: #90EE90
- Warm Brown: #8B6914
- Charcoal: #3D3228

## Running the App
- Backend: `npm run server:dev` (port 5000)
- Frontend: `npm run expo:dev` (port 8081)
