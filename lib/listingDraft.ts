import AsyncStorage from "@react-native-async-storage/async-storage";

// One unfinished listing per student, kept on the device until it's published.
// Keyed by email rather than profile id: re-running onboarding can mint a new
// id, but the email is what the server upserts on.
const DRAFT_PREFIX = "@popmatch_listing_draft:";

export interface ListingDraft {
  /** post-sublease's ?mode= ("host", "sublessor", or none for a plain sublease). */
  mode?: string;
  step: number;
  postId: string;
  fields: Record<string, unknown>;
  bannerDismissed?: boolean;
  updatedAt: number;
}

const keyFor = (email: string) => DRAFT_PREFIX + email.toLowerCase().trim();

export async function loadListingDraft(email: string | undefined): Promise<ListingDraft | null> {
  if (!email) return null;
  try {
    const raw = await AsyncStorage.getItem(keyFor(email));
    return raw ? (JSON.parse(raw) as ListingDraft) : null;
  } catch (error) {
    console.warn("Couldn't read the listing draft:", error);
    return null;
  }
}

export async function saveListingDraft(email: string | undefined, draft: ListingDraft): Promise<void> {
  if (!email) return;
  try {
    await AsyncStorage.setItem(keyFor(email), JSON.stringify(draft));
  } catch (error) {
    // On web, picked photos are data URIs and can blow the storage quota.
    // Keep the typed fields; the photos can be picked again.
    try {
      const fields = { ...draft.fields, images: [null, null, null], floorPlanImage: null };
      await AsyncStorage.setItem(keyFor(email), JSON.stringify({ ...draft, fields }));
    } catch {
      console.warn("Couldn't save the listing draft:", error);
    }
  }
}

export async function clearListingDraft(email: string | undefined): Promise<void> {
  if (!email) return;
  await AsyncStorage.removeItem(keyFor(email)).catch(() => {});
}

/** Where "Finish your listing" links go: back into the wizard, in the right mode. */
export function listingWizardHref(mode: string | undefined) {
  return (mode ? `/post-sublease?mode=${mode}` : "/post-sublease") as any;
}
