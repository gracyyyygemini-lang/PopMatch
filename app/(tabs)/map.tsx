import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Dimensions
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useApp, Zone } from "@/context/AppContext";

const { width } = Dimensions.get("window");

const ZONES: {
  key: Zone;
  label: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  avgRent: string;
  vibe: string;
  pros: string[];
  cons: string[];
}[] = [
  {
    key: "campustown",
    label: "Campustown",
    desc: "The beating heart of UIUC",
    icon: "storefront-outline",
    color: Colors.zones.campustown,
    avgRent: "$800–1,100/mo",
    vibe: "Social & Lively",
    pros: ["Steps from Main Quad", "Green St bars & food", "Best campus access", "CUMTD bus lines"],
    cons: ["Can be noisy", "Higher rent", "Crowded during football"],
  },
  {
    key: "north",
    label: "North Campus",
    desc: "Engineering & STEM district",
    icon: "hardware-chip-outline",
    color: Colors.zones.north,
    avgRent: "$700–950/mo",
    vibe: "Academic & Focused",
    pros: ["Near Siebel & Grainger", "Quieter streets", "Reasonable rent", "Close to ECE"],
    cons: ["Far from Green St", "Limited nightlife", "Less walkable dining"],
  },
  {
    key: "south",
    label: "South Campus",
    desc: "Ikenberry, ARC & Stadium",
    icon: "football-outline",
    color: Colors.zones.south,
    avgRent: "$650–900/mo",
    vibe: "Athletic & Community",
    pros: ["Next to ARC gym", "Ikenberry dining", "Game day energy", "More space per dollar"],
    cons: ["Far from central campus", "Bus dependent", "Spreads out"],
  },
  {
    key: "urbana",
    label: "Urbana",
    desc: "Trees, quiet & budget-friendly",
    icon: "leaf-outline",
    color: Colors.zones.urbana,
    avgRent: "$550–800/mo",
    vibe: "Peaceful & Grad-friendly",
    pros: ["Lowest rent", "Beautiful neighborhoods", "Quiet for studying", "Friendly community"],
    cons: ["Need car or bus", "Away from campus buzz", "Limited late-night food"],
  },
  {
    key: "downtown",
    label: "Downtown Champaign",
    desc: "Professional vibe & high-end",
    icon: "business-outline",
    color: Colors.zones.downtown,
    avgRent: "$900–1,400/mo",
    vibe: "Professional & Urban",
    pros: ["High-end dining & bars", "Bus to campus", "Modern apartments", "Coffee shop scene"],
    cons: ["Highest rent", "Furthest from campus", "Less student community"],
  },
];

function ZoneMapVisual({ selectedZone, onSelect }: { selectedZone: Zone; onSelect: (z: Zone) => void }) {
  return (
    <View style={styles.mapVisual}>
      <Text style={styles.mapTitle}>UIUC Housing Zones</Text>
      <View style={styles.mapGrid}>
        {ZONES.map(zone => (
          <TouchableOpacity
            key={zone.key}
            style={[
              styles.mapCell,
              { borderColor: zone.color, backgroundColor: zone.color + (selectedZone === zone.key ? "55" : "25") },
              selectedZone === zone.key && styles.mapCellSelected,
            ]}
            onPress={() => { onSelect(zone.key); Haptics.selectionAsync(); }}>
            <Ionicons name={zone.icon} size={20} color={selectedZone === zone.key ? Colors.charcoal : Colors.textMuted} />
            <Text style={[styles.mapCellLabel, selectedZone === zone.key && styles.mapCellLabelActive]}>
              {zone.label}
            </Text>
            <Text style={styles.mapCellVibe}>{zone.vibe}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser, mockUsers, computeScore } = useApp();
  const [selectedZone, setSelectedZone] = useState<Zone>(currentUser?.zone || "campustown");

  const zone = ZONES.find(z => z.key === selectedZone)!;
  const zoneUsers = mockUsers.filter(u => u.zone === selectedZone && u.id !== currentUser?.id);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: Colors.parchment }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Text style={styles.headerTitle}>Zone Map</Text>
        <Text style={styles.headerSub}>Explore UIUC neighborhoods</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, {
        paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 90
      }]} showsVerticalScrollIndicator={false}>
        <ZoneMapVisual selectedZone={selectedZone} onSelect={setSelectedZone} />

        <View style={[styles.zoneDetail, { borderLeftColor: zone.color }]}>
          <View style={styles.zoneDetailHeader}>
            <Ionicons name={zone.icon} size={22} color={Colors.charcoal} />
            <View style={styles.zoneDetailTitle}>
              <Text style={styles.zoneDetailName}>{zone.label}</Text>
              <Text style={styles.zoneDetailDesc}>{zone.desc}</Text>
            </View>
            <View style={[styles.rentBadge, { backgroundColor: zone.color + "40" }]}>
              <Text style={[styles.rentText, { color: Colors.charcoal }]}>{zone.avgRent}</Text>
            </View>
          </View>

          <View style={styles.prosConsList}>
            <View style={styles.prosCol}>
              <Text style={styles.prosTitle}>Pros</Text>
              {zone.pros.map(p => (
                <View key={p} style={styles.proItem}>
                  <Ionicons name="checkmark" size={12} color={Colors.grassGreenDark} />
                  <Text style={styles.proText}>{p}</Text>
                </View>
              ))}
            </View>
            <View style={styles.consCol}>
              <Text style={styles.consTitle}>Cons</Text>
              {zone.cons.map(c => (
                <View key={c} style={styles.conItem}>
                  <Ionicons name="remove" size={12} color={Colors.errorRed} />
                  <Text style={styles.conText}>{c}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {zoneUsers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Students in {zone.label}</Text>
            {zoneUsers.map(user => {
              const score = currentUser ? computeScore(currentUser, user) : 0;
              const initials = user.name.split(" ").map(n => n[0]).join("").slice(0, 2);
              return (
                <View key={user.id} style={styles.zoneUserCard}>
                  <View style={[styles.zoneUserAvatar, { backgroundColor: user.avatarColor }]}>
                    <Text style={styles.zoneUserInitials}>{initials}</Text>
                  </View>
                  <View style={styles.zoneUserInfo}>
                    <Text style={styles.zoneUserName}>{user.name}</Text>
                    <Text style={styles.zoneUserDetails}>{user.major} · ${user.budget}/mo</Text>
                  </View>
                  <View style={[styles.zoneScore, {
                    backgroundColor: score >= 80 ? Colors.grassGreenDark : score >= 60 ? Colors.skyBlueDark : Colors.textMuted
                  }]}>
                    <Text style={styles.zoneScoreText}>{score}%</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {zoneUsers.length === 0 && (
          <View style={styles.emptyZone}>
            <Ionicons name="people-outline" size={36} color={Colors.textLight} />
            <Text style={styles.emptyZoneText}>No students listed in {zone.label} yet</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 28, color: Colors.charcoal },
  headerSub: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textMuted },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },
  mapVisual: {
    backgroundColor: Colors.cardBg, borderRadius: 20, borderWidth: 1.5,
    borderColor: Colors.borderSoft, padding: 16, gap: 12,
  },
  mapTitle: { fontFamily: "Nunito_700Bold", fontSize: 16, color: Colors.charcoal },
  mapGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  mapCell: {
    width: (width - 64) / 2,
    borderRadius: 14, borderWidth: 2, padding: 12, alignItems: "center", gap: 4,
  },
  mapCellSelected: { shadowColor: Colors.charcoal, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2 },
  mapCellLabel: { fontFamily: "Nunito_700Bold", fontSize: 13, color: Colors.textMuted, textAlign: "center" },
  mapCellLabelActive: { color: Colors.charcoal },
  mapCellVibe: { fontFamily: "Nunito_400Regular", fontSize: 10, color: Colors.textLight, textAlign: "center" },
  zoneDetail: {
    backgroundColor: Colors.cardBg, borderRadius: 16, borderWidth: 1.5,
    borderColor: Colors.borderSoft, borderLeftWidth: 4, padding: 16, gap: 12,
  },
  zoneDetailHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  zoneDetailTitle: { flex: 1 },
  zoneDetailName: { fontFamily: "Nunito_800ExtraBold", fontSize: 18, color: Colors.charcoal },
  zoneDetailDesc: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted },
  rentBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  rentText: { fontFamily: "Nunito_700Bold", fontSize: 11 },
  prosConsList: { flexDirection: "row", gap: 16 },
  prosCol: { flex: 1, gap: 6 },
  consCol: { flex: 1, gap: 6 },
  prosTitle: { fontFamily: "Nunito_700Bold", fontSize: 12, color: Colors.grassGreenDark, textTransform: "uppercase", letterSpacing: 0.5 },
  consTitle: { fontFamily: "Nunito_700Bold", fontSize: 12, color: Colors.errorRed, textTransform: "uppercase", letterSpacing: 0.5 },
  proItem: { flexDirection: "row", alignItems: "flex-start", gap: 5 },
  conItem: { flexDirection: "row", alignItems: "flex-start", gap: 5 },
  proText: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.charcoal, flex: 1, lineHeight: 17 },
  conText: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.charcoal, flex: 1, lineHeight: 17 },
  section: { gap: 8 },
  sectionTitle: { fontFamily: "Nunito_700Bold", fontSize: 16, color: Colors.charcoal },
  zoneUserCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.cardBg, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.borderSoft, padding: 12,
  },
  zoneUserAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  zoneUserInitials: { fontFamily: "Nunito_700Bold", fontSize: 16, color: Colors.white },
  zoneUserInfo: { flex: 1 },
  zoneUserName: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.charcoal },
  zoneUserDetails: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted },
  zoneScore: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  zoneScoreText: { fontFamily: "Nunito_800ExtraBold", fontSize: 11, color: Colors.white },
  emptyZone: { alignItems: "center", gap: 8, paddingVertical: 20 },
  emptyZoneText: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textMuted, textAlign: "center" },
});
