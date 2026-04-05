import type { UserProfile } from "@/context/AppContext";
import { apiJson } from "./client";

type ApiProfile = Record<string, unknown>;

function toUserProfile(p: ApiProfile): UserProfile {
  return {
    id: p.id as string,
    name: p.name as string,
    email: p.email as string,
    major: (p.major as string) || "",
    bio: (p.bio as string) || "",
    budget: typeof p.budget === "number" ? p.budget : 800,
    gender: (p.gender as UserProfile["gender"]) || "nonbinary",
    genderPref: (p.genderPref as UserProfile["genderPref"]) || "mixed",
    cleanliness: typeof p.cleanliness === "number" ? p.cleanliness : 3,
    noise: typeof p.noise === "number" ? p.noise : 3,
    leaseType: (p.leaseType as UserProfile["leaseType"]) || "full_year",
    zone: (p.zone as UserProfile["zone"]) || "campustown",
    landlords: (Array.isArray(p.landlords) ? p.landlords : []) as UserProfile["landlords"],
    staysThanksgiving: !!p.staysThanksgiving,
    staysSpringBreak: !!p.staysSpringBreak,
    avatarColor: (p.avatarColor as string) || "#005F73",
    profileImage: p.profileImage as string | undefined,
    college: p.college as string | undefined,
    organizations: (p.organizations as string[]) || [],
    intent: p.intent as UserProfile["intent"],
    vibeProfile: p.vibeProfile as UserProfile["vibeProfile"],
  };
}

export async function bootstrapProfile(body?: { email?: string; name?: string }): Promise<UserProfile> {
  const raw = await apiJson<ApiProfile>("/api/me/bootstrap", {
    method: "POST",
    body: JSON.stringify(body ?? {}),
  });
  return toUserProfile(raw);
}

export async function fetchMyProfile(): Promise<UserProfile> {
  const raw = await apiJson<ApiProfile>("/api/me/profile");
  return toUserProfile(raw);
}

export async function saveMyProfile(partial: Partial<UserProfile>): Promise<UserProfile> {
  const raw = await apiJson<ApiProfile>("/api/me/profile", {
    method: "PUT",
    body: JSON.stringify(partial),
  });
  return toUserProfile(raw);
}

export async function signProfileImageUpload(fileExt: string): Promise<{
  path: string;
  token: string;
  signedUrl: string;
  publicUrl: string;
}> {
  return apiJson("/api/me/profile-image/sign", {
    method: "POST",
    body: JSON.stringify({ fileExt }),
  });
}

export async function commitProfileImage(path: string): Promise<UserProfile> {
  const raw = await apiJson<ApiProfile>("/api/me/profile-image/commit", {
    method: "POST",
    body: JSON.stringify({ path }),
  });
  return toUserProfile(raw);
}
