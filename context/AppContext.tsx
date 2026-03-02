import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type LeaseType = "full_year" | "fall_sublease" | "spring_sublease";
export type GenderPref = "girls_only" | "boys_only" | "mixed";
export type Zone = "campustown" | "north" | "south" | "urbana" | "downtown";
export type Landlord = "jsm" | "ugroup" | "bailey" | "american" | "other";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  major: string;
  bio: string;
  budget: number;
  gender: "female" | "male" | "nonbinary";
  genderPref: GenderPref;
  cleanliness: number;
  noise: number;
  leaseType: LeaseType;
  zone: Zone;
  landlord: Landlord;
  staysThanksgiving: boolean;
  staysSpringBreak: boolean;
  avatarColor: string;
}

export interface MatchRecord {
  userId: string;
  score: number;
  liked: boolean;
  timestamp: number;
}

interface AppContextValue {
  currentUser: UserProfile | null;
  setCurrentUser: (user: UserProfile | null) => void;
  isOnboarded: boolean;
  setIsOnboarded: (v: boolean) => void;
  mockUsers: UserProfile[];
  matches: MatchRecord[];
  addMatch: (record: MatchRecord) => void;
  scamBannerDismissed: boolean;
  dismissScamBanner: () => void;
  likedUserIds: string[];
  passedUserIds: string[];
  addLiked: (id: string) => void;
  addPassed: (id: string) => void;
  computeScore: (a: UserProfile, b: UserProfile) => number;
}

const AppContext = createContext<AppContextValue | null>(null);

const AVATAR_COLORS = [
  "#87CEEB", "#FFD700", "#90EE90", "#F4A261", "#A8DADC",
  "#C77DFF", "#F28C28", "#52B788", "#E76F51", "#2A9D8F"
];

export const MOCK_USERS: UserProfile[] = [
  {
    id: "u1", name: "Mei Lin", email: "meilin2@illinois.edu", major: "Computer Science",
    bio: "Early riser, love cooking Asian food. Looking for a quiet study buddy!",
    budget: 850, gender: "female", genderPref: "girls_only", cleanliness: 5, noise: 2,
    leaseType: "fall_sublease", zone: "north", landlord: "jsm",
    staysThanksgiving: false, staysSpringBreak: true, avatarColor: "#87CEEB"
  },
  {
    id: "u2", name: "Priya Sharma", email: "psharma4@illinois.edu", major: "Finance",
    bio: "Coffee addict, gym rat. Weekend brunches and casual hangouts.",
    budget: 950, gender: "female", genderPref: "girls_only", cleanliness: 4, noise: 3,
    leaseType: "spring_sublease", zone: "campustown", landlord: "bailey",
    staysThanksgiving: true, staysSpringBreak: true, avatarColor: "#FFD700"
  },
  {
    id: "u3", name: "Jake Torres", email: "jtorres6@illinois.edu", major: "Mechanical Engineering",
    bio: "Night owl who loves gaming and pizza runs at 2am. Very chill.",
    budget: 750, gender: "male", genderPref: "mixed", cleanliness: 3, noise: 4,
    leaseType: "full_year", zone: "north", landlord: "ugroup",
    staysThanksgiving: true, staysSpringBreak: false, avatarColor: "#90EE90"
  },
  {
    id: "u4", name: "Aisha Okonkwo", email: "aokonkwo@illinois.edu", major: "Psychology",
    bio: "Plant mom, sunset chaser, and podcast listener. Clean and organized.",
    budget: 800, gender: "female", genderPref: "girls_only", cleanliness: 5, noise: 2,
    leaseType: "full_year", zone: "urbana", landlord: "other",
    staysThanksgiving: false, staysSpringBreak: false, avatarColor: "#A8DADC"
  },
  {
    id: "u5", name: "Marcus Webb", email: "mwebb3@illinois.edu", major: "Architecture",
    bio: "Studio hours are late but I keep my space spotless. Love jazz.",
    budget: 900, gender: "male", genderPref: "boys_only", cleanliness: 4, noise: 2,
    leaseType: "fall_sublease", zone: "downtown", landlord: "american",
    staysThanksgiving: false, staysSpringBreak: false, avatarColor: "#C77DFF"
  },
  {
    id: "u6", name: "Sofia Reyes", email: "sreyes2@illinois.edu", major: "Biology",
    bio: "Pre-med grind, but I make time for friends. Quiet during finals week!",
    budget: 700, gender: "female", genderPref: "girls_only", cleanliness: 4, noise: 2,
    leaseType: "spring_sublease", zone: "south", landlord: "jsm",
    staysThanksgiving: true, staysSpringBreak: true, avatarColor: "#52B788"
  },
  {
    id: "u7", name: "Liam Park", email: "lpark9@illinois.edu", major: "Statistics",
    bio: "Data nerd by day, chef by night. My bibimbap will change your life.",
    budget: 850, gender: "male", genderPref: "mixed", cleanliness: 3, noise: 3,
    leaseType: "full_year", zone: "campustown", landlord: "ugroup",
    staysThanksgiving: false, staysSpringBreak: true, avatarColor: "#F28C28"
  },
  {
    id: "u8", name: "Zoe Mitchell", email: "zmitchell@illinois.edu", major: "Journalism",
    bio: "Always writing, always reading. I have a cat (hypoallergenic!).",
    budget: 780, gender: "female", genderPref: "girls_only", cleanliness: 4, noise: 1,
    leaseType: "spring_sublease", zone: "urbana", landlord: "other",
    staysThanksgiving: true, staysSpringBreak: false, avatarColor: "#E76F51"
  },
];

function computeScore(a: UserProfile, b: UserProfile): number {
  const budgetDiff = (a.budget - b.budget) / 500;
  const cleanDiff = (a.cleanliness - b.cleanliness) / 4;
  const noiseDiff = (a.noise - b.noise) / 4;
  const zoneDiff = a.zone === b.zone ? 0 : 1;

  const D = Math.sqrt(
    0.35 * budgetDiff * budgetDiff +
    0.25 * cleanDiff * cleanDiff +
    0.20 * noiseDiff * noiseDiff +
    0.20 * zoneDiff * zoneDiff
  );
  return Math.max(0, Math.round((1 - D) * 100));
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<UserProfile | null>(null);
  const [isOnboarded, setIsOnboardedState] = useState(false);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [scamBannerDismissed, setScamBannerDismissed] = useState(false);
  const [likedUserIds, setLikedUserIds] = useState<string[]>([]);
  const [passedUserIds, setPassedUserIds] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem("@popmatch_user");
        const onboarded = await AsyncStorage.getItem("@popmatch_onboarded");
        const storedMatches = await AsyncStorage.getItem("@popmatch_matches");
        const storedLiked = await AsyncStorage.getItem("@popmatch_liked");
        const storedPassed = await AsyncStorage.getItem("@popmatch_passed");
        const scamDismissed = await AsyncStorage.getItem("@popmatch_scam");

        if (stored) setCurrentUserState(JSON.parse(stored));
        if (onboarded === "true") setIsOnboardedState(true);
        if (storedMatches) setMatches(JSON.parse(storedMatches));
        if (storedLiked) setLikedUserIds(JSON.parse(storedLiked));
        if (storedPassed) setPassedUserIds(JSON.parse(storedPassed));
        if (scamDismissed === "true") setScamBannerDismissed(true);
      } catch {}
    })();
  }, []);

  const setCurrentUser = async (user: UserProfile | null) => {
    setCurrentUserState(user);
    if (user) await AsyncStorage.setItem("@popmatch_user", JSON.stringify(user));
  };

  const setIsOnboarded = async (v: boolean) => {
    setIsOnboardedState(v);
    await AsyncStorage.setItem("@popmatch_onboarded", v ? "true" : "false");
  };

  const addMatch = async (record: MatchRecord) => {
    const updated = [...matches, record];
    setMatches(updated);
    await AsyncStorage.setItem("@popmatch_matches", JSON.stringify(updated));
  };

  const dismissScamBanner = async () => {
    setScamBannerDismissed(true);
    await AsyncStorage.setItem("@popmatch_scam", "true");
  };

  const addLiked = async (id: string) => {
    const updated = [...likedUserIds, id];
    setLikedUserIds(updated);
    await AsyncStorage.setItem("@popmatch_liked", JSON.stringify(updated));
  };

  const addPassed = async (id: string) => {
    const updated = [...passedUserIds, id];
    setPassedUserIds(updated);
    await AsyncStorage.setItem("@popmatch_passed", JSON.stringify(updated));
  };

  const value = useMemo(() => ({
    currentUser,
    setCurrentUser,
    isOnboarded,
    setIsOnboarded,
    mockUsers: MOCK_USERS,
    matches,
    addMatch,
    scamBannerDismissed,
    dismissScamBanner,
    likedUserIds,
    passedUserIds,
    addLiked,
    addPassed,
    computeScore,
  }), [currentUser, isOnboarded, matches, scamBannerDismissed, likedUserIds, passedUserIds]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
