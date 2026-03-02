import React from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import { ScamBanner } from "@/components/ScamBanner";

const CATEGORIES = [
  {
    id: "summer_only",
    title: "Summer Only",
    dates: "May 15 – Aug 10",
    icon: "sunny" as const,
    color: Colors.orange,
  },
  {
    id: "august_gap",
    title: "August Gap",
    dates: "1–2 weeks in August",
    icon: "time-outline" as const,
    color: Colors.ocean,
  },
  {
    id: "semester_takeover",
    title: "Semester / Full Year",
    dates: "Fall, Spring, or 12 mo",
    icon: "calendar-outline" as const,
    color: Colors.grassGreen,
  },
  {
    id: "short_term",
    title: "Short-Term & Events",
    dates: "1–14 days",
    icon: "ticket-outline" as const,
    color: Colors.goldDark,
  },
];

const FEATURES = [
  {
    route: "/matchmaker" as const,
    title: "Year-Long Matchmaker",
    subtitle: "Swipe to find a roommate",
    icon: "heart" as const,
    color: Colors.ocean,
  },
  {
    route: "/breaks" as const,
    title: "Break Stay Board",
    subtitle: "Thanksgiving, Spring & Winter",
    icon: "partly-sunny-outline" as const,
    color: Colors.grassGreen,
  },
];

const TRUST_ICONS: { icon: keyof typeof Ionicons.glyphMap; label: string; color: string }[] = [
  { icon: "shield-checkmark", label: "Verified", color: Colors.ocean },
  { icon: "people", label: "Connections", color: Colors.grassGreen },
  { icon: "star", label: "Vouched", color: Colors.orange },
  { icon: "warning", label: "Landlord alerts", color: Colors.goldDark },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser, friends, subleases, breakPosts } = useApp();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const firstName = currentUser?.name.split(" ")[0] ?? "there";

  return (
    <View style={[styles.container, { backgroundColor: Colors.sand }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <View>
          <Text style={styles.greeting}>Hey, {firstName}</Text>
          <Text style={styles.tagline}>Find your place at UIUC</Text>
        </View>
        <View style={styles.logoMark}>
          <Ionicons name="home" size={22} color={Colors.ocean} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, {
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 90
        }]}
        showsVerticalScrollIndicator={false}
      >
        <ScamBanner />

        <Text style={styles.sectionLabel}>Browse by type</Text>

        <View style={styles.grid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={styles.categoryCard}
              activeOpacity={0.82}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push(`/marketplace?category=${cat.id}` as any);
              }}
            >
              <View style={[styles.catIconWrap, { backgroundColor: cat.color }]}>
                <Ionicons name={cat.icon} size={24} color={Colors.white} />
              </View>
              <Text style={styles.catTitle}>{cat.title}</Text>
              <Text style={styles.catDates}>{cat.dates}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Features</Text>

        {FEATURES.map((f) => (
          <TouchableOpacity
            key={f.route}
            style={styles.featureCard}
            activeOpacity={0.85}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push(f.route);
            }}
          >
            <View style={[styles.featureIcon, { backgroundColor: f.color }]}>
              <Ionicons name={f.icon} size={22} color={Colors.white} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureSub}>{f.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={17} color={Colors.textLight} />
          </TouchableOpacity>
        ))}

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{friends.length}</Text>
            <Text style={styles.statLabel}>Friends</Text>
          </View>
          <View style={[styles.statBox, styles.statBoxMid]}>
            <Text style={styles.statNum}>{subleases.length}</Text>
            <Text style={styles.statLabel}>Listings</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{breakPosts.length}</Text>
            <Text style={styles.statLabel}>Break stays</Text>
          </View>
        </View>

        <View style={styles.trustCard}>
          <View style={styles.trustHeader}>
            <Ionicons name="shield-checkmark" size={15} color={Colors.ocean} />
            <Text style={styles.trustTitle}>PopMatch Protection</Text>
          </View>
          <View style={styles.trustIconRow}>
            {TRUST_ICONS.map(({ icon, label, color }) => (
              <View key={label} style={styles.trustIconItem}>
                <View style={[styles.trustIconWrap, { backgroundColor: color + "18" }]}>
                  <Ionicons name={icon} size={16} color={color} />
                </View>
                <Text style={styles.trustIconLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingHorizontal: 20, paddingBottom: 16, backgroundColor: Colors.sand,
  },
  greeting: { fontFamily: "Nunito_800ExtraBold", fontSize: 32, color: Colors.ocean },
  tagline: { fontFamily: "Nunito_400Regular", fontSize: 15, color: Colors.textMuted },
  logoMark: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: Colors.ocean + "18",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: Colors.ocean + "30",
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  sectionLabel: {
    fontFamily: "Nunito_700Bold", fontSize: 13, color: Colors.textMuted,
    textTransform: "uppercase", letterSpacing: 0.8, marginTop: 4,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  categoryCard: {
    width: "48%", backgroundColor: Colors.cardBg, borderRadius: 18,
    borderWidth: 1.5, borderColor: Colors.borderSoft, padding: 14, gap: 5,
    shadowColor: Colors.charcoal, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  catIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: "center", justifyContent: "center", marginBottom: 2,
  },
  catTitle: { fontFamily: "Nunito_700Bold", fontSize: 15, color: Colors.charcoal },
  catDates: { fontFamily: "Nunito_600SemiBold", fontSize: 12, color: Colors.textMuted },
  featureCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: Colors.cardBg, borderRadius: 18,
    borderWidth: 1.5, borderColor: Colors.borderSoft, padding: 16,
    shadowColor: Colors.charcoal, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
  featureIcon: { width: 50, height: 50, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  featureText: { flex: 1 },
  featureTitle: { fontFamily: "Nunito_700Bold", fontSize: 16, color: Colors.charcoal },
  featureSub: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  statsRow: { flexDirection: "row", gap: 10 },
  statBox: {
    flex: 1, backgroundColor: Colors.cardBg, borderRadius: 14,
    borderWidth: 1.5, borderColor: Colors.borderSoft,
    padding: 14, alignItems: "center", gap: 2,
  },
  statBoxMid: { backgroundColor: Colors.ocean + "12", borderColor: Colors.ocean + "30" },
  statNum: { fontFamily: "Nunito_800ExtraBold", fontSize: 26, color: Colors.ocean },
  statLabel: { fontFamily: "Nunito_600SemiBold", fontSize: 12, color: Colors.textMuted },
  trustCard: {
    backgroundColor: Colors.ocean + "10",
    borderRadius: 16, borderWidth: 1.5, borderColor: Colors.ocean + "25",
    padding: 14, gap: 12,
  },
  trustHeader: { flexDirection: "row", alignItems: "center", gap: 7 },
  trustTitle: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.ocean },
  trustIconRow: { flexDirection: "row", justifyContent: "space-around" },
  trustIconItem: { alignItems: "center", gap: 5 },
  trustIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  trustIconLabel: { fontFamily: "Nunito_600SemiBold", fontSize: 10, color: Colors.textMuted, textAlign: "center" },
});
