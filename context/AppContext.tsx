import React, { createContext, useContext, useState, useEffect, useMemo, useRef, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchUserProfile, fetchUsers, mergeProfile, saveUserProfile } from "@/lib/users";
import { fetchMutualMatches, saveLike } from "@/lib/likes";
import { apiErrorMessage, fetchConversations, fetchMessages, openConversation, postMessage } from "@/lib/messages";

export type LeaseType = "full_year" | "fall_sublease" | "spring_sublease" | "summer_sublease";
export type GenderPref = "girls_only" | "boys_only" | "mixed";
export type Zone = "campustown" | "north" | "south" | "urbana" | "downtown";
export type Landlord = "jsm" | "ugroup" | "bailey" | "american" | "smile" | "cpm" | "green_st_realty" | "other";
export type BreakType = "thanksgiving" | "spring_break" | "winter";

export type Intent = "host" | "joiner" | "co_seeker" | "sublessor" | "sublessee";
export type CleaningFrequency = "daily" | "weekly" | "monthly";
export type ShoePolicy = "shoes_off" | "front_door" | "no_policy";
export type KitchenType = "private" | "communal";
export type BathroomType = "private" | "shared";

export interface Amenities {
  isFurnished: boolean;
  hasLaundry: boolean;
  hasWifi: boolean;
  hasAC: boolean;
  hasStudyLounge: boolean;
  hasPrinting: boolean;
  hasBikeStorage: boolean;
  hasSecurity: boolean;
  utilsIncluded: boolean;
  noDeposit: boolean;
  parkingIncluded: boolean;
  hasGym: boolean;
  hasPool: boolean;
  hasElevator: boolean;
  hasRooftop: boolean;
  hasLockers: boolean;
}

export const DEFAULT_AMENITIES: Amenities = {
  isFurnished: false, hasLaundry: false, hasWifi: false, hasAC: false,
  hasStudyLounge: false, hasPrinting: false, hasBikeStorage: false, hasSecurity: false,
  utilsIncluded: false, noDeposit: false, parkingIncluded: false,
  hasGym: false, hasPool: false, hasElevator: false, hasRooftop: false, hasLockers: false,
};

export type StarSign = "aries" | "taurus" | "gemini" | "cancer" | "leo" | "virgo" | "libra" | "scorpio" | "sagittarius" | "capricorn" | "aquarius" | "pisces";
export type MBTI = "INTJ" | "INTP" | "ENTJ" | "ENTP" | "INFJ" | "INFP" | "ENFJ" | "ENFP" | "ISTJ" | "ISFJ" | "ESTJ" | "ESFJ" | "ISTP" | "ISFP" | "ESTP" | "ESFP" | "idk";
export type CollegeYear = "freshman" | "sophomore" | "junior" | "senior" | "grad_phd";
export type GreekLife = "independent" | "sorority" | "fraternity" | "prof_frat";

export interface VibeProfile {
  identity: "girl" | "guy" | "nonbinary";
  lookingFor: "girls" | "guys" | "coed";
  starSign?: StarSign;
  mbti?: MBTI;
  year?: CollegeYear;
  greekLife?: GreekLife;
  vices: string[];
  pets: string[];
  sleep?: string;
  alarms?: string;
  cleanlinessVibe?: string;
  groceries?: string;
  guests?: string;
  prompt?: string;
  promptAnswer?: string;
}

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
  landlords: Landlord[];
  staysThanksgiving: boolean;
  staysSpringBreak: boolean;
  avatarColor: string;
  profileImage?: string;
  college?: string;
  organizations?: string[];
  intent?: Intent;
  vibeProfile?: VibeProfile;
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

export interface MutualFriend {
  name: string;
  email: string;
  avatarColor: string;
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
  landlords: Landlord[];
  zone: Zone;
  availableDuringBreaks: boolean;
  breakTypes: BreakType[];
  description: string;
  avatarColor: string;
  timestamp: number;
  category?: string;
  kitchenType?: KitchenType;
  bathroomType?: BathroomType;
  unitType?: string;
  isPrivateBedroom?: boolean;
  isPrivateBathroom?: boolean;
  floorPlanUrl?: string;
  roomsAvailable?: number;
  currentResidentBio?: string;
  listingType?: 'sublease' | 'roommate';
  moveInDate?: string;
  moveOutDate?: string;
  amenities?: Amenities;
  cleaningFrequency?: CleaningFrequency;
  shoePolicy?: ShoePolicy;
  images?: string[];
  eventTag?: string;
  subCategory?: string;
  hasParking?: boolean;
  roommatePreference?: string;
}

export type ConversationSource = "sublease" | "coseeker" | "crash_cash";

export interface Conversation {
  id: string;
  participant1Id: string;
  participant2Id: string;
  listingId: string;
  listingBuilding: string;
  listingPrice: number;
  listingUnitType?: string;
  lastMessage?: string;
  lastMessageAt?: number;
  otherUserName?: string;
  otherUserAvatar?: string;
  otherUserEmail?: string;
  otherUserProfileImage?: string;
  source?: ConversationSource;
  createdAt?: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: number;
  senderName?: string;
  senderAvatar?: string;
  /** Set only on this device until the server has the message. */
  status?: "sending" | "failed";
}


export type CrashVibe = "sos" | "offering";
export type CrashCurrency = "cash" | "boba" | "lion_cover" | "food" | "favor";

export type CrashPostStatus = "active" | "completed";

export interface CrashPost {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  avatarColor: string;
  vibe: CrashVibe;
  story: string;
  imageUrl: string;
  dates: string;
  targetDate: number;
  zone: Zone;
  currency: CrashCurrency;
  currencyLabel: string;
  timestamp: number;
  status: CrashPostStatus;
  approxLocation?: string;
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
  mutualFriends: MutualFriend[];
}

const DEMO_POSTS: SubleasePost[] = [
  {
    id: "sp1", userId: "u1", userName: "Mei Lin", userEmail: "meilin2@illinois.edu",
    buildingName: "Hub Champaign", address: "210 E Green St", leaseType: "fall_sublease",
    pricePerMonth: 950, landlords: ["american"], zone: "campustown",
    availableDuringBreaks: false, breakTypes: [],
    description: "Cozy 1BR/1BA in Hub, fully furnished. Floor-to-ceiling windows, great view.",
    avatarColor: "#1A7AAF", timestamp: Date.now() - 86400000, category: "semester_takeover",
    kitchenType: "private", moveInDate: "2026-08-15T14:00:00Z", moveOutDate: "2026-12-20T12:00:00Z",
    amenities: { isFurnished: true, hasLaundry: true, hasWifi: true, hasAC: true, hasStudyLounge: true, hasPrinting: false, hasBikeStorage: true, hasSecurity: true, utilsIncluded: true, noDeposit: false, parkingIncluded: false, hasGym: true, hasPool: true, hasElevator: true, hasRooftop: false, hasLockers: true },
    cleaningFrequency: "weekly", shoePolicy: "shoes_off", images: [],
  },
  {
    id: "sp2", userId: "u3", userName: "Jake Torres", userEmail: "jtorres6@illinois.edu",
    buildingName: "707 S Mathews", address: "707 S Mathews Ave", leaseType: "spring_sublease",
    pricePerMonth: 750, landlords: ["jsm"], zone: "north",
    availableDuringBreaks: true, breakTypes: ["spring_break"],
    description: "Studio apartment near Siebel. Quiet building, laundry in unit.",
    avatarColor: "#5A8A5A", timestamp: Date.now() - 172800000, category: "semester_takeover",
    kitchenType: "private", moveInDate: "2026-01-10T15:00:00Z", moveOutDate: "2026-05-15T12:00:00Z",
    amenities: { isFurnished: false, hasLaundry: true, hasWifi: true, hasAC: false, hasStudyLounge: false, hasPrinting: false, hasBikeStorage: true, hasSecurity: false, utilsIncluded: false, noDeposit: true, parkingIncluded: false, hasGym: false, hasPool: false, hasElevator: false, hasRooftop: false, hasLockers: false },
    cleaningFrequency: "weekly", shoePolicy: "no_policy", images: [],
  },
  {
    id: "sp3", userId: "u5", userName: "Marcus Webb", userEmail: "mwebb3@illinois.edu",
    buildingName: "Fairview Apts", address: "505 E Fairview", leaseType: "summer_sublease",
    pricePerMonth: 620, landlords: ["ugroup"], zone: "urbana",
    availableDuringBreaks: true, breakTypes: ["thanksgiving", "spring_break"],
    description: "1BR in quiet Urbana neighborhood. Perfect for grad students or summer research.",
    avatarColor: "#9B59B6", timestamp: Date.now() - 259200000, category: "summer_only",
    kitchenType: "private", moveInDate: "2026-05-15T14:00:00Z", moveOutDate: "2026-08-10T12:00:00Z",
    amenities: { isFurnished: true, hasLaundry: false, hasWifi: true, hasAC: true, hasStudyLounge: false, hasPrinting: false, hasBikeStorage: false, hasSecurity: false, utilsIncluded: true, noDeposit: false, parkingIncluded: true, hasGym: false, hasPool: false, hasElevator: false, hasRooftop: false, hasLockers: false },
    cleaningFrequency: "monthly", shoePolicy: "front_door", images: [],
  },
  {
    id: "sp4", userId: "u6", userName: "Sofia Reyes", userEmail: "sreyes2@illinois.edu",
    buildingName: "The Orchard", address: "301 S Race St", leaseType: "summer_sublease",
    pricePerMonth: 540, landlords: ["other"], zone: "urbana",
    availableDuringBreaks: false, breakTypes: [],
    description: "Sunny studio, available May 15 – Aug 10. Furnished, near MTD bus stop.",
    avatarColor: "#5A8A5A", timestamp: Date.now() - 345600000, category: "summer_only",
    kitchenType: "communal", moveInDate: "2026-05-15T10:00:00Z", moveOutDate: "2026-08-10T10:00:00Z",
    amenities: { isFurnished: true, hasLaundry: false, hasWifi: true, hasAC: false, hasStudyLounge: true, hasPrinting: true, hasBikeStorage: false, hasSecurity: true, utilsIncluded: true, noDeposit: true, parkingIncluded: false, hasGym: false, hasPool: false, hasElevator: false, hasRooftop: false, hasLockers: true },
    cleaningFrequency: "daily", shoePolicy: "shoes_off", images: [],
  },
  {
    id: "sp5", userId: "u7", userName: "Liam Park", userEmail: "lpark9@illinois.edu",
    buildingName: "Campustown Flats", address: "512 E Green St", leaseType: "fall_sublease",
    pricePerMonth: 890, landlords: ["bailey"], zone: "campustown",
    availableDuringBreaks: true, breakTypes: ["thanksgiving"],
    description: "1-2 weeks available in early August before fall lease starts. Great location.",
    avatarColor: "#E0BC00", timestamp: Date.now() - 432000000, category: "august_gap",
    kitchenType: "private", moveInDate: "2026-08-01T14:00:00Z", moveOutDate: "2026-08-14T12:00:00Z",
    amenities: { isFurnished: true, hasLaundry: true, hasWifi: true, hasAC: true, hasStudyLounge: false, hasPrinting: false, hasBikeStorage: true, hasSecurity: true, utilsIncluded: false, noDeposit: false, parkingIncluded: false, hasGym: true, hasPool: false, hasElevator: true, hasRooftop: true, hasLockers: false },
    cleaningFrequency: "weekly", shoePolicy: "front_door", images: [],
  },
  {
    id: "sp6", userId: "u8", userName: "Zoe Mitchell", userEmail: "zmitchell@illinois.edu",
    buildingName: "Stadium Terrace", address: "1001 S Cottage Grove", leaseType: "full_year",
    pricePerMonth: 760, landlords: ["smile"], zone: "south",
    availableDuringBreaks: true, breakTypes: ["thanksgiving"],
    description: "Moms Weekend & graduation weekend stay available. Great for families visiting!",
    avatarColor: "#CC5500", timestamp: Date.now() - 518400000, category: "short_term",
    kitchenType: "communal", moveInDate: "2026-08-15T12:00:00Z", moveOutDate: "2027-08-14T12:00:00Z",
    amenities: { isFurnished: false, hasLaundry: true, hasWifi: true, hasAC: true, hasStudyLounge: true, hasPrinting: true, hasBikeStorage: false, hasSecurity: true, utilsIncluded: false, noDeposit: false, parkingIncluded: true, hasGym: true, hasPool: false, hasElevator: true, hasRooftop: false, hasLockers: true },
    cleaningFrequency: "weekly", shoePolicy: "no_policy", images: [],
  },
  {
    id: "sp7", userId: "u4", userName: "Emily Chen", userEmail: "echen4@illinois.edu",
    buildingName: "309 E Chalmers", address: "309 E Chalmers St", leaseType: "fall_sublease",
    pricePerMonth: 680, landlords: ["jsm"], zone: "campustown",
    availableDuringBreaks: true, breakTypes: ["thanksgiving"],
    description: "Looking for a clean, quiet roommate to join our 4B4B. Girls preferred. Common area furnished.",
    avatarColor: "#D4748E", timestamp: Date.now() - 600000000, category: "semester_takeover",
    listingType: "roommate", roommatePreference: "Girls Only",
    roomsAvailable: 1, currentResidentBio: "3 junior girls, CS and business majors",
    kitchenType: "private", moveInDate: "2026-08-15T14:00:00Z", moveOutDate: "2027-08-14T12:00:00Z",
    amenities: { isFurnished: true, hasLaundry: true, hasWifi: true, hasAC: true, hasStudyLounge: false, hasPrinting: false, hasBikeStorage: true, hasSecurity: true, utilsIncluded: false, noDeposit: false, parkingIncluded: false, hasGym: false, hasPool: false, hasElevator: false, hasRooftop: false, hasLockers: false },
    cleaningFrequency: "weekly", shoePolicy: "shoes_off", images: [],
  },
  {
    id: "sp8", userId: "u9", userName: "Raj Patel", userEmail: "rpatel8@illinois.edu",
    buildingName: "Illini Tower", address: "409 E Chalmers St", leaseType: "spring_sublease",
    pricePerMonth: 820, landlords: ["american"], zone: "campustown",
    availableDuringBreaks: false, breakTypes: [],
    description: "Need 1 more for our 3B2B. We're all engineers, study hard and game on weekends.",
    avatarColor: "#4A90D9", timestamp: Date.now() - 700000000, category: "semester_takeover",
    listingType: "roommate", roommatePreference: "Grainger Grind",
    roomsAvailable: 1, currentResidentBio: "2 sophomore ECE/CS majors, clean and chill",
    kitchenType: "communal", moveInDate: "2026-01-10T15:00:00Z", moveOutDate: "2026-05-15T12:00:00Z",
    amenities: { isFurnished: true, hasLaundry: true, hasWifi: true, hasAC: true, hasStudyLounge: true, hasPrinting: true, hasBikeStorage: false, hasSecurity: true, utilsIncluded: true, noDeposit: false, parkingIncluded: false, hasGym: true, hasPool: false, hasElevator: true, hasRooftop: false, hasLockers: true },
    cleaningFrequency: "weekly", shoePolicy: "no_policy", images: [],
  },
  {
    id: "sp9", userId: "u2", userName: "Jordan Kim", userEmail: "jkim12@illinois.edu",
    buildingName: "512 E Stoughton", address: "512 E Stoughton St", leaseType: "full_year",
    pricePerMonth: 590, landlords: ["cpm"], zone: "north",
    availableDuringBreaks: true, breakTypes: ["thanksgiving", "spring_break"],
    description: "Open to anyone! 4B2B house near engineering quad. Super chill vibe, backyard + grill.",
    avatarColor: "#2ECC71", timestamp: Date.now() - 800000000, category: "semester_takeover",
    listingType: "roommate", roommatePreference: "Co-ed",
    roomsAvailable: 2, currentResidentBio: "1 junior MechE, 1 senior LAS. We host cookouts.",
    kitchenType: "private", moveInDate: "2026-08-15T14:00:00Z", moveOutDate: "2027-08-14T12:00:00Z",
    amenities: { isFurnished: false, hasLaundry: true, hasWifi: true, hasAC: false, hasStudyLounge: false, hasPrinting: false, hasBikeStorage: true, hasSecurity: false, utilsIncluded: false, noDeposit: true, parkingIncluded: true, hasGym: false, hasPool: false, hasElevator: false, hasRooftop: false, hasLockers: false },
    cleaningFrequency: "monthly", shoePolicy: "front_door", images: [],
  },
];

const DEMO_CRASH: CrashPost[] = [
  {
    id: "cr1", userId: "u2", userName: "Jake Thompson", userEmail: "jthom22@illinois.edu",
    avatarColor: "#CC5500", vibe: "sos",
    story: "Locked out of the Ike. Need a floor to sleep on, will buy you a Blue Guy at Kam's tomorrow.",
    imageUrl: "", dates: "Tonight only", targetDate: Date.now() + 86400000, zone: "south",
    currency: "food", currencyLabel: "🍺 Kam's Blue Guy",
    timestamp: Date.now() - 600000, status: "active",
  },
  {
    id: "cr2", userId: "u5", userName: "Marcus Williams", userEmail: "mwill5@illinois.edu",
    avatarColor: "#1A7AAF", vibe: "offering",
    story: "Roommate is gone. Got an air mattress near Grainger. Yours for $15 or a burrito from Maize.",
    imageUrl: "", dates: "Tomorrow – 3 days", targetDate: Date.now() + 259200000, zone: "north",
    currency: "cash", currencyLabel: "💵 $15",
    timestamp: Date.now() - 1800000, status: "active",
  },
  {
    id: "cr3", userId: "u4", userName: "Aisha Okonkwo", userEmail: "aokonkwo@illinois.edu",
    avatarColor: "#5A8A5A", vibe: "sos",
    story: "Flight got cancelled. Stranded at Willard with a suitcase and no plan. Can venmo or buy boba.",
    imageUrl: "", dates: "Tonight only", targetDate: Date.now() + 43200000, zone: "campustown",
    currency: "boba", currencyLabel: "🧋 Boba",
    timestamp: Date.now() - 3600000, status: "active",
  },
  {
    id: "cr4", userId: "u6", userName: "Sofia Reyes", userEmail: "sreyes2@illinois.edu",
    avatarColor: "#9B59B6", vibe: "offering",
    story: "Empty couch in my apartment all Moms Weekend. $20/night or cover me at Red Lion Saturday.",
    imageUrl: "", dates: "This weekend", targetDate: Date.now() + 432000000, zone: "campustown",
    currency: "lion_cover", currencyLabel: "🦁 Lion Cover",
    timestamp: Date.now() - 7200000, status: "active",
  },
  {
    id: "cr5", userId: "u7", userName: "Liam Park", userEmail: "lpark9@illinois.edu",
    avatarColor: "#E0BC00", vibe: "offering",
    story: "Subletting my studio for graduation weekend. Walk to Foellinger. Clean, private, AC.",
    imageUrl: "", dates: "May 9 – May 12", targetDate: Date.now() + 604800000, zone: "campustown",
    currency: "cash", currencyLabel: "💵 $40/night",
    timestamp: Date.now() - 14400000, status: "active",
  },
];

interface AppContextValue {
  currentUser: UserProfile | null;
  /** Caches on the device and saves to the users table; resolves true once saved. */
  setCurrentUser: (user: UserProfile | null) => Promise<boolean>;
  /** Why the profile isn't in the users table yet; null once it is. */
  profileSyncError: string | null;
  /** Re-runs the save immediately (it also retries on its own while failing). */
  retryProfileSync: () => Promise<void>;
  isOnboarded: boolean;
  setIsOnboarded: (v: boolean) => void;
  otpVerifiedEmail: string;
  setOtpVerifiedEmail: (email: string) => void;
  /** Other students' profiles from the users table (MOCK_USERS only when opted in). */
  users: UserProfile[];
  refreshUsers: () => Promise<void>;
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
  removeSublease: (id: string) => void;
  crashPosts: CrashPost[];
  addCrashPost: (post: CrashPost) => void;
  updateCrashPost: (id: string, updates: Partial<CrashPost>) => void;
  friends: FriendRecord[];
  addFriend: (friend: Omit<FriendRecord, "vouchedByMe" | "timestamp">) => Promise<void>;
  removeFriend: (email: string) => Promise<void>;
  toggleVouch: (email: string) => Promise<void>;
  getTrustInfo: (userEmail: string) => TrustInfo;
  /** From the conversations table; the device copy is only a cache for first paint. */
  conversations: Conversation[];
  /** Opens (or finds) the conversation on the server and resolves its id. Throws with a user-facing message. */
  startConversation: (targetUserId: string, targetName: string, targetAvatar: string, targetEmail: string, listingId: string, listingBuilding: string, listingPrice: number, listingUnitType?: string, targetProfileImage?: string, source?: ConversationSource) => Promise<string>;
  startMatchConversation: (targetUser: UserProfile) => Promise<string>;
  /** Shows the message at once; it stays marked "sending"/"failed" and is retried until the server has it. */
  sendMessage: (conversationId: string, content: string) => void;
  retryMessage: (messageId: string) => void;
  getMessages: (conversationId: string) => ChatMessage[];
  refreshConversations: () => Promise<void>;
  refreshMessages: (conversationId: string) => Promise<void>;
  /** Why the last load or send failed; null once one succeeds. */
  messagingError: string | null;
  /** Records the like and resolves true if they had already liked us back. */
  likeUser: (user: UserProfile) => Promise<boolean>;
}

/** MOCK_USERS who "already liked you" — only consulted when USE_MOCK_USERS is on. */
const MOCK_LIKED_BY_IDS = ["u1", "u3", "u5", "u7"];

/** Set EXPO_PUBLIC_USE_MOCK_USERS=true to swipe through MOCK_USERS in development. */
const USE_MOCK_USERS = process.env.EXPO_PUBLIC_USE_MOCK_USERS === "true";

const USER_KEY = "@popmatch_user";
/** Set while the cached profile has changes the server hasn't accepted yet. */
const UNSYNCED_KEY = "@popmatch_user_unsynced";
const SYNC_RETRY_MS = 30000;
const CONVERSATIONS_KEY = "@popmatch_conversations";
const CHAT_MESSAGES_KEY = "@popmatch_chatmessages";
const MESSAGE_RETRY_MS = 5000;

/** Server rows win; unsent local ones (status set) are kept until the server has them. */
function mergeMessages(local: ChatMessage[], server: ChatMessage[], conversationId: string): ChatMessage[] {
  const serverIds = new Set(server.map(m => m.id));
  const others = local.filter(m => m.conversationId !== conversationId);
  const unsent = local.filter(m => m.conversationId === conversationId && m.status && !serverIds.has(m.id));
  return [...others, ...server, ...unsent];
}

function newId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

const AppContext = createContext<AppContextValue | null>(null);

/** Demo profiles for development only — see USE_MOCK_USERS. */
export const MOCK_USERS: UserProfile[] = [
  {
    id: "u1", name: "Mei Lin", email: "meilin2@illinois.edu", major: "Computer Science",
    bio: "Early riser, love cooking Asian food. Looking for a quiet study buddy!",
    budget: 850, gender: "female", genderPref: "girls_only", cleanliness: 5, noise: 2,
    leaseType: "fall_sublease", zone: "north", landlords: ["jsm"],
    staysThanksgiving: false, staysSpringBreak: true, avatarColor: "#1A7AAF",
    college: "Grainger", organizations: ["ACM@UIUC", "WCS"],
    vibeProfile: { identity: "girl", lookingFor: "girls", starSign: "virgo", mbti: "INTJ", year: "junior", vices: ["no_vices"], pets: ["cats"], sleep: "early_bird", alarms: "one_alarm", cleanlinessVibe: "neat_freak", groceries: "meal_prep", guests: "occasional", prompt: "My toxic living habit is...", promptAnswer: "Reorganizing the entire kitchen at midnight." },
  },
  {
    id: "u2", name: "Priya Sharma", email: "psharma4@illinois.edu", major: "Finance",
    bio: "Coffee addict, gym rat. Weekend brunches and casual hangouts.",
    budget: 950, gender: "female", genderPref: "girls_only", cleanliness: 4, noise: 3,
    leaseType: "spring_sublease", zone: "campustown", landlords: ["bailey"],
    staysThanksgiving: true, staysSpringBreak: true, avatarColor: "#CC5500",
    college: "Gies", organizations: ["Illini Finance Club", "DECA"],
    vibeProfile: { identity: "girl", lookingFor: "girls", starSign: "leo", mbti: "ENFJ", year: "senior", greekLife: "sorority", vices: ["social_smoker"], pets: ["no_pets"], sleep: "night_owl", alarms: "multiple_alarms", cleanlinessVibe: "tidy", groceries: "takeout", guests: "love_hosting", prompt: "The way to my heart is...", promptAnswer: "Sunday brunch and a solid skincare routine." },
  },
  {
    id: "u3", name: "Jake Torres", email: "jtorres6@illinois.edu", major: "Mechanical Engineering",
    bio: "Night owl who loves gaming and pizza runs at 2am. Very chill.",
    budget: 750, gender: "male", genderPref: "mixed", cleanliness: 3, noise: 4,
    leaseType: "full_year", zone: "north", landlords: ["ugroup"],
    staysThanksgiving: true, staysSpringBreak: false, avatarColor: "#5A8A5A",
    college: "Grainger", organizations: ["SWE", "Tau Beta Pi"],
    vibeProfile: { identity: "guy", lookingFor: "coed", starSign: "sagittarius", mbti: "ISTP", year: "junior", vices: ["420_friendly", "drinks_socially"], pets: ["no_pets"], sleep: "night_owl", alarms: "no_alarm", cleanlinessVibe: "organized_chaos", groceries: "snack_hoarder", guests: "love_hosting", prompt: "My toxic living habit is...", promptAnswer: "Leaving my gaming headset on the kitchen counter." },
  },
  {
    id: "u4", name: "Aisha Okonkwo", email: "aokonkwo@illinois.edu", major: "Psychology",
    bio: "Plant mom, sunset chaser, and podcast listener. Clean and organized.",
    budget: 800, gender: "female", genderPref: "girls_only", cleanliness: 5, noise: 2,
    leaseType: "full_year", zone: "urbana", landlords: ["other"],
    staysThanksgiving: false, staysSpringBreak: false, avatarColor: "#E07B00",
    college: "LAS", organizations: ["BSA", "Illini 4000"],
    vibeProfile: { identity: "girl", lookingFor: "girls", starSign: "pisces", mbti: "INFP", year: "sophomore", vices: ["no_vices"], pets: ["plants"], sleep: "early_bird", alarms: "one_alarm", cleanlinessVibe: "neat_freak", groceries: "meal_prep", guests: "occasional", prompt: "I need a roommate who...", promptAnswer: "Won't judge my 47 houseplants." },
  },
  {
    id: "u5", name: "Marcus Webb", email: "mwebb3@illinois.edu", major: "Architecture",
    bio: "Studio hours are late but I keep my space spotless. Love jazz.",
    budget: 900, gender: "male", genderPref: "boys_only", cleanliness: 4, noise: 2,
    leaseType: "fall_sublease", zone: "downtown", landlords: ["american"],
    staysThanksgiving: false, staysSpringBreak: false, avatarColor: "#9B59B6",
    college: "FAA", organizations: ["AIAS"],
    vibeProfile: { identity: "guy", lookingFor: "guys", starSign: "capricorn", mbti: "INTJ", year: "senior", vices: ["no_vices"], pets: ["no_pets"], sleep: "night_owl", alarms: "one_alarm", cleanlinessVibe: "neat_freak", groceries: "meal_prep", guests: "rarely", prompt: "The way to my heart is...", promptAnswer: "Good jazz and a clean kitchen counter." },
  },
  {
    id: "u6", name: "Sofia Reyes", email: "sreyes2@illinois.edu", major: "Biology",
    bio: "Pre-med grind, but I make time for friends. Quiet during finals week!",
    budget: 700, gender: "female", genderPref: "girls_only", cleanliness: 4, noise: 2,
    leaseType: "spring_sublease", zone: "south", landlords: ["jsm"],
    staysThanksgiving: true, staysSpringBreak: true, avatarColor: "#5A8A5A",
    college: "LAS", organizations: ["Illini Pre-Med", "Phi Delta Epsilon"],
    vibeProfile: { identity: "girl", lookingFor: "girls", starSign: "cancer", mbti: "ISFJ", year: "junior", greekLife: "prof_frat", vices: ["drinks_socially"], pets: ["cats"], sleep: "early_bird", alarms: "multiple_alarms", cleanlinessVibe: "tidy", groceries: "meal_prep", guests: "occasional", prompt: "My toxic living habit is...", promptAnswer: "Studying in the living room until 3am during finals." },
  },
  {
    id: "u7", name: "Liam Park", email: "lpark9@illinois.edu", major: "Statistics",
    bio: "Data nerd by day, chef by night. My bibimbap will change your life.",
    budget: 850, gender: "male", genderPref: "mixed", cleanliness: 3, noise: 3,
    leaseType: "full_year", zone: "campustown", landlords: ["ugroup"],
    staysThanksgiving: false, staysSpringBreak: true, avatarColor: "#E0BC00",
    college: "LAS", organizations: ["Korean Cultural Association", "DataSci@UIUC"],
    vibeProfile: { identity: "guy", lookingFor: "coed", starSign: "gemini", mbti: "ENTP", year: "senior", vices: ["drinks_socially"], pets: ["no_pets"], sleep: "night_owl", alarms: "multiple_alarms", cleanlinessVibe: "organized_chaos", groceries: "snack_hoarder", guests: "love_hosting", prompt: "I need a roommate who...", promptAnswer: "Appreciates a home-cooked Korean meal at midnight." },
  },
  {
    id: "u8", name: "Zoe Mitchell", email: "zmitchell@illinois.edu", major: "Journalism",
    bio: "Always writing, always reading. I have a cat (hypoallergenic!).",
    budget: 780, gender: "female", genderPref: "girls_only", cleanliness: 4, noise: 1,
    leaseType: "spring_sublease", zone: "urbana", landlords: ["other"],
    staysThanksgiving: true, staysSpringBreak: false, avatarColor: "#CC5500",
    college: "Media", organizations: ["Daily Illini", "SPJ"],
    vibeProfile: { identity: "girl", lookingFor: "girls", starSign: "aquarius", mbti: "INFJ", year: "sophomore", vices: ["no_vices"], pets: ["cats"], sleep: "early_bird", alarms: "one_alarm", cleanlinessVibe: "tidy", groceries: "meal_prep", guests: "rarely", prompt: "The way to my heart is...", promptAnswer: "Quiet reading time with my cat on the couch." },
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
  const [profileSyncError, setProfileSyncError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserProfile[]>(USE_MOCK_USERS ? MOCK_USERS : []);
  const [isOnboarded, setIsOnboardedState] = useState(false);
  const [otpVerifiedEmail, setOtpVerifiedEmailState] = useState("");
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [scamBannerDismissed, setScamBannerDismissed] = useState(false);
  const [likedUserIds, setLikedUserIds] = useState<string[]>([]);
  const [passedUserIds, setPassedUserIds] = useState<string[]>([]);
  const [subleases, setSubleases] = useState<SubleasePost[]>(DEMO_POSTS);
  const [crashPosts, setCrashPosts] = useState<CrashPost[]>(DEMO_CRASH);
  const [friends, setFriends] = useState<FriendRecord[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [messagingError, setMessagingError] = useState<string | null>(null);
  /** The users.id the server confirmed for this email. Messaging uses only this, never a locally generated id. */
  const serverIdRef = useRef<{ email: string; id: string } | null>(null);
  /** No cache writes until the cache has been read, or an empty first render would wipe it. */
  const messagingHydrated = useRef(false);
  const sendingIds = useRef(new Set<string>());

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(USER_KEY);
        const onboarded = await AsyncStorage.getItem("@popmatch_onboarded");
        const storedMatches = await AsyncStorage.getItem("@popmatch_matches");
        const storedLiked = await AsyncStorage.getItem("@popmatch_liked");
        const storedPassed = await AsyncStorage.getItem("@popmatch_passed");
        const scamDismissed = await AsyncStorage.getItem("@popmatch_scam");
        const storedSubleases = await AsyncStorage.getItem("@popmatch_subleases");
        const storedCrash = await AsyncStorage.getItem("@popmatch_crash");
        const storedFriends = await AsyncStorage.getItem("@popmatch_friends");
        const storedConvos = await AsyncStorage.getItem(CONVERSATIONS_KEY);
        const storedChatMsgs = await AsyncStorage.getItem(CHAT_MESSAGES_KEY);

        if (stored) {
          const cached: UserProfile = JSON.parse(stored);
          setCurrentUserState(cached);
          syncProfile(cached);
        }
        if (onboarded === "true") setIsOnboardedState(true);
        if (storedMatches) setMatches(JSON.parse(storedMatches));
        if (storedLiked) setLikedUserIds(JSON.parse(storedLiked));
        if (storedPassed) setPassedUserIds(JSON.parse(storedPassed));
        if (scamDismissed === "true") setScamBannerDismissed(true);
        if (storedSubleases) setSubleases(JSON.parse(storedSubleases));
        if (storedCrash) setCrashPosts(JSON.parse(storedCrash));
        if (storedFriends) setFriends(JSON.parse(storedFriends));
        // Cache only: anything already fetched from the server wins. A send
        // the app was closed in the middle of is unconfirmed, so it's retried.
        if (storedConvos) {
          const cached: Conversation[] = JSON.parse(storedConvos);
          setConversations(prev => (prev.length ? prev : cached));
        }
        if (storedChatMsgs) {
          const cached: ChatMessage[] = JSON.parse(storedChatMsgs);
          setChatMessages(prev => {
            const fetched = new Set(prev.map(m => m.id));
            const restored = cached
              .filter(m => !fetched.has(m.id))
              .map(m => (m.status ? { ...m, status: "failed" as const } : m));
            return [...restored, ...prev];
          });
        }
      } catch (error) {
        console.error("Couldn't read the device cache:", error);
      } finally {
        messagingHydrated.current = true;
      }
    })();
  }, []);

  useEffect(() => {
    if (!messagingHydrated.current) return;
    AsyncStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations)).catch(error =>
      console.error("Couldn't cache conversations:", error));
  }, [conversations]);

  useEffect(() => {
    if (!messagingHydrated.current) return;
    AsyncStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(chatMessages)).catch(error =>
      console.error("Couldn't cache messages:", error));
  }, [chatMessages]);

  const cacheUser = async (user: UserProfile | null) => {
    if (user) await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    else await AsyncStorage.multiRemove([USER_KEY, UNSYNCED_KEY]);
  };

  /** The server may hand back a different id (upsert by email keeps the original). */
  const adoptServerId = async (saved: UserProfile) => {
    serverIdRef.current = { email: saved.email.toLowerCase(), id: saved.id };
    setCurrentUserState(prev => {
      if (!prev || prev.email !== saved.email || prev.id === saved.id) return prev;
      const next = { ...prev, id: saved.id };
      cacheUser(next).catch(() => {});
      return next;
    });
  };

  /** console.error, not warn: a profile stuck on the device is a real bug. */
  const reportSyncFailure = (what: string, error: unknown) => {
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`[profile sync] ${what}:`, error);
    setProfileSyncError(detail);
  };

  const pushProfile = async (user: UserProfile): Promise<boolean> => {
    try {
      const saved = await saveUserProfile(user);
      await AsyncStorage.removeItem(UNSYNCED_KEY);
      await adoptServerId(saved);
      setProfileSyncError(null);
      return true;
    } catch (error) {
      reportSyncFailure("Saving profile to the server failed; kept on device and will retry", error);
      await AsyncStorage.setItem(UNSYNCED_KEY, "true").catch(() => {});
      return false;
    }
  };

  /**
   * Runs on launch and on every retry: push a save that never landed,
   * otherwise refresh the cache from the users table. Profiles made before
   * onboarding saved to the server have no row yet, so those get pushed too.
   */
  const syncProfile = async (cached: UserProfile) => {
    try {
      if ((await AsyncStorage.getItem(UNSYNCED_KEY)) === "true") {
        await pushProfile(cached);
        return;
      }
      const server = await fetchUserProfile(cached.email);
      if (!server) {
        await pushProfile(cached);
        return;
      }
      const merged = mergeProfile(cached, server);
      serverIdRef.current = { email: server.email.toLowerCase(), id: server.id };
      setCurrentUserState(prev => (prev?.email === merged.email ? merged : prev));
      await cacheUser(merged);
      setProfileSyncError(null);
    } catch (error) {
      reportSyncFailure("Couldn't reach the server for the profile; using the cached copy", error);
    }
  };

  /** Reads the cache rather than state so a retry always sends the latest edits. */
  const retryProfileSync = async () => {
    const stored = await AsyncStorage.getItem(USER_KEY);
    if (stored) await syncProfile(JSON.parse(stored));
    else setProfileSyncError(null);
  };

  // Until the profile lands, keep trying in the background — reloading the
  // app shouldn't be the only way a failed save ever gets retried.
  useEffect(() => {
    if (!profileSyncError) return;
    const timer = setInterval(retryProfileSync, SYNC_RETRY_MS);
    return () => clearInterval(timer);
  }, [profileSyncError]);

  const setCurrentUser = async (user: UserProfile | null): Promise<boolean> => {
    setCurrentUserState(user);
    await cacheUser(user);
    if (!user) {
      setProfileSyncError(null);
      // The next person to sign in on this device mustn't see these, and
      // unsent ones couldn't be sent as them anyway.
      serverIdRef.current = null;
      setConversations([]);
      setChatMessages([]);
      setMessagingError(null);
      return true;
    }
    return pushProfile(user);
  };

  const refreshUsers = async () => {
    if (USE_MOCK_USERS) return;
    try {
      const list = await fetchUsers(currentUser?.email);
      setUsers(list.filter(u => u.id !== currentUser?.id && u.email !== currentUser?.email));
    } catch (error) {
      console.warn("Couldn't load profiles:", error);
    }
  };

  useEffect(() => {
    refreshUsers();
  }, [currentUser?.email]);

  const setIsOnboarded = async (v: boolean) => {
    setIsOnboardedState(v);
    await AsyncStorage.setItem("@popmatch_onboarded", v ? "true" : "false");
  };

  const setOtpVerifiedEmail = (email: string) => {
    setOtpVerifiedEmailState(email);
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

  const removeSublease = async (id: string) => {
    const updated = subleases.filter(s => s.id !== id);
    setSubleases(updated);
    await AsyncStorage.setItem("@popmatch_subleases", JSON.stringify(updated));
  };

  const addCrashPost = async (post: CrashPost) => {
    const updated = [post, ...crashPosts];
    setCrashPosts(updated);
    await AsyncStorage.setItem("@popmatch_crash", JSON.stringify(updated));
  };

  const updateCrashPost = async (id: string, updates: Partial<CrashPost>) => {
    const updated = crashPosts.map(p => p.id === id ? { ...p, ...updates } : p);
    setCrashPosts(updated);
    await AsyncStorage.setItem("@popmatch_crash", JSON.stringify(updated));
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

  /** console.error plus messagingError, so the chat and inbox can say so. */
  const reportMessagingFailure = (what: string, error: unknown) => {
    console.error(`[messaging] ${what}:`, error);
    setMessagingError(apiErrorMessage(error));
  };

  /**
   * The id conversations and messages are keyed on. Only an id the server
   * returned counts: until the profile has saved, currentUser.id may be one
   * this device generated, and messages sent under it would reach no one.
   */
  const resolveMyId = async (): Promise<string> => {
    if (!currentUser) throw new Error("Sign in to send messages.");
    const email = currentUser.email.toLowerCase();
    if (serverIdRef.current?.email === email) return serverIdRef.current.id;
    const server = await fetchUserProfile(email);
    if (!server) {
      throw new Error("Your profile hasn't reached the server yet, so messages can't be sent. It's retrying.");
    }
    await adoptServerId(server);
    return server.id;
  };

  /** listingUnitType and source have no columns; keep whatever this device knew. */
  const storeConversation = (conv: Conversation, local: Partial<Conversation>) => {
    setConversations(prev => [{ ...conv, ...local }, ...prev.filter(c => c.id !== conv.id)]);
  };

  const startConversation = async (_targetUserId: string, targetName: string, _targetAvatar: string, targetEmail: string, listingId: string, listingBuilding: string, listingPrice: number, listingUnitType?: string, _targetProfileImage?: string, source?: ConversationSource): Promise<string> => {
    try {
      const myId = await resolveMyId();
      // A post carries whatever id its author's device had at the time; the
      // users table is the authority, looked up by email the way likes are.
      const target = await fetchUserProfile(targetEmail);
      if (!target) throw new Error(`${targetName} isn't on PopMatch yet, so messages can't reach them.`);
      const conv = await openConversation({
        participant1Id: myId, participant2Id: target.id, listingId, listingBuilding, listingPrice,
      });
      storeConversation(conv, { listingUnitType, source });
      return conv.id;
    } catch (error) {
      console.error("[messaging] Couldn't open the conversation:", error);
      throw new Error(apiErrorMessage(error));
    }
  };

  const startMatchConversation = async (targetUser: UserProfile): Promise<string> => {
    try {
      const myId = await resolveMyId();
      // Sorted so both people get the same listing id, whichever of them opens it.
      const [a, b] = [myId, targetUser.id].sort();
      const conv = await openConversation({
        participant1Id: myId, participant2Id: targetUser.id,
        listingId: `match_${a}_${b}`, listingBuilding: "Matchmaker", listingPrice: 0,
      });
      storeConversation(conv, { listingUnitType: "Roommate Match", source: "coseeker" });
      return conv.id;
    } catch (error) {
      console.error("[messaging] Couldn't open the match conversation:", error);
      throw new Error(apiErrorMessage(error));
    }
  };

  const refreshConversations = async () => {
    if (!currentUser) return;
    try {
      const myId = await resolveMyId();
      const list = await fetchConversations(myId);
      if (serverIdRef.current?.id !== myId) return; // signed out meanwhile
      setConversations(prev => {
        const known = new Map(prev.map(c => [c.id, c]));
        return list.map(c => ({
          ...c,
          listingUnitType: known.get(c.id)?.listingUnitType
            ?? (c.listingId.startsWith("match_") ? "Roommate Match" : undefined),
          source: known.get(c.id)?.source,
        }));
      });
      setMessagingError(null);
    } catch (error) {
      reportMessagingFailure("Couldn't load conversations; showing the cached copy", error);
    }
  };

  useEffect(() => {
    refreshConversations();
  }, [currentUser?.email]);

  /** When each send was confirmed, so a fetch that started earlier can't hide it. */
  const confirmedAt = useRef(new Map<string, number>());

  const refreshMessages = async (conversationId: string) => {
    if (!currentUser) return;
    const startedAt = Date.now();
    try {
      const list = await fetchMessages(conversationId);
      const serverIds = new Set(list.map(m => m.id));
      setChatMessages(prev => {
        const landedSince = prev.filter(m =>
          m.conversationId === conversationId && !m.status && !serverIds.has(m.id) &&
          (confirmedAt.current.get(m.id) ?? 0) > startedAt);
        return [...mergeMessages(prev, list, conversationId), ...landedSince];
      });
      setMessagingError(null);
    } catch (error) {
      reportMessagingFailure("Couldn't load messages; showing the cached copy", error);
    }
  };

  const deliver = async (msg: ChatMessage) => {
    if (sendingIds.current.has(msg.id)) return;
    sendingIds.current.add(msg.id);
    setChatMessages(prev => prev.map(m => (m.id === msg.id ? { ...m, status: "sending" } : m)));
    try {
      const senderId = await resolveMyId();
      const saved = await postMessage({
        id: msg.id, conversationId: msg.conversationId, senderId, content: msg.content,
      });
      confirmedAt.current.set(saved.id, Date.now());
      setChatMessages(prev => prev.map(m => (m.id === msg.id ? saved : m)));
      setMessagingError(null);
    } catch (error) {
      setChatMessages(prev => prev.map(m => (m.id === msg.id ? { ...m, status: "failed" } : m)));
      reportMessagingFailure("Message not sent; kept on this device and retrying", error);
    } finally {
      sendingIds.current.delete(msg.id);
    }
  };

  const sendMessage = (conversationId: string, content: string) => {
    if (!currentUser) return;
    const msg: ChatMessage = {
      id: newId(),
      conversationId,
      senderId: serverIdRef.current?.id ?? currentUser.id,
      content,
      createdAt: Date.now(),
      status: "sending",
    };
    setChatMessages(prev => [...prev, msg]);
    setConversations(prev => prev.map(c =>
      c.id === conversationId ? { ...c, lastMessage: content, lastMessageAt: msg.createdAt } : c
    ));
    deliver(msg);
  };

  // The retry timer outlives renders, so it reads these instead of a closure.
  const chatMessagesRef = useRef(chatMessages);
  chatMessagesRef.current = chatMessages;
  const deliverRef = useRef(deliver);
  deliverRef.current = deliver;

  const retryMessage = (messageId: string) => {
    const msg = chatMessagesRef.current.find(m => m.id === messageId && m.status);
    if (msg) deliverRef.current(msg);
  };

  // A failed send is never dropped: keep retrying until the server has it.
  const hasFailedMessages = chatMessages.some(m => m.status === "failed");
  useEffect(() => {
    if (!hasFailedMessages) return;
    const timer = setInterval(() => {
      chatMessagesRef.current.filter(m => m.status === "failed").forEach(m => deliverRef.current(m));
    }, MESSAGE_RETRY_MS);
    return () => clearInterval(timer);
  }, [hasFailedMessages]);

  const getMessages = (conversationId: string): ChatMessage[] => {
    return chatMessages.filter(m => m.conversationId === conversationId).sort((a, b) => a.createdAt - b.createdAt);
  };

  const likeUser = async (user: UserProfile): Promise<boolean> => {
    if (USE_MOCK_USERS) return MOCK_LIKED_BY_IDS.includes(user.id);
    if (!currentUser) return false;
    try {
      await saveLike(currentUser.email, user.email);
      const mutual = await fetchMutualMatches(currentUser.email);
      return mutual.some(m => m.email === user.email.toLowerCase());
    } catch (error) {
      console.warn("Couldn't save the like to the server:", error);
      return false;
    }
  };

  const getTrustInfo = (userEmail: string): TrustInfo => {
    const directFriend = friends.find(f => f.email === userEmail);
    if (directFriend) {
      return {
        degree: 1,
        isFriend: true,
        vouchedByFriend: directFriend.vouchedByMe ? "You vouched for them" : null,
        sharedOrg: null,
        mutualFriends: [],
      };
    }

    const targetMockUser = users.find(u => u.email === userEmail);
    if (!targetMockUser) {
      return { degree: null, isFriend: false, vouchedByFriend: null, sharedOrg: null, mutualFriends: [] };
    }

    const mutuals: MutualFriend[] = [];

    for (const friend of friends) {
      const friendMockUser = users.find(u => u.email === friend.email);
      if (!friendMockUser) continue;

      const friendKnowsTarget = (friendMockUser.organizations || []).some(
        org => (targetMockUser.organizations || []).includes(org)
      );

      if (friendKnowsTarget) {
        mutuals.push({
          name: friend.name,
          email: friend.email,
          avatarColor: friend.avatarColor,
        });
      }
    }

    if (mutuals.length > 0) {
      const vouchedFriend = friends.find(f => f.vouchedByMe && mutuals.some(m => m.email === f.email));
      const sharedOrg = (currentUser?.organizations || []).find(
        org => (targetMockUser.organizations || []).includes(org)
      ) ?? null;
      return {
        degree: 2,
        isFriend: false,
        vouchedByFriend: vouchedFriend ? vouchedFriend.name : null,
        sharedOrg,
        mutualFriends: mutuals,
      };
    }

    const sharedOrg = (currentUser?.organizations || []).find(
      org => (targetMockUser.organizations || []).includes(org)
    ) ?? null;

    if (sharedOrg) {
      return { degree: null, isFriend: false, vouchedByFriend: null, sharedOrg, mutualFriends: [] };
    }

    return { degree: null, isFriend: false, vouchedByFriend: null, sharedOrg: null, mutualFriends: [] };
  };

  const value = useMemo(() => ({
    currentUser, setCurrentUser, profileSyncError, retryProfileSync, isOnboarded, setIsOnboarded,
    otpVerifiedEmail, setOtpVerifiedEmail,
    users, refreshUsers, matches, addMatch, scamBannerDismissed, dismissScamBanner,
    likedUserIds, passedUserIds, addLiked, addPassed, computeScore,
    subleases, addSublease, removeSublease,
    crashPosts, addCrashPost, updateCrashPost,
    friends, addFriend, removeFriend, toggleVouch, getTrustInfo,
    conversations, startConversation, startMatchConversation, sendMessage, retryMessage, getMessages,
    refreshConversations, refreshMessages, messagingError,
    likeUser,
  }), [
    currentUser, profileSyncError, users, isOnboarded, otpVerifiedEmail, matches, scamBannerDismissed,
    likedUserIds, passedUserIds, subleases, crashPosts, friends,
    conversations, chatMessages, messagingError
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
