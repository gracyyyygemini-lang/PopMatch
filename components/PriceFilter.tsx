import React from "react";
import { Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { font } from "@/constants/typography";

/** Whole dollars per month, both bounds inclusive; undefined = no bound. */
export interface PriceRange {
  label: string;
  min?: number;
  max?: number;
}

/** "Under $700" means strictly less than 700, so its inclusive max is 699. */
export const PRICE_RANGES: PriceRange[] = [
  { label: "Any price" },
  { label: "Under $500", max: 499 },
  { label: "Under $700", max: 699 },
  { label: "Under $1,000", max: 999 },
  { label: "$1,000+", min: 1000 },
];

/** A chip row in the ZonePicker style; one range at a time. */
export default function PriceFilter({ selected, onSelect }: {
  selected: PriceRange;
  onSelect: (range: PriceRange) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.row}>
      {PRICE_RANGES.map(range => {
        const active = selected.label === range.label;
        return (
          <TouchableOpacity
            key={range.label}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => { onSelect(range); Haptics.selectionAsync(); }}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{range.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 48 },
  row: { paddingHorizontal: 16, gap: 8, paddingVertical: 6, alignItems: "center" },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: Colors.cardBg, borderWidth: 1.5, borderColor: Colors.borderSoft,
  },
  chipActive: { backgroundColor: Colors.ocean, borderColor: Colors.ocean },
  chipText: { ...font.semibold, fontSize: 12, color: Colors.textMuted },
  chipTextActive: { color: Colors.white },
});
