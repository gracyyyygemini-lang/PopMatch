/**
 * Marketplace tabs and which one a listing lands in. Shared by the marketplace
 * and the listing wizard, so an edit that moves a listing can name both tabs.
 */
export const CATEGORY_LABELS: Record<string, string> = {
  all: "All",
  roommate_openings: "Roommate Openings",
  summer_only: "Summer Only",
  august_gap: "August Gap",
  semester_takeover: "Semester / Full Year",
  short_term: "Short-Term & Events",
};

/** The tab a listing shows under, from its listing type and stored category. */
export function marketplaceTab(post: { listingType?: string; category?: string }): string {
  const rawCat = post.listingType === "roommate" ? "roommate_openings" : (post.category || "semester_takeover");
  return rawCat === "summer" ? "summer_only" : ["spring", "fall", "full_year"].includes(rawCat) ? "semester_takeover" : rawCat;
}
