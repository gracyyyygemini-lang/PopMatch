import React, { useState, useRef } from "react";
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
  summer_sublease: "Summer Sublease (May – Aug)",
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
  smile: "Smile",
  other: "Private / Other",
};

function InfoRow({ icon, label, value, color }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; color?: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIcon, { backgroundColor: (color || Colors.ocean) + "18" }]}>
        <Ionicons name={icon} size={15} color={color || Colors.ocean} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser, matches, likedUserIds, subleases, friends, setCurrentUser, setIsOnboarded } = useApp();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const mySubleases = subleases.filter(s => s.userId === currentUser?.id);
  const [versionTaps, setVersionTaps] = useState(0);
  const versionTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleVersionTap = () => {
    const next = versionTaps + 1;
    setVersionTaps(next);
    if (versionTapTimer.current) clearTimeout(versionTapTimer.current);
    if (next >= 5) {
      setVersionTaps(0);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push("/admin");
    } else {
      versionTapTimer.current = setTimeout(() => setVersionTaps(0), 3000);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "You'll need to verify your @illinois.edu email to sign back in.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await AsyncStorage.multiRemove(["@popmatch_user", "@popmatch_onboarded"]);
            await setCurrentUser(null);
            await setIsOnboarded(false);
            router.replace("/onboarding");
          }
        }
      ]
    );
  };

  const handleReset = () => {
    Alert.alert(
      "Reset All Data",
      "This clears your profile, matches, listings, and connections — everything starts fresh.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset Everything",
          style: "destructive",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await AsyncStorage.multiRemove([
              "@popmatch_user", "@popmatch_onboarded", "@popmatch_matches",
              "@popmatch_liked", "@popmatch_passed", "@popmatch_scam",
              "@popmatch_subleases", "@popmatch_breaks", "@popmatch_friends"
            ]);
            await setCurrentUser(null);
            await setIsOnboarded(false);
            router.replace("/onboarding");
          }
        }
      ]
    );
  };

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

  const initials = currentUser.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <View style={[styles.container, { backgroundColor: Colors.sand }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
          <Ionicons name="log-out-outline" size={17} color={Colors.textMuted} />
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
              <Ionicons name="school-outline" size={12} color={Colors.ocean} />
              <Text style={styles.majorTagText}>{currentUser.major}</Text>
            </View>
          ) : null}
          {currentUser.bio ? (
            <Text style={styles.bio}>{currentUser.bio}</Text>
          ) : null}

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{friends.length}</Text>
              <Text style={styles.statLabel}>Circle</Text>
            </View>
            <View style={[styles.statBox, styles.statBoxMid]}>
              <Text style={[styles.statNum, { color: Colors.ocean }]}>${currentUser.budget}</Text>
              <Text style={styles.statLabel}>Budget/mo</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{mySubleases.length}</Text>
              <Text style={styles.statLabel}>Listings</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Housing Details</Text>
          <View style={styles.detailCard}>
            <InfoRow icon="calendar-outline" label="Lease Type" value={LEASE_LABELS[currentUser.leaseType]} color={Colors.ocean} />
            <View style={styles.divider} />
            <InfoRow icon="location-outline" label="Preferred Zone" value={ZONE_LABELS[currentUser.zone]} color={Colors.grassGreen} />
            <View style={styles.divider} />
            <InfoRow icon="business-outline" label="Landlord" value={LANDLORD_LABELS[currentUser.landlord]} color={Colors.orange} />
            <View style={styles.divider} />
            <InfoRow icon="people-outline" label="Roommate Pref" value={GENDER_LABELS[currentUser.genderPref]} color={Colors.goldDark} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lifestyle</Text>
          <View style={styles.detailCard}>
            <View style={styles.ratingRow}>
              <Text style={styles.ratingLabel}>Cleanliness</Text>
              <View style={styles.dots}>
                {[1,2,3,4,5].map(n => (
                  <View key={n} style={[styles.dot, { backgroundColor: n <= currentUser.cleanliness ? Colors.grassGreen : Colors.borderSoft }]} />
                ))}
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.ratingRow}>
              <Text style={styles.ratingLabel}>Noise & Social</Text>
              <View style={styles.dots}>
                {[1,2,3,4,5].map(n => (
                  <View key={n} style={[styles.dot, { backgroundColor: n <= currentUser.noise ? Colors.ocean : Colors.borderSoft }]} />
                ))}
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.ratingRow}>
              <Text style={styles.ratingLabel}>I identify as</Text>
              <Text style={styles.ratingValue}>
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
                <Ionicons name="home-outline" size={15} color={currentUser.staysThanksgiving ? Colors.grassGreen : Colors.textLight} />
                <Text style={styles.breakLabel}>Thanksgiving Break</Text>
              </View>
              <View style={[styles.breakBadge, { backgroundColor: currentUser.staysThanksgiving ? Colors.grassGreen : Colors.borderSoft }]}>
                <Text style={[styles.breakBadgeText, { color: currentUser.staysThanksgiving ? Colors.white : Colors.textMuted }]}>
                  {currentUser.staysThanksgiving ? "Staying" : "Leaving"}
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.breakRow}>
              <View style={styles.breakLeft}>
                <Ionicons name="sunny-outline" size={15} color={currentUser.staysSpringBreak ? Colors.grassGreen : Colors.textLight} />
                <Text style={styles.breakLabel}>Spring Break</Text>
              </View>
              <View style={[styles.breakBadge, { backgroundColor: currentUser.staysSpringBreak ? Colors.grassGreen : Colors.borderSoft }]}>
                <Text style={[styles.breakBadgeText, { color: currentUser.staysSpringBreak ? Colors.white : Colors.textMuted }]}>
                  {currentUser.staysSpringBreak ? "Staying" : "Leaving"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How Matching Works</Text>
          <View style={styles.algoCard}>
            <Text style={styles.algoDesc}>Weighted Euclidean Distance formula. Lower distance = higher compatibility.</Text>
            {[
              { label: "Budget compatibility", weight: "35%", color: Colors.ocean },
              { label: "Cleanliness match", weight: "25%", color: Colors.grassGreen },
              { label: "Noise & social level", weight: "20%", color: Colors.orange },
              { label: "Zone proximity", weight: "20%", color: Colors.goldDark },
            ].map(({ label, weight, color }) => (
              <View key={label} style={styles.algoRow}>
                <View style={[styles.algoDot, { backgroundColor: color }]} />
                <Text style={styles.algoLabel}>{label}</Text>
                <Text style={[styles.algoWeight, { color }]}>{weight}</Text>
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.signOutFullBtn} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={15} color={Colors.ocean} />
          <Text style={styles.signOutFullBtnText}>Sign Out</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.resetFullBtn} onPress={handleReset}>
          <Ionicons name="trash-outline" size={15} color={Colors.errorRed} />
          <Text style={styles.resetFullBtnText}>Reset All Data</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleVersionTap} activeOpacity={1} style={styles.versionLabel}>
          <Text style={styles.versionText}>
            PopMatch v1.0.0{versionTaps > 0 ? ` (${5 - versionTaps} more)` : ""}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.sand },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingHorizontal: 20, paddingBottom: 12,
  },
  headerTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 28, color: Colors.ocean },
  signOutBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.cardBg,
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.borderSoft,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },
  profileCard: {
    backgroundColor: Colors.cardBg, borderRadius: 20, borderWidth: 1.5,
    borderColor: Colors.borderSoft, padding: 20, alignItems: "center", gap: 8,
  },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: "Nunito_800ExtraBold", fontSize: 28, color: Colors.white },
  profileName: { fontFamily: "Nunito_800ExtraBold", fontSize: 22, color: Colors.charcoal },
  profileEmail: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textMuted },
  majorTag: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: Colors.ocean + "18", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
  },
  majorTagText: { fontFamily: "Nunito_600SemiBold", fontSize: 12, color: Colors.ocean },
  bio: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textMuted, textAlign: "center", lineHeight: 19 },
  statsRow: { flexDirection: "row", width: "100%", gap: 8, marginTop: 4 },
  statBox: { flex: 1, backgroundColor: Colors.sandDark, borderRadius: 12, padding: 12, alignItems: "center", gap: 2 },
  statBoxMid: { backgroundColor: Colors.ocean + "15" },
  statNum: { fontFamily: "Nunito_800ExtraBold", fontSize: 20, color: Colors.charcoal },
  statLabel: { fontFamily: "Nunito_400Regular", fontSize: 11, color: Colors.textMuted },
  section: { gap: 8 },
  sectionTitle: { fontFamily: "Nunito_700Bold", fontSize: 15, color: Colors.charcoal, paddingHorizontal: 2 },
  detailCard: { backgroundColor: Colors.cardBg, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.borderSoft, overflow: "hidden" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  infoIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  infoContent: { flex: 1 },
  infoLabel: { fontFamily: "Nunito_400Regular", fontSize: 11, color: Colors.textMuted },
  infoValue: { fontFamily: "Nunito_600SemiBold", fontSize: 14, color: Colors.charcoal },
  divider: { height: 1, backgroundColor: Colors.sandDark, marginLeft: 60 },
  ratingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14 },
  ratingLabel: { fontFamily: "Nunito_600SemiBold", fontSize: 14, color: Colors.charcoal },
  ratingValue: { fontFamily: "Nunito_600SemiBold", fontSize: 13, color: Colors.textMuted },
  dots: { flexDirection: "row", gap: 5 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  breakRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14 },
  breakLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  breakLabel: { fontFamily: "Nunito_600SemiBold", fontSize: 14, color: Colors.charcoal },
  breakBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  breakBadgeText: { fontFamily: "Nunito_700Bold", fontSize: 12 },
  algoCard: { backgroundColor: Colors.cardBg, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.borderSoft, padding: 16, gap: 10 },
  algoDesc: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted, lineHeight: 18 },
  algoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  algoDot: { width: 9, height: 9, borderRadius: 5 },
  algoLabel: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.charcoal, flex: 1 },
  algoWeight: { fontFamily: "Nunito_700Bold", fontSize: 13 },
  signOutFullBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.ocean + "12", borderRadius: 12, borderWidth: 1.5,
    borderColor: Colors.ocean + "30", paddingVertical: 13,
  },
  signOutFullBtnText: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.ocean },
  resetFullBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.errorRed + "10", borderRadius: 12, borderWidth: 1.5,
    borderColor: Colors.errorRed + "30", paddingVertical: 13,
  },
  resetFullBtnText: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.errorRed },
  noProfile: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  noProfileText: { fontFamily: "Nunito_400Regular", fontSize: 14, color: Colors.textMuted },
  versionLabel: { alignItems: "center", paddingVertical: 12 },
  versionText: { fontFamily: "Nunito_400Regular", fontSize: 11, color: Colors.textLight },
});
