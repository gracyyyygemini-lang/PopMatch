import { Platform, TextStyle } from "react-native";

/**
 * The platform's own UI font: San Francisco on Apple, Segoe UI on Windows,
 * Roboto on Android. Native needs no family name for that; the web needs the
 * CSS stack spelled out.
 */
const family = Platform.select({
  web: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  default: undefined,
});

/** Only these two keys, so spreading it doesn't widen a style to the whole TextStyle. */
const weight = (fontWeight: TextStyle["fontWeight"]): Pick<TextStyle, "fontFamily" | "fontWeight"> =>
  ({ fontFamily: family, fontWeight });

/** Spread into a style: `{ ...font.bold, fontSize: 16 }`. */
export const font = {
  regular: weight("400"),
  medium: weight("500"),
  semibold: weight("600"),
  bold: weight("700"),
  heavy: weight("800"),
};

/** The type scale the redesign uses. */
export const type = {
  /** Screen titles. */
  largeTitle: { ...font.bold, fontSize: 32, letterSpacing: 0.2 } as TextStyle,
  /** Section headings ("What do you need?"). */
  heading: { ...font.bold, fontSize: 22 } as TextStyle,
  /** Row titles. */
  rowTitle: { ...font.semibold, fontSize: 16 } as TextStyle,
  /** Row subtitles: grey, one line. */
  rowSubtitle: { ...font.regular, fontSize: 13 } as TextStyle,
  /** Small caps labels above a group. */
  groupLabel: { ...font.semibold, fontSize: 13, letterSpacing: 0.3, textTransform: "uppercase" } as TextStyle,
};
