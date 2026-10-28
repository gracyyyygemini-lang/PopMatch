import React from "react";
import { View, Text, StyleSheet, Pressable, StyleProp, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { font, type } from "@/constants/typography";

/**
 * iOS-settings-style building blocks: white grouped cards on the grey screen
 * background, rows with a coloured icon tile, title, grey subtitle and chevron,
 * separated by hairlines inset to where the text starts.
 */

const TILE = 38;
const ROW_PAD = 16;
const TILE_GAP = 12;

/** Icon colour that passes contrast on each tile colour (see constants/colors.ts). */
function iconOn(tile: string): string {
  return tile.toUpperCase() === Colors.illiniOrange ? Colors.onOrange : Colors.white;
}

export function IconTile({ icon, color, size = TILE }: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  size?: number;
}) {
  return (
    <View style={[styles.tile, { width: size, height: size, borderRadius: size * 0.26, backgroundColor: color }]}>
      <Ionicons name={icon} size={size * 0.53} color={iconOn(color)} />
    </View>
  );
}

/** Large bold title for the top of a screen, on the grey background. */
export function ScreenTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <View style={styles.titleRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.screenTitle} accessibilityRole="header">{title}</Text>
        {subtitle ? <Text style={styles.screenSubtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

/** Section heading above a group ("What do you need?"). */
export function GroupHeading({ children }: { children: string }) {
  return <Text style={styles.groupHeading} accessibilityRole="header">{children}</Text>;
}

/** A white rounded card that holds rows. */
export function Group({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[styles.group, style]}>
      {rows.map((child, i) =>
        React.isValidElement(child) && child.type === Row
          ? React.cloneElement(child as React.ReactElement<RowProps>, { last: i === rows.length - 1 })
          : child
      )}
    </View>
  );
}

export interface RowProps {
  icon?: keyof typeof Ionicons.glyphMap;
  tile?: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  /** Shown before the chevron, e.g. a count. */
  detail?: React.ReactNode;
  /** Replaces the icon tile, e.g. an avatar. */
  leading?: React.ReactNode;
  chevron?: boolean;
  destructive?: boolean;
  /** Lines the subtitle may take before truncating (default 1). */
  subtitleLines?: number;
  /** Set by Group. */
  last?: boolean;
  accessibilityLabel?: string;
}

export function Row({ icon, tile = Colors.illiniBlue, title, subtitle, onPress, detail, leading, chevron = !!onPress, destructive, subtitleLines = 1, last, accessibilityLabel }: RowProps) {
  const hasLeading = !!(leading || icon);
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={accessibilityLabel ?? (subtitle ? `${title}. ${subtitle}` : title)}
      style={({ pressed }) => [styles.row, pressed && onPress ? styles.rowPressed : null]}
    >
      {leading ?? (icon ? <IconTile icon={icon} color={tile} /> : null)}
      <View style={[styles.rowBody, !last && styles.rowDivider, !hasLeading && { marginLeft: 0 }]}>
        <View style={styles.rowText}>
          <Text style={[styles.rowTitle, destructive && { color: Colors.error }]} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={styles.rowSubtitle} numberOfLines={subtitleLines}>{subtitle}</Text> : null}
        </View>
        {detail}
        {chevron ? <Ionicons name="chevron-forward" size={18} color={Colors.stormMid} /> : null}
      </View>
    </Pressable>
  );
}

/** A small count bubble for a row's `detail`. Orange fill, navy text (4.76:1). */
export function CountBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 99 ? "99+" : count}</Text>
    </View>
  );
}

/** Pill-shaped filter chip: blue when active, white with a grey border when not. */
export function Chip({ label, active, onPress, icon }: {
  label: string;
  active: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && !active && styles.rowPressed]}
    >
      {icon ? <Ionicons name={icon} size={14} color={active ? Colors.white : Colors.illiniBlue} /> : null}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: "center", justifyContent: "center" },

  titleRow: { flexDirection: "row", alignItems: "flex-end", gap: 12, marginBottom: 8 },
  screenTitle: { ...type.largeTitle, color: Colors.textPrimary },
  screenSubtitle: { ...font.regular, fontSize: 15, color: Colors.textSecondaryOnBg, marginTop: 2 },
  groupHeading: { ...type.heading, color: Colors.textPrimary, marginTop: 24, marginBottom: 10 },

  group: { backgroundColor: Colors.card, borderRadius: 14, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", paddingLeft: ROW_PAD, backgroundColor: Colors.card, minHeight: 60 },
  rowPressed: { backgroundColor: "#ECEDEF" },
  rowBody: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 8,
    marginLeft: TILE_GAP, paddingVertical: 11, paddingRight: ROW_PAD, minHeight: 60,
  },
  /** Hairline inset to the text, not under the tile. */
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.hairline },
  rowText: { flex: 1 },
  rowTitle: { ...type.rowTitle, color: Colors.textPrimary },
  rowSubtitle: { ...type.rowSubtitle, color: Colors.textSecondary, marginTop: 2 },

  badge: {
    minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6,
    backgroundColor: Colors.illiniOrange, alignItems: "center", justifyContent: "center",
  },
  badgeText: { ...font.bold, fontSize: 12, color: Colors.onOrange },

  chip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.hairline,
  },
  chipActive: { backgroundColor: Colors.illiniBlue, borderColor: Colors.illiniBlue },
  chipText: { ...font.semibold, fontSize: 13, color: Colors.illiniBlue },
  chipTextActive: { color: Colors.white },
});
