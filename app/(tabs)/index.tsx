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

const SECTIONS = [
  {
    route: "/matchmaker" as const,
    title: "Year-Long Matchmaker",
    subtitle: "Find a roommate for a full 12-month lease",
    icon: "heart" as const,
    iconBg: Colors.ocean,
    accent: Colors.ocean,
    tag: "Smart Matching",
  },
  {
    route: "/marketplace" as const,
    title: "Sublease Marketplace",
    subtitle: "Browse & post Fall, Spring, or Summer subleases",
    icon: "storefront" as const,
    iconBg: Colors.orange,
    accent: Colors.orange,
    tag: "Student Listings",
  },
  {
    route: "/breaks" as const,
    title: "Break Stay Board",
    subtitle: "Short-term housing for Thanksgiving, Spring & Winter breaks",
    icon: "sunny" as const,
    iconBg: Colors.grassGreen,
    accent: Colors.grassGreen,
    tag: "1-Week Stays",
  },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser, subleases, breakPosts, likedUserIds } = useApp();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: Colors.sand }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <View>
          <Text style={styles.greeting}>
            {currentUser ? `Hey, ${currentUser.name.split(" ")[0]}` : "PopMatch"}
          </Text>
          <Text style={styles.tagline}>UIUC Student Housing</Text>
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

        <Text style={styles.sectionHeader}>What are you looking for?</Text>

        {SECTIONS.map((section) => (
          <TouchableOpacity
            key={section.route}
            style={styles.sectionCard}
            activeOpacity={0.85}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push(section.route);
            }}
          >
            <View style={[styles.sectionIcon, { backgroundColor: section.iconBg }]}>
              <Ionicons name={section.icon} size={26} color={Colors.white} />
            </View>
            <View style={styles.sectionText}>
              <View style={styles.sectionTopRow}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <View style={[styles.sectionTag, { backgroundColor: section.accent + "20" }]}>
                  <Text style={[styles.sectionTagText, { color: section.accent }]}>{section.tag}</Text>
                </View>
              </View>
              <Text style={styles.sectionSubtitle}>{section.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
          </TouchableOpacity>
        ))}

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{likedUserIds.length}</Text>
            <Text style={styles.statLabel}>Liked</Text>
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

        <View style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Ionicons name="shield-checkmark" size={16} color={Colors.ocean} />
            <Text style={styles.tipsTitle}>PopMatch Protection</Text>
          </View>
          {[
            "Only @illinois.edu verified students",
            "Landlord warnings generated automatically",
            "Weighted matching for compatibility",
            "Digital agreement with utility splits",
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
    paddingHorizontal: 20, paddingBottom: 16,
    backgroundColor: Colors.sand,
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
  sectionHeader: {
    fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.textMuted,
    textTransform: "uppercase", letterSpacing: 0.8, marginTop: 4, marginBottom: 2,
  },
  sectionCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: Colors.cardBg, borderRadius: 18,
    borderWidth: 1.5, borderColor: Colors.borderSoft,
    padding: 16,
    shadowColor: Colors.charcoal, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  sectionIcon: {
    width: 54, height: 54, borderRadius: 16, alignItems: "center", justifyContent: "center",
  },
  sectionText: { flex: 1, gap: 4 },
  sectionTopRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  sectionTitle: { fontFamily: "Nunito_700Bold", fontSize: 15, color: Colors.charcoal },
  sectionTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  sectionTagText: { fontFamily: "Nunito_600SemiBold", fontSize: 10 },
  sectionSubtitle: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted, lineHeight: 17 },
  statsRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  statBox: {
    flex: 1, backgroundColor: Colors.cardBg, borderRadius: 14,
    borderWidth: 1.5, borderColor: Colors.borderSoft,
    padding: 14, alignItems: "center", gap: 2,
  },
  statBoxMid: { backgroundColor: Colors.ocean + "12", borderColor: Colors.ocean + "30" },
  statNum: { fontFamily: "Nunito_800ExtraBold", fontSize: 24, color: Colors.ocean },
  statLabel: { fontFamily: "Nunito_400Regular", fontSize: 11, color: Colors.textMuted },
  tipsCard: {
    backgroundColor: Colors.ocean + "10",
    borderRadius: 16, borderWidth: 1.5, borderColor: Colors.ocean + "25",
    padding: 16, gap: 10,
  },
  tipsHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  tipsTitle: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.ocean },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  tipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.ocean, marginTop: 6 },
  tipText: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.charcoal, flex: 1, lineHeight: 19 },
});
