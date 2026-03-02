import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";

const LEASE_LABELS: Record<string, string> = {
  full_year: "Full Year (Aug – Jul)",
  fall_sublease: "Fall Sublease (Aug – Dec)",
  spring_sublease: "Spring Sublease (Jan – May)",
};

const GENDER_LABELS: Record<string, string> = {
  girls_only: "Girls Only",
  boys_only: "Boys Only",
  mixed: "No Preference",
};

const ZONE_LABELS: Record<string, string> = {
  campustown: "Campustown",
  north: "North Campus",
  south: "South Campus",
  urbana: "Urbana",
  downtown: "Downtown Champaign",
};

const LANDLORD_LABELS: Record<string, string> = {
  jsm: "JSM",
  ugroup: "UGroup",
  bailey: "Bailey",
  american: "American Campus",
  other: "Private / Other",
};

function StatRow({ icon, label, value, color }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; color?: string }) {
  return (
    <View style={styles.statRow}>
      <View style={[styles.statIcon, { backgroundColor: (color || Colors.skyBlueDark) + "20" }]}>
        <Ionicons name={icon} size={16} color={color || Colors.skyBlueDark} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </View>
  );
}

function RatingDisplay({ value, color }: { value: number; color: string }) {
  return (
    <View style={styles.ratingDisplayRow}>
      {[1,2,3,4,5].map(n => (
        <View key={n} style={[styles.ratingDisplayDot, { backgroundColor: n <= value ? color : Colors.borderSoft }]} />
      ))}
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser, matches, likedUserIds, setCurrentUser, setIsOnboarded } = useApp();

  const matchCount = likedUserIds.length;
  const initials = currentUser?.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?";

  const handleReset = () => {
    Alert.alert(
      "Reset PopMatch",
      "This will clear all your data and restart onboarding. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await AsyncStorage.multiRemove([
              "@popmatch_user", "@popmatch_onboarded", "@popmatch_matches",
              "@popmatch_liked", "@popmatch_passed", "@popmatch_scam"
            ]);
            await setCurrentUser(null);
            await setIsOnboarded(false);
            router.replace("/onboarding");
          }
        }
      ]
    );
  };

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  if (!currentUser) {
    return (
      <View style={[styles.container, { paddingTop: topPadding + 16 }]}>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.noProfile}>
          <Ionicons name="person-outline" size={40} color={Colors.textLight} />
          <Text style={styles.noProfileText}>No profile found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.parchment }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
          <Ionicons name="refresh-outline" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, {
        paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 90
      }]} showsVerticalScrollIndicator={false}>

        <View style={styles.profileCard}>
          <View style={[styles.avatar, { backgroundColor: currentUser.avatarColor }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.profileName}>{currentUser.name}</Text>
          <Text style={styles.profileEmail}>{currentUser.email}</Text>
          {currentUser.major ? (
            <View style={styles.majorTag}>
              <Ionicons name="school-outline" size={13} color={Colors.skyBlueDark} />
              <Text style={styles.majorTagText}>{currentUser.major}</Text>
            </View>
          ) : null}
          {currentUser.bio ? (
            <Text style={styles.bio}>{currentUser.bio}</Text>
          ) : null}

          <View style={styles.statsCards}>
            <View style={styles.statCard}>
              <Text style={styles.statCardNum}>{matchCount}</Text>
              <Text style={styles.statCardLabel}>Liked</Text>
            </View>
            <View style={[styles.statCard, styles.statCardMiddle]}>
              <Text style={styles.statCardNum}>${currentUser.budget}</Text>
              <Text style={styles.statCardLabel}>Budget/mo</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statCardNum}>{currentUser.cleanliness}/5</Text>
              <Text style={styles.statCardLabel}>Clean</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Housing Details</Text>
          <View style={styles.detailCard}>
            <StatRow icon="calendar-outline" label="Lease Type" value={LEASE_LABELS[currentUser.leaseType]} color={Colors.skyBlueDark} />
            <View style={styles.divider} />
            <StatRow icon="location-outline" label="Preferred Zone" value={ZONE_LABELS[currentUser.zone]} color={Colors.grassGreenDark} />
            <View style={styles.divider} />
            <StatRow icon="business-outline" label="Landlord" value={LANDLORD_LABELS[currentUser.landlord]} color={Colors.warmBrown} />
            <View style={styles.divider} />
            <StatRow icon="people-outline" label="Roommate Pref" value={GENDER_LABELS[currentUser.genderPref]} color={Colors.sunflowerDark} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lifestyle</Text>
          <View style={styles.detailCard}>
            <View style={styles.lifestyleRow}>
              <Text style={styles.lifestyleLabel}>Cleanliness</Text>
              <RatingDisplay value={currentUser.cleanliness} color={Colors.grassGreenDark} />
            </View>
            <View style={styles.divider} />
            <View style={styles.lifestyleRow}>
              <Text style={styles.lifestyleLabel}>Noise & Social</Text>
              <RatingDisplay value={currentUser.noise} color={Colors.skyBlueDark} />
            </View>
            <View style={styles.divider} />
            <View style={styles.lifestyleRow}>
              <Text style={styles.lifestyleLabel}>Gender</Text>
              <Text style={styles.lifestyleValue}>
                {currentUser.gender === "female" ? "Woman" : currentUser.gender === "male" ? "Man" : "Non-binary"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Break Plans</Text>
          <View style={styles.detailCard}>
            <View style={styles.breakRow}>
              <View style={styles.breakLeft}>
                <Ionicons name="home-outline" size={16} color={currentUser.staysThanksgiving ? Colors.grassGreenDark : Colors.textLight} />
                <Text style={styles.breakLabel}>Thanksgiving Break</Text>
              </View>
              <View style={[styles.breakBadge, { backgroundColor: currentUser.staysThanksgiving ? Colors.grassGreenDark : Colors.borderSoft }]}>
                <Text style={[styles.breakBadgeText, { color: currentUser.staysThanksgiving ? Colors.white : Colors.textMuted }]}>
                  {currentUser.staysThanksgiving ? "Staying" : "Leaving"}
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.breakRow}>
              <View style={styles.breakLeft}>
                <Ionicons name="sunny-outline" size={16} color={currentUser.staysSpringBreak ? Colors.grassGreenDark : Colors.textLight} />
                <Text style={styles.breakLabel}>Spring Break</Text>
              </View>
              <View style={[styles.breakBadge, { backgroundColor: currentUser.staysSpringBreak ? Colors.grassGreenDark : Colors.borderSoft }]}>
                <Text style={[styles.breakBadgeText, { color: currentUser.staysSpringBreak ? Colors.white : Colors.textMuted }]}>
                  {currentUser.staysSpringBreak ? "Staying" : "Leaving"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Matching Algorithm</Text>
          <View style={styles.algoCard}>
            <Text style={styles.algoTitle}>Weighted Distance Score</Text>
            <Text style={styles.algoDesc}>Your matches are ranked by a weighted Euclidean distance formula considering:</Text>
            <View style={styles.algoRows}>
              {[
                { label: "Budget compatibility", weight: "35%", color: Colors.sunflowerDark },
                { label: "Cleanliness match", weight: "25%", color: Colors.grassGreenDark },
                { label: "Noise & social level", weight: "20%", color: Colors.skyBlueDark },
                { label: "Zone proximity", weight: "20%", color: Colors.warmBrown },
              ].map(({ label, weight, color }) => (
                <View key={label} style={styles.algoRow}>
                  <View style={[styles.algoDot, { backgroundColor: color }]} />
                  <Text style={styles.algoLabel}>{label}</Text>
                  <Text style={[styles.algoWeight, { color }]}>{weight}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.resetFullBtn} onPress={handleReset}>
          <Ionicons name="refresh-outline" size={16} color={Colors.errorRed} />
          <Text style={styles.resetFullBtnText}>Reset & Start Over</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.parchment },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingHorizontal: 20, paddingBottom: 12,
  },
  headerTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 28, color: Colors.charcoal },
  resetBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.parchmentDark,
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.borderSoft,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },
  profileCard: {
    backgroundColor: Colors.cardBg, borderRadius: 20, borderWidth: 1.5,
    borderColor: Colors.borderSoft, padding: 20, alignItems: "center", gap: 10,
  },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: "Nunito_800ExtraBold", fontSize: 28, color: Colors.white },
  profileName: { fontFamily: "Nunito_800ExtraBold", fontSize: 22, color: Colors.charcoal },
  profileEmail: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textMuted },
  majorTag: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: Colors.skyBlue + "30", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
  },
  majorTagText: { fontFamily: "Nunito_600SemiBold", fontSize: 12, color: Colors.skyBlueDark },
  bio: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textMuted, textAlign: "center", lineHeight: 19 },
  statsCards: { flexDirection: "row", width: "100%", gap: 10, marginTop: 4 },
  statCard: { flex: 1, backgroundColor: Colors.parchmentDark, borderRadius: 12, padding: 12, alignItems: "center" },
  statCardMiddle: { backgroundColor: Colors.skyBlue + "25" },
  statCardNum: { fontFamily: "Nunito_800ExtraBold", fontSize: 20, color: Colors.charcoal },
  statCardLabel: { fontFamily: "Nunito_400Regular", fontSize: 11, color: Colors.textMuted },
  section: { gap: 8 },
  sectionTitle: { fontFamily: "Nunito_700Bold", fontSize: 16, color: Colors.charcoal, paddingHorizontal: 2 },
  detailCard: {
    backgroundColor: Colors.cardBg, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.borderSoft, overflow: "hidden",
  },
  statRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  statIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  statContent: { flex: 1 },
  statLabel: { fontFamily: "Nunito_400Regular", fontSize: 11, color: Colors.textMuted },
  statValue: { fontFamily: "Nunito_600SemiBold", fontSize: 14, color: Colors.charcoal },
  divider: { height: 1, backgroundColor: Colors.parchmentDark, marginLeft: 60 },
  lifestyleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14 },
  lifestyleLabel: { fontFamily: "Nunito_600SemiBold", fontSize: 14, color: Colors.charcoal },
  lifestyleValue: { fontFamily: "Nunito_600SemiBold", fontSize: 13, color: Colors.textMuted },
  ratingDisplayRow: { flexDirection: "row", gap: 5 },
  ratingDisplayDot: { width: 12, height: 12, borderRadius: 6 },
  breakRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14 },
  breakLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  breakLabel: { fontFamily: "Nunito_600SemiBold", fontSize: 14, color: Colors.charcoal },
  breakBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  breakBadgeText: { fontFamily: "Nunito_700Bold", fontSize: 12 },
  algoCard: {
    backgroundColor: Colors.cardBg, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.borderSoft, padding: 16, gap: 10,
  },
  algoTitle: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.charcoal },
  algoDesc: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted, lineHeight: 18 },
  algoRows: { gap: 8 },
  algoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  algoDot: { width: 10, height: 10, borderRadius: 5 },
  algoLabel: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.charcoal, flex: 1 },
  algoWeight: { fontFamily: "Nunito_700Bold", fontSize: 13 },
  resetFullBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.errorRed + "15", borderRadius: 12, borderWidth: 1.5,
    borderColor: Colors.errorRed + "40", paddingVertical: 14,
  },
  resetFullBtnText: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.errorRed },
  noProfile: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  noProfileText: { fontFamily: "Nunito_400Regular", fontSize: 14, color: Colors.textMuted },
});
