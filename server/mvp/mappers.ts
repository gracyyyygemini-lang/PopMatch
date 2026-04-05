import { publicStorageUrl } from "../lib/supabaseAdmin";

const LISTING_IMG_BUCKET = "listing-images";

export type ProfileRow = Record<string, unknown>;

export function mapProfileToClient(row: ProfileRow) {
  const landlord = row.landlord;
  let landlords: unknown[] = [];
  if (Array.isArray(landlord)) landlords = landlord;
  else if (typeof landlord === "string") {
    try {
      landlords = JSON.parse(landlord) as unknown[];
    } catch {
      landlords = [];
    }
  }
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    major: row.major as string,
    bio: row.bio as string,
    budget: row.budget as number,
    gender: row.gender as string,
    genderPref: row.gender_pref as string,
    cleanliness: row.cleanliness as number,
    noise: row.noise as number,
    leaseType: row.lease_type as string,
    zone: row.zone as string,
    landlords,
    staysThanksgiving: row.stays_thanksgiving as boolean,
    staysSpringBreak: row.stays_spring_break as boolean,
    avatarColor: row.avatar_color as string,
    college: row.college as string,
    organizations: (row.organizations as string[]) ?? [],
    intent: row.intent as string | undefined,
    profileImage: (row.profile_image_url as string) || undefined,
    vibeProfile: (row.vibe_profile as Record<string, unknown>) || undefined,
  };
}

type ListingRow = Record<string, unknown>;
type OwnerRow = { id: string; name: string; email: string; avatar_color: string };
type ImgRow = { listing_id: string; storage_path: string; sort_order: number };

export function mapListingToSubleasePost(
  listing: ListingRow,
  owner: OwnerRow | undefined,
  images: ImgRow[],
  floorPlanPath?: string | null,
): Record<string, unknown> {
  const extras = (listing.extras as Record<string, unknown>) ?? {};
  const landlord = listing.landlord;
  const landlordsParsed =
    Array.isArray(landlord) ? landlord : typeof landlord === "string" ? JSON.parse(landlord as string) : [];

  const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order);
  const imageUrls = sorted.map((im) => publicStorageUrl(LISTING_IMG_BUCKET, im.storage_path));

  let floorPlanUrl = (extras.floorPlanUrl as string) || undefined;
  if (!floorPlanUrl && floorPlanPath) {
    floorPlanUrl = publicStorageUrl(LISTING_IMG_BUCKET, floorPlanPath);
  }

  const created = listing.created_at ? new Date(listing.created_at as string).getTime() : Date.now();

  return {
    id: listing.id as string,
    userId: listing.owner_profile_id as string,
    userName: owner?.name ?? "Student",
    userEmail: owner?.email ?? "",
    buildingName: listing.building_name as string,
    address: listing.address as string,
    leaseType: listing.lease_type as string,
    pricePerMonth: listing.price_per_month as number,
    landlords: landlordsParsed,
    zone: listing.zone as string,
    availableDuringBreaks: listing.available_during_breaks as boolean,
    breakTypes: (listing.break_types as string[]) ?? [],
    description: listing.description as string,
    avatarColor: owner?.avatar_color ?? "#005F73",
    timestamp: created,
    category: listing.category as string,
    kitchenType: extras.kitchenType,
    bathroomType: extras.bathroomType,
    unitType: extras.unitType,
    isPrivateBedroom: extras.isPrivateBedroom,
    isPrivateBathroom: extras.isPrivateBathroom,
    floorPlanUrl,
    roomsAvailable: extras.roomsAvailable,
    currentResidentBio: extras.currentResidentBio,
    listingType: extras.listingType ?? "sublease",
    moveInDate: extras.moveInDate,
    moveOutDate: extras.moveOutDate,
    amenities: extras.amenities,
    cleaningFrequency: extras.cleaningFrequency,
    shoePolicy: extras.shoePolicy,
    images: imageUrls.length > 0 ? imageUrls : undefined,
    eventTag: extras.eventTag,
    subCategory: extras.subCategory,
    hasParking: extras.hasParking,
    roommatePreference: extras.roommatePreference,
  };
}
