import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type LeaseType = "full_year" | "fall_sublease" | "spring_sublease" | "summer_sublease";
export type GenderPref = "girls_only" | "boys_only" | "mixed";
export type Zone = "campustown" | "north" | "south" | "urbana" | "downtown";
export type Landlord = "jsm" | "ugroup" | "bailey" | "american" | "smile" | "other";
export type BreakType = "thanksgiving" | "spring_break" | "winter";

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
  college?: string;
  organizations?: string[];
}

export interface FriendRecord {
  email: string;
  name: string;
  avatarColor: string;
  major?: string;
  college?: string;
  organizations?: string[];
  vouchedByMe: boolean;
  timestamp: number;
}

export interface SubleasePost {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  buildingName: string;
  address: string;
  leaseType: LeaseType;
  pricePerMonth: number;
  landlord: Landlord;
  zone: Zone;
  availableDuringBreaks: boolean;
  breakTypes: BreakType[];
  description: string;
  avatarColor: string;
  timestamp: number;
  category?: string;
}

export interface BreakPost {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  breakType: BreakType;
  role: "seeking" | "offering";
  pricePerWeek: number;
  zone: Zone;
  description: string;
  avatarColor: string;
  timestamp: number;
}

export interface MatchRecord {
  userId: string;
  score: number;
  liked: boolean;
  timestamp: number;
}

export interface TrustInfo {
  degree: 1 | 2 | null;
  vouchedByFriend: string | null;
  sharedOrg: string | null;
  isFriend: boolean;
}

const DEMO_POSTS: SubleasePost[] = [
  {
    id: "sp1", userId: "u1", userName: "Mei Lin", userEmail: "meilin2@illinois.edu",
    buildingName: "Hub Champaign", address: "210 E Green St", leaseType: "fall_sublease",
    pricePerMonth: 950, landlord: "american", zone: "campustown",
    availableDuringBreaks: false, breakTypes: [],
    description: "Cozy 1BR/1BA in Hub, fully furnished. Floor-to-ceiling windows, great view.",
    avatarColor: "#1A7AAF", timestamp: Date.now() - 86400000, category: "semester_takeover"
  },
  {
    id: "sp2", userId: "u3", userName: "Jake Torres", userEmail: "jtorres6@illinois.edu",
    buildingName: "707 S Mathews", address: "707 S Mathews Ave", leaseType: "spring_sublease",
    pricePerMonth: 750, landlord: "jsm", zone: "north",
    availableDuringBreaks: true, breakTypes: ["spring_break"],
    description: "Studio apartment near Siebel. Quiet building, laundry in unit.",
    avatarColor: "#5A8A5A", timestamp: Date.now() - 172800000, category: "semester_takeover"
  },
  {
    id: "sp3", userId: "u5", userName: "Marcus Webb", userEmail: "mwebb3@illinois.edu",
    buildingName: "Fairview Apts", address: "505 E Fairview", leaseType: "summer_sublease",
    pricePerMonth: 620, landlord: "ugroup", zone: "urbana",
    availableDuringBreaks: true, breakTypes: ["thanksgiving", "spring_break"],
    description: "1BR in quiet Urbana neighborhood. Perfect for grad students or summer research.",
    avatarColor: "#9B59B6", timestamp: Date.now() - 259200000, category: "summer_only"
  },
  {
    id: "sp4", userId: "u6", userName: "Sofia Reyes", userEmail: "sreyes2@illinois.edu",
    buildingName: "The Orchard", address: "301 S Race St", leaseType: "summer_sublease",
    pricePerMonth: 540, landlord: "other", zone: "urbana",
    availableDuringBreaks: false, breakTypes: [],
    description: "Sunny studio, available May 15 – Aug 10. Furnished, near MTD bus stop.",
    avatarColor: "#5A8A5A", timestamp: Date.now() - 345600000, category: "summer_only"
  },
  {
    id: "sp5", userId: "u7", userName: "Liam Park", userEmail: "lpark9@illinois.edu",
    buildingName: "Campustown Flats", address: "512 E Green St", leaseType: "fall_sublease",
    pricePerMonth: 890, landlord: "bailey", zone: "campustown",
    availableDuringBreaks: true, breakTypes: ["thanksgiving"],
    description: "1-2 weeks available in early August before fall lease starts. Great location.",
    avatarColor: "#E0BC00", timestamp: Date.now() - 432000000, category: "august_gap"
  },
  {
    id: "sp6", userId: "u8", userName: "Zoe Mitchell", userEmail: "zmitchell@illinois.edu",
    buildingName: "Stadium Terrace", address: "1001 S Cottage Grove", leaseType: "full_year",
    pricePerMonth: 760, landlord: "smile", zone: "south",
    availableDuringBreaks: true, breakTypes: ["thanksgiving"],
    description: "Moms Weekend & graduation weekend stay available. Great for families visiting!",
    avatarColor: "#CC5500", timestamp: Date.now() - 518400000, category: "short_term"
  },
];

const DEMO_BREAKS: BreakPost[] = [
  {
    id: "bp1", userId: "u4", userName: "Aisha Okonkwo", userEmail: "aokonkwo@illinois.edu",
    breakType: "thanksgiving", role: "seeking", pricePerWeek: 150, zone: "campustown",
    description: "Flying back late, need a couch or spare room for Thanksgiving week. Very clean, quiet.",
    avatarColor: "#1A7AAF", timestamp: Date.now() - 43200000
  },
  {
    id: "bp2", userId: "u6", userName: "Sofia Reyes", userEmail: "sreyes2@illinois.edu",
    breakType: "spring_break", role: "offering", pricePerWeek: 200, zone: "north",
    description: "Offering my studio for Spring Break week. North campus, near Siebel. All utilities included.",
    avatarColor: "#5A8A5A", timestamp: Date.now() - 86400000
  },
  {
    id: "bp3", userId: "u7", userName: "Liam Park", userEmail: "lpark9@illinois.edu",
    breakType: "winter", role: "seeking", pricePerWeek: 175, zone: "urbana",
    description: "International student looking for 1–2 weeks over winter break. Can pay upfront.",
    avatarColor: "#CC5500", timestamp: Date.now() - 120000000
  },
];

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
  subleases: SubleasePost[];
  addSublease: (post: SubleasePost) => void;
  breakPosts: BreakPost[];
  addBreakPost: (post: BreakPost) => void;
  friends: FriendRecord[];
  addFriend: (friend: Omit<FriendRecord, "vouchedByMe" | "timestamp">) => Promise<void>;
  removeFriend: (email: string) => Promise<void>;
  toggleVouch: (email: string) => Promise<void>;
  getTrustInfo: (userEmail: string) => TrustInfo;
}

const AppContext = createContext<AppContextValue | null>(null);

export const MOCK_USERS: UserProfile[] = [
  {
    id: "u1", name: "Mei Lin", email: "meilin2@illinois.edu", major: "Computer Science",
    bio: "Early riser, love cooking Asian food. Looking for a quiet study buddy!",
    budget: 850, gender: "female", genderPref: "girls_only", cleanliness: 5, noise: 2,
    leaseType: "fall_sublease", zone: "north", landlord: "jsm",
    staysThanksgiving: false, staysSpringBreak: true, avatarColor: "#1A7AAF",
    college: "Grainger", organizations: ["ACM@UIUC", "WCS"],
  },
  {
    id: "u2", name: "Priya Sharma", email: "psharma4@illinois.edu", major: "Finance",
    bio: "Coffee addict, gym rat. Weekend brunches and casual hangouts.",
    budget: 950, gender: "female", genderPref: "girls_only", cleanliness: 4, noise: 3,
    leaseType: "spring_sublease", zone: "campustown", landlord: "bailey",
    staysThanksgiving: true, staysSpringBreak: true, avatarColor: "#CC5500",
    college: "Gies", organizations: ["Illini Finance Club", "DECA"],
  },
  {
    id: "u3", name: "Jake Torres", email: "jtorres6@illinois.edu", major: "Mechanical Engineering",
    bio: "Night owl who loves gaming and pizza runs at 2am. Very chill.",
    budget: 750, gender: "male", genderPref: "mixed", cleanliness: 3, noise: 4,
    leaseType: "full_year", zone: "north", landlord: "ugroup",
    staysThanksgiving: true, staysSpringBreak: false, avatarColor: "#5A8A5A",
    college: "Grainger", organizations: ["SWE", "Tau Beta Pi"],
  },
  {
    id: "u4", name: "Aisha Okonkwo", email: "aokonkwo@illinois.edu", major: "Psychology",
    bio: "Plant mom, sunset chaser, and podcast listener. Clean and organized.",
    budget: 800, gender: "female", genderPref: "girls_only", cleanliness: 5, noise: 2,
    leaseType: "full_year", zone: "urbana", landlord: "other",
    staysThanksgiving: false, staysSpringBreak: false, avatarColor: "#E07B00",
    college: "LAS", organizations: ["BSA", "Illini 4000"],
  },
  {
    id: "u5", name: "Marcus Webb", email: "mwebb3@illinois.edu", major: "Architecture",
    bio: "Studio hours are late but I keep my space spotless. Love jazz.",
    budget: 900, gender: "male", genderPref: "boys_only", cleanliness: 4, noise: 2,
    leaseType: "fall_sublease", zone: "downtown", landlord: "american",
    staysThanksgiving: false, staysSpringBreak: false, avatarColor: "#9B59B6",
    college: "FAA", organizations: ["AIAS"],
  },
  {
    id: "u6", name: "Sofia Reyes", email: "sreyes2@illinois.edu", major: "Biology",
    bio: "Pre-med grind, but I make time for friends. Quiet during finals week!",
    budget: 700, gender: "female", genderPref: "girls_only", cleanliness: 4, noise: 2,
    leaseType: "spring_sublease", zone: "south", landlord: "jsm",
    staysThanksgiving: true, staysSpringBreak: true, avatarColor: "#5A8A5A",
    college: "LAS", organizations: ["Illini Pre-Med", "Phi Delta Epsilon"],
  },
  {
    id: "u7", name: "Liam Park", email: "lpark9@illinois.edu", major: "Statistics",
    bio: "Data nerd by day, chef by night. My bibimbap will change your life.",
    budget: 850, gender: "male", genderPref: "mixed", cleanliness: 3, noise: 3,
    leaseType: "full_year", zone: "campustown", landlord: "ugroup",
    staysThanksgiving: false, staysSpringBreak: true, avatarColor: "#E0BC00",
    college: "LAS", organizations: ["Korean Cultural Association", "DataSci@UIUC"],
  },
  {
    id: "u8", name: "Zoe Mitchell", email: "zmitchell@illinois.edu", major: "Journalism",
    bio: "Always writing, always reading. I have a cat (hypoallergenic!).",
    budget: 780, gender: "female", genderPref: "girls_only", cleanliness: 4, noise: 1,
    leaseType: "spring_sublease", zone: "urbana", landlord: "other",
    staysThanksgiving: true, staysSpringBreak: false, avatarColor: "#CC5500",
    college: "Media", organizations: ["Daily Illini", "SPJ"],
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
  const [subleases, setSubleases] = useState<SubleasePost[]>(DEMO_POSTS);
  const [breakPosts, setBreakPosts] = useState<BreakPost[]>(DEMO_BREAKS);
  const [friends, setFriends] = useState<FriendRecord[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem("@popmatch_user");
        const onboarded = await AsyncStorage.getItem("@popmatch_onboarded");
        const storedMatches = await AsyncStorage.getItem("@popmatch_matches");
        const storedLiked = await AsyncStorage.getItem("@popmatch_liked");
        const storedPassed = await AsyncStorage.getItem("@popmatch_passed");
        const scamDismissed = await AsyncStorage.getItem("@popmatch_scam");
        const storedSubleases = await AsyncStorage.getItem("@popmatch_subleases");
        const storedBreaks = await AsyncStorage.getItem("@popmatch_breaks");
        const storedFriends = await AsyncStorage.getItem("@popmatch_friends");

        if (stored) setCurrentUserState(JSON.parse(stored));
        if (onboarded === "true") setIsOnboardedState(true);
        if (storedMatches) setMatches(JSON.parse(storedMatches));
        if (storedLiked) setLikedUserIds(JSON.parse(storedLiked));
        if (storedPassed) setPassedUserIds(JSON.parse(storedPassed));
        if (scamDismissed === "true") setScamBannerDismissed(true);
        if (storedSubleases) setSubleases(JSON.parse(storedSubleases));
        if (storedBreaks) setBreakPosts(JSON.parse(storedBreaks));
        if (storedFriends) setFriends(JSON.parse(storedFriends));
      } catch {}
    })();
  }, []);

  const setCurrentUser = async (user: UserProfile | null) => {
    setCurrentUserState(user);
    if (user) await AsyncStorage.setItem("@popmatch_user", JSON.stringify(user));
    else await AsyncStorage.removeItem("@popmatch_user");
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

  const addSublease = async (post: SubleasePost) => {
    const updated = [post, ...subleases];
    setSubleases(updated);
    await AsyncStorage.setItem("@popmatch_subleases", JSON.stringify(updated));
  };

  const addBreakPost = async (post: BreakPost) => {
    const updated = [post, ...breakPosts];
    setBreakPosts(updated);
    await AsyncStorage.setItem("@popmatch_breaks", JSON.stringify(updated));
  };

  const addFriend = async (friendData: Omit<FriendRecord, "vouchedByMe" | "timestamp">) => {
    const exists = friends.some(f => f.email === friendData.email);
    if (exists) return;
    const newFriend: FriendRecord = { ...friendData, vouchedByMe: false, timestamp: Date.now() };
    const updated = [newFriend, ...friends];
    setFriends(updated);
    await AsyncStorage.setItem("@popmatch_friends", JSON.stringify(updated));
  };

  const removeFriend = async (email: string) => {
    const updated = friends.filter(f => f.email !== email);
    setFriends(updated);
    await AsyncStorage.setItem("@popmatch_friends", JSON.stringify(updated));
  };

  const toggleVouch = async (email: string) => {
    const updated = friends.map(f =>
      f.email === email ? { ...f, vouchedByMe: !f.vouchedByMe } : f
    );
    setFriends(updated);
    await AsyncStorage.setItem("@popmatch_friends", JSON.stringify(updated));
  };

  const getTrustInfo = (userEmail: string): TrustInfo => {
    const directFriend = friends.find(f => f.email === userEmail);
    if (directFriend) {
      return {
        degree: 1,
        isFriend: true,
        vouchedByFriend: directFriend.vouchedByMe ? "You vouched for them" : null,
        sharedOrg: null,
      };
    }

    const targetMockUser = MOCK_USERS.find(u => u.email === userEmail);
    if (!targetMockUser) {
      return { degree: null, isFriend: false, vouchedByFriend: null, sharedOrg: null };
    }

    for (const friend of friends) {
      const friendMockUser = MOCK_USERS.find(u => u.email === friend.email);
      if (!friendMockUser) continue;

      const sharedOrgs = (currentUser?.organizations || []).filter(
        org => (targetMockUser.organizations || []).includes(org)
      );

      if (sharedOrgs.length > 0) {
        return {
          degree: 2,
          isFriend: false,
          vouchedByFriend: friend.vouchedByMe ? friend.name : null,
          sharedOrg: sharedOrgs[0],
        };
      }

      if (
        (friendMockUser.organizations || []).some(
          org => (targetMockUser.organizations || []).includes(org)
        )
      ) {
        return {
          degree: 2,
          isFriend: false,
          vouchedByFriend: friend.vouchedByMe ? friend.name : null,
          sharedOrg: null,
        };
      }
    }

    const sharedOrg = (currentUser?.organizations || []).find(
      org => (targetMockUser.organizations || []).includes(org)
    );
    if (sharedOrg) {
      return { degree: null, isFriend: false, vouchedByFriend: null, sharedOrg };
    }

    return { degree: null, isFriend: false, vouchedByFriend: null, sharedOrg: null };
  };

  const value = useMemo(() => ({
    currentUser, setCurrentUser, isOnboarded, setIsOnboarded,
    mockUsers: MOCK_USERS, matches, addMatch, scamBannerDismissed, dismissScamBanner,
    likedUserIds, passedUserIds, addLiked, addPassed, computeScore,
    subleases, addSublease, breakPosts, addBreakPost,
    friends, addFriend, removeFriend, toggleVouch, getTrustInfo,
  }), [
    currentUser, isOnboarded, matches, scamBannerDismissed,
    likedUserIds, passedUserIds, subleases, breakPosts, friends
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
