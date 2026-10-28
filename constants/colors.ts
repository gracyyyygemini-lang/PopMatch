/**
 * University of Illinois brand palette (brand.illinois.edu) with iOS-style
 * neutrals. Contrast was checked for every pairing used (WCAG 2.1):
 *
 *   blue / ink text on white or bg ........ 13–15:1
 *   storm (#707372) on white .............. 4.79:1  ← 13px subtitles, on white cards only
 *   storm on bg (#F2F3F5) ................. 4.31:1  ✗  use textSecondaryOnBg (5.64:1)
 *   stormMid (#8E9090) on white ........... 3.21:1  icons / chevrons only, never text
 *   stormLight (#C6C7C6) .................. hairlines and borders only
 *   orange as text on white / bg .......... 3.05 / 2.74  ✗  orange is a fill, never text
 *   NAVY on orange ........................ 4.76:1  ← labels and icons on orange
 *   white on orange ....................... 3.05:1  ✗  never
 *   white on industrial / patina / earth /
 *     berry / prairie ..................... 6.99 / 4.80 / 8.17 / 13.17 / 7.53
 *   error (#B3261E) on errorBg ............ 5.72:1
 *
 * The legacy keys below (ocean, coral, sand, ...) are kept so existing styles
 * pick up the new palette; new code should use the semantic names.
 */
const Brand = {
  illiniOrange: "#FF5F05",
  illiniBlue: "#13294B",
  storm: "#707372",
  stormMid: "#8E9090",
  stormLight: "#C6C7C6",
  industrial: "#1D58A7",
  patina: "#007E8E",
  earth: "#7D3E13",
  berry: "#5C0E41",
  prairie: "#006230",
};

const Colors = {
  ...Brand,

  // ── semantic ──────────────────────────────────────────────────────────────
  bg: "#F2F3F5",
  card: "#FFFFFF",
  textPrimary: Brand.illiniBlue,
  /** On white cards only (4.79:1). */
  textSecondary: Brand.storm,
  /** Secondary text sitting directly on `bg` (5.64:1); a darkened Storm. */
  textSecondaryOnBg: "#5E6160",
  hairline: Brand.stormLight,
  /** Fill for disabled controls and neutral chips. */
  fillMuted: "#E6E7E8",
  blueTint: "#E8ECF3",
  orangeTint: "#FFE6D6",
  prairieTint: "#E6F2EA",
  berryTint: "#F3E7EF",
  error: "#B3261E",
  errorBg: "#FDECEA",
  /** Text/icons on an orange fill. */
  onOrange: Brand.illiniBlue,

  // ── legacy names, remapped ───────────────────────────────────────────────
  foam: "#F2F3F5",
  foamDark: "#E6E7E8",
  foamLight: "#F7F8F9",
  teal: Brand.illiniBlue,
  tealMid: Brand.industrial,
  tealLight: Brand.industrial,
  ponyo: Brand.illiniOrange,
  ponyoLight: Brand.illiniOrange,
  yellow: "#FFE6D6",
  yellowDark: Brand.earth,
  white: "#FFFFFF",
  cardBg: "#FFFFFF",
  borderSoft: Brand.stormLight,
  charcoal: Brand.illiniBlue,
  /**
   * Muted text in the older screens sits on grey fills and tints as often as
   * on white, where Storm drops to 3.6–4.3:1; the darkened Storm is ≥4.6:1 on
   * every one of them (checked in the rendered app).
   */
  textMuted: "#5E6160",
  textLight: "#5E6160",
  grassGreen: Brand.prairie,
  grassGreenLight: Brand.prairie,
  errorRed: "#B3261E",
  alertOrange: Brand.earth,
  alertRed: "#B3261E",

  ocean: Brand.illiniBlue,
  sand: "#F2F3F5",
  sandDark: "#E6E7E8",
  sandLight: "#F7F8F9",
  oceanMid: Brand.industrial,
  oceanLight: Brand.industrial,
  gold: "#FFE6D6",
  goldDark: Brand.earth,
  orange: Brand.illiniOrange,
  orangeLight: Brand.illiniOrange,
  warmCream: "#F2F3F5",
  darkTeal: Brand.illiniBlue,
  coral: Brand.illiniOrange,

  landlords: {
    jsm: Brand.industrial,
    ugroup: Brand.prairie,
    bailey: Brand.earth,
    american: "#B3261E",
    smile: Brand.berry,
    cpm: Brand.patina,
    green_st_realty: Brand.prairie,
    other: Brand.storm,
  },
  zones: {
    campustown: Brand.industrial,
    north: Brand.prairie,
    south: Brand.earth,
    urbana: Brand.patina,
    downtown: Brand.berry,
  },
  sections: {
    matchmaker: Brand.illiniBlue,
    sublease: Brand.illiniOrange,
    breaks: Brand.prairie,
  },
};

/**
 * Avatar backgrounds carry white initials, so only colours that pass with
 * white. Profiles store their colour in the database (avatar_color); older
 * ones hold the previous palette, mapped here at display time.
 */
export const AVATAR_COLORS = [Brand.illiniBlue, Brand.industrial, Brand.patina, Brand.earth, Brand.berry, Brand.prairie];

const LEGACY_AVATAR: Record<string, string> = {
  "#005F73": Brand.patina, "#1A7AAF": Brand.industrial, "#1A9BB5": Brand.industrial,
  "#2E86AB": Brand.industrial, "#CC5500": Brand.earth, "#E07B00": Brand.earth,
  "#E06800": Brand.earth, "#FF6B4E": Brand.earth, "#FF8C69": Brand.earth,
  "#E0BC00": Brand.earth, "#FFD966": Brand.earth, "#9B59B6": Brand.berry,
  "#8B5CF6": Brand.berry, "#5A8A5A": Brand.prairie, "#4A8A5A": Brand.prairie,
  "#2ECC71": Brand.prairie, "#6AAB7A": Brand.prairie, "#C62828": Brand.berry,
  "#2C555C": Brand.illiniBlue,
};

/** A stored avatar colour, as it should be drawn under the current palette. */
export function avatarColor(stored: string | undefined | null): string {
  if (!stored) return Brand.illiniBlue;
  const upper = stored.toUpperCase();
  if (LEGACY_AVATAR[upper]) return LEGACY_AVATAR[upper];
  return AVATAR_COLORS.includes(upper) ? upper : Brand.illiniBlue;
}

export default Colors;
