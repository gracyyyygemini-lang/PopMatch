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
    dates: "Mid-May – Early August",
    icon: "sunny" as const,
    color: Colors.orange,
    desc: "May 15 – Aug 10 subleases",
  },
  {
    id: "august_gap",
    title: "The August Gap",
    dates: "1–2 weeks in August",
    icon: "time-outline" as const,
    color: Colors.ocean,
    desc: "Short handoff stays before fall lease starts",
  },
  {
    id: "semester_takeover",
    title: "Semester / Full Year",
    dates: "Fall, Spring, or 12 months",
    icon: "calendar-outline" as const,
    color: Colors.grassGreen,
    desc: "Full takeovers — Aug–Dec, Jan–May, or Aug–Jul",
  },
  {
    id: "short_term",
    title: "Short-Term & Events",
    dates: "1–14 days",
    icon: "ticket-outline" as const,
    color: Colors.goldDark,
    desc: "Moms Weekend, Thanksgiving, graduation stays",
  },
];

const FEATURES = [
  {
    route: "/matchmaker" as const,
    title: "Year-Long Matchmaker",
    subtitle: "Swipe & match for a full 12-month lease",
    icon: "heart" as const,
    color: Colors.ocean,
  },
  {
    route: "/breaks" as const,
    title: "Break Stay Board",
    subtitle: "Offer or seek housing over Thanksgiving, Spring & Winter breaks",
    icon: "partly-sunny-outline" as const,
    color: Colors.grassGreen,
  },
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
          <Text style={styles.tagline}>UIUC Housing — Find your match</Text>
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

        <Text style={styles.sectionLabel}>Browse by housing type</Text>

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
              <Text style={styles.catDesc} numberOfLines={2}>{cat.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Other features</Text>

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
            <Text style={styles.statLabel}>Circle</Text>
          </View>
          <View style={[styles.statBox, styles.statBoxMid]}>
            <Text style={styles.statNum}>{subleases.length}</Text>
            <Text style={styles.statLabel}>Listings</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{breakPosts.length}</Text>
            <Text style={styles.statLabel}>Break Posts</Text>
          </View>
        </View>

        <View style={styles.trustCard}>
          <View style={styles.trustHeader}>
            <Ionicons name="shield-checkmark" size={16} color={Colors.ocean} />
            <Text style={styles.trustTitle}>PopMatch Protection</Text>
          </View>
          {[
            "Only @illinois.edu verified students",
            "Social Trust Graph — see mutual connections",
            "Landlord-specific warnings (JSM, UGroup, Bailey, American)",
            "Weighted Euclidean matching for compatibility",
          ].map((tip) => (
            <View key={tip} style={styles.tipRow}>
              <View style={styles.tipDot} />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
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
  greeting: { fontFamily: "Nunito_800ExtraBold", fontSize: 28, color: Colors.ocean },
  tagline: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textMuted },
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
  grid: {
    flexDirection: "row", flexWrap: "wrap", gap: 10,
  },
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
  catTitle: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.charcoal },
  catDates: { fontFamily: "Nunito_600SemiBold", fontSize: 11, color: Colors.textMuted },
  catDesc: { fontFamily: "Nunito_400Regular", fontSize: 11, color: Colors.textLight, lineHeight: 16 },
  featureCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: Colors.cardBg, borderRadius: 18,
    borderWidth: 1.5, borderColor: Colors.borderSoft, padding: 14,
    shadowColor: Colors.charcoal, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
  featureIcon: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  featureText: { flex: 1 },
  featureTitle: { fontFamily: "Nunito_700Bold", fontSize: 15, color: Colors.charcoal },
  featureSub: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted, lineHeight: 17, marginTop: 2 },
  statsRow: { flexDirection: "row", gap: 10 },
  statBox: {
    flex: 1, backgroundColor: Colors.cardBg, borderRadius: 14,
    borderWidth: 1.5, borderColor: Colors.borderSoft,
    padding: 14, alignItems: "center", gap: 2,
  },
  statBoxMid: { backgroundColor: Colors.ocean + "12", borderColor: Colors.ocean + "30" },
  statNum: { fontFamily: "Nunito_800ExtraBold", fontSize: 24, color: Colors.ocean },
  statLabel: { fontFamily: "Nunito_400Regular", fontSize: 11, color: Colors.textMuted },
  trustCard: {
    backgroundColor: Colors.ocean + "10",
    borderRadius: 16, borderWidth: 1.5, borderColor: Colors.ocean + "25",
    padding: 16, gap: 10,
  },
  trustHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  trustTitle: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.ocean },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  tipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.ocean, marginTop: 6 },
  tipText: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.charcoal, flex: 1, lineHeight: 19 },
});
