import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useApp, Zone } from "@/context/AppContext";
import { ScamBanner } from "@/components/ScamBanner";
import ZonePicker from "@/components/ZonePicker";
import { useResponsive } from "@/hooks/useResponsive";

const DARK_TEAL = "#2C555C";
const SCREEN_BG = "#FBFBF9";

const PEBBLES: {
  id: string; label: string; icon: keyof typeof Ionicons.glyphMap; bg: string;
}[] = [
  { id: "all", label: "All", icon: "apps", bg: "#A8DADC" },
  { id: "semester_takeover", label: "Semester", icon: "calendar", bg: "#DDBDF1" },
  { id: "summer_only", label: "Summer", icon: "sunny", bg: "#FADCB3" },
  { id: "short_term", label: "Events", icon: "ticket", bg: "#A2D2FF" },
  { id: "roommate_openings", label: "Roommate", icon: "people", bg: "#FFD6E0" },
];

const HOUSING_BLOCKS: {
  id: string; title: string; icon: keyof typeof Ionicons.glyphMap; bg: string; iconColor: string;
}[] = [
  { id: "semester_takeover", title: "Semester\n& Year", icon: "calendar", bg: "#DDBDF1", iconColor: "#7C3AED" },
  { id: "summer_only", title: "Summer", icon: "sunny", bg: "#FADCB3", iconColor: "#D97706" },
  { id: "short_term", title: "Short-\nTerm", icon: "ticket", bg: "#A2D2FF", iconColor: "#2563EB" },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser, friends, subleases } = useApp();
  const [zoneFilter, setZoneFilter] = useState<Zone | "all">("all");
  const { isDesktop, contentMaxWidth } = useResponsive();
  const topPadding = Platform.OS === "web" ? (isDesktop ? 24 : 67) : insets.top;

  const userInitial = currentUser?.name?.[0]?.toUpperCase() ?? "U";

  const navigateToCategory = (catId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const zoneParam = zoneFilter !== "all" ? `&zone=${zoneFilter}` : "";
    router.push(`/marketplace?category=${catId}${zoneParam}` as any);
  };

  return (
    <View style={[s.container, { backgroundColor: SCREEN_BG }]}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[
          s.scrollContent,
          {
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + (isDesktop ? 40 : 90),
            maxWidth: contentMaxWidth,
            alignSelf: "center" as const,
            width: "100%",
            paddingHorizontal: isDesktop ? 32 : 16,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingTop: topPadding + 12, paddingBottom: 8 }}>
          <Text style={s.greeting}>HEY, {userInitial}</Text>
          <Text style={s.tagline}>Find your place at UIUC</Text>
        </View>

        <ScamBanner />

        <ZonePicker selected={zoneFilter} onSelect={setZoneFilter} />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.pebbleScroll}
          contentContainerStyle={s.pebbleRow}
        >
          {PEBBLES.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => {
                Haptics.selectionAsync();
                if (p.id === "all") {
                  router.push("/marketplace" as any);
                } else {
                  navigateToCategory(p.id);
                }
              }}
            >
              {({ pressed }) => (
                <View style={[s.pebble, { backgroundColor: p.bg }, pressed && s.pebblePressed]}>
                  <Ionicons name={p.icon} size={18} color={DARK_TEAL} />
                  <Text style={s.pebbleText}>{p.label}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>

        <Text style={s.sectionLabel}>Browse by housing type</Text>

        <View style={s.blockRow}>
          {HOUSING_BLOCKS.map((b) => (
            <Pressable
              key={b.id}
              style={{ flex: 1 }}
              onPress={() => navigateToCategory(b.id)}
            >
              {({ pressed }) => (
                <View style={[s.block, { backgroundColor: b.bg }, pressed && s.blockPressed]}>
                  <Ionicons name={b.icon} size={32} color={b.iconColor} style={s.blockIcon} />
                  <Text style={s.blockTitle}>{b.title}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={() => navigateToCategory("roommate_openings")}
        >
          {({ pressed }) => (
            <View style={[s.block, s.roommateBlock, pressed && s.blockPressed]}>
              <Ionicons name="people" size={28} color="#7C3AED" />
              <View style={{ flex: 1 }}>
                <Text style={s.roommateTitle}>Find a Roommate</Text>
                <Text style={s.roommateSubtitle}>Join an existing lease & meet housemates</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={DARK_TEAL} />
            </View>
          )}
        </Pressable>

        <Text style={s.sectionLabel}>Jump in</Text>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            router.push("/matchmaker");
          }}
        >
          {({ pressed }) => (
            <View style={[s.matchmakerCard, pressed && { transform: [{ scale: 0.97 }] }]}>
              <View style={s.matchmakerIconWrap}>
                <Ionicons name="heart" size={36} color="#FFFFFF" />
                <Ionicons name="location" size={20} color="#FFD6E0" style={{ position: "absolute", bottom: -2, right: -6 }} />
              </View>
              <View style={s.matchmakerText}>
                <Text style={s.matchmakerTitle}>Year-Long{"\n"}Matchmaker</Text>
                <Text style={s.matchmakerSub}>Swipe & match for a full 12-month lease</Text>
              </View>
            </View>
          )}
        </Pressable>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            router.push("/crash-cash");
          }}
        >
          {({ pressed }) => (
            <View style={[s.crashCard, pressed && { transform: [{ scale: 0.97 }] }]}>
              <View style={s.crashIconWrap}>
                <Text style={{ fontSize: 28 }}>🛋️</Text>
                <Ionicons name="flash" size={22} color="#FF6B4E" style={{ position: "absolute", top: -4, right: -8 }} />
              </View>
              <View style={s.crashText}>
                <Text style={s.crashTitle}>Crash & Cash</Text>
                <Text style={s.crashSub}>
                  Urgent couch for tonight — paid in{" "}
                  <Text style={s.pillBoba}>boba</Text>
                  {", "}
                  <Text style={s.pillLion}>Lion cover</Text>
                  {", or cash"}
                </Text>
              </View>
            </View>
          )}
        </Pressable>

        {isDesktop ? (
          <View style={s.desktopBottom}>
            <View style={{ flex: 1 }}>
              <Text style={s.sectionLabel}>Your stats</Text>
              <View style={s.statsRow}>
                <View style={s.statBox}>
                  <Text style={s.statNum}>{friends.length}</Text>
                  <Text style={s.statLabel}>Circle</Text>
                </View>
                <View style={[s.statBox, { backgroundColor: "#A2D2FF30" }]}>
                  <Text style={s.statNum}>{subleases.length}</Text>
                  <Text style={s.statLabel}>Listings</Text>
                </View>
              </View>
            </View>
            <View style={{ width: 20 }} />
            <View style={{ flex: 1 }}>
              <Text style={s.sectionLabel}>PopMatch Protection</Text>
              <View style={s.trustCard}>
                <View style={s.trustHeader}>
                  <Ionicons name="shield-checkmark" size={16} color={Colors.ocean} />
                  <Text style={s.trustTitle}>Verified Students Only</Text>
                </View>
                {[
                  "Only @illinois.edu verified students",
                  "Social Trust Graph — see mutual connections",
                  "Landlord-specific warnings",
                  "Weighted Euclidean matching",
                ].map((tip) => (
                  <View key={tip} style={s.tipRow}>
                    <View style={s.tipDot} />
                    <Text style={s.tipText}>{tip}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ) : (
          <>
            <View style={s.statsRow}>
              <View style={s.statBox}>
                <Text style={s.statNum}>{friends.length}</Text>
                <Text style={s.statLabel}>Circle</Text>
              </View>
              <View style={[s.statBox, { backgroundColor: "#A2D2FF30" }]}>
                <Text style={s.statNum}>{subleases.length}</Text>
                <Text style={s.statLabel}>Listings</Text>
              </View>
            </View>

            <View style={s.trustCard}>
              <View style={s.trustHeader}>
                <Ionicons name="shield-checkmark" size={16} color={Colors.ocean} />
                <Text style={s.trustTitle}>PopMatch Protection</Text>
              </View>
              {[
                "Only @illinois.edu verified students",
                "Social Trust Graph — see mutual connections",
                "Landlord-specific warnings (JSM, UGroup, Bailey, American)",
                "Weighted Euclidean matching for compatibility",
              ].map((tip) => (
                <View key={tip} style={s.tipRow}>
                  <View style={s.tipDot} />
                  <Text style={s.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const SHADOW_TEAL = {
  shadowColor: "#1A4A50",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.12,
  shadowRadius: 10,
  elevation: 4,
};

const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 4, gap: 14 },

  greeting: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 32,
    color: DARK_TEAL,
    letterSpacing: -0.5,
  },
  tagline: {
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    color: "#6B8A8F",
    marginTop: 2,
  },

  sectionLabel: {
    fontFamily: "Nunito_700Bold",
    fontSize: 13,
    color: "#6B8A8F",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 4,
  },

  pebbleScroll: { maxHeight: 72, marginTop: 4 },
  pebbleRow: { gap: 10, paddingVertical: 4 },
  pebble: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 20,
    gap: 4,
    ...SHADOW_TEAL,
    shadowOpacity: 0.08,
  },
  pebblePressed: { transform: [{ scale: 0.95 }], opacity: 0.85 },
  pebbleText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
    color: DARK_TEAL,
  },

  blockRow: {
    flexDirection: "row",
    gap: 12,
  },
  block: {
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 120,
    ...SHADOW_TEAL,
  },
  blockPressed: { transform: [{ scale: 0.96 }], opacity: 0.9 },
  blockIcon: { marginBottom: 8 },
  blockTitle: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 14,
    color: DARK_TEAL,
    textAlign: "center",
    lineHeight: 18,
  },

  roommateBlock: {
    backgroundColor: "#FFD6E0",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 0,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  roommateTitle: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 15,
    color: DARK_TEAL,
  },
  roommateSubtitle: {
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    color: "#6B8A8F",
    marginTop: 2,
  },

  matchmakerCard: {
    width: "100%",
    height: 140,
    borderRadius: 24,
    backgroundColor: "#E06D53",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 22,
    gap: 18,
    shadowColor: "#A0392A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
  matchmakerIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  matchmakerText: { flex: 1 },
  matchmakerTitle: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 28,
    color: "#5A1E14",
    lineHeight: 32,
  },
  matchmakerSub: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    marginTop: 4,
  },

  crashCard: {
    width: "100%",
    height: 140,
    borderRadius: 24,
    backgroundColor: "#FFB48A",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 22,
    gap: 18,
    shadowColor: "#C06030",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 6,
  },
  crashIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  crashText: { flex: 1 },
  crashTitle: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 26,
    color: "#5C2E0E",
    lineHeight: 30,
  },
  crashSub: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 13,
    color: "rgba(92,46,14,0.7)",
    marginTop: 4,
    lineHeight: 20,
  },
  pillBoba: {
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
    color: "#FFFFFF",
    backgroundColor: "#E84393",
    borderRadius: 6,
    overflow: "hidden",
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  pillLion: {
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
    color: DARK_TEAL,
    backgroundColor: "#FFD966",
    borderRadius: 6,
    overflow: "hidden",
    paddingHorizontal: 6,
    paddingVertical: 1,
  },

  desktopBottom: {
    flexDirection: "row",
    marginTop: 8,
  },
  statsRow: { flexDirection: "row", gap: 10 },
  statBox: {
    flex: 1,
    backgroundColor: "#FADCB3" + "50",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 2,
    ...SHADOW_TEAL,
    shadowOpacity: 0.06,
  },
  statNum: { fontFamily: "Nunito_800ExtraBold", fontSize: 24, color: Colors.ocean },
  statLabel: { fontFamily: "Nunito_400Regular", fontSize: 11, color: "#6B8A8F" },
  trustCard: {
    backgroundColor: Colors.ocean + "10",
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  trustHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  trustTitle: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.ocean },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  tipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.ocean, marginTop: 6 },
  tipText: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.charcoal, flex: 1, lineHeight: 19 },
});
