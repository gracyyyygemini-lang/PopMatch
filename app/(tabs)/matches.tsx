import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Modal
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useApp, UserProfile, Landlord } from "@/context/AppContext";

const LANDLORD_ALERTS: Record<Landlord, { level: "info" | "warn" | "danger"; title: string; message: string }> = {
  jsm: {
    level: "info",
    title: "JSM Sublease Warning",
    message: "JSM charges a $50 sublease fee. You are also required to provide proof of Renter's Insurance. Make sure your replacement tenant is approved by JSM management before moving out."
  },
  ugroup: {
    level: "warn",
    title: "UGroup Move-In Report",
    message: "UGroup charges a $125 sublease transfer fee. There is a mandatory 72-hour Move-In Condition Report — document ALL pre-existing damage with photos within 72 hours or you'll be charged on move-out."
  },
  bailey: {
    level: "warn",
    title: "Bailey Walkthrough Alert",
    message: "IMPORTANT: Walk into the Bailey office together with your replacement tenant. If you go separately, the landlord may try to negotiate a new full lease directly with your sublessee, cutting you out of the arrangement!"
  },
  american: {
    level: "danger",
    title: "American Campus – RELET FEE ALERT",
    message: "American Campus Communities (Latitude, 212, Tower) charges up to $600 in 'Relet' fees. This is extremely high. Consider all options carefully and get everything in writing before proceeding."
  },
  other: {
    level: "info",
    title: "Private Landlord",
    message: "For private/independent landlords, always get a written sublease agreement. Document the security deposit transfer with a signed receipt. Meet in person and verify their identity."
  },
};

const LEASE_LABELS: Record<string, string> = {
  full_year: "Full Year",
  fall_sublease: "Fall Sublease",
  spring_sublease: "Spring Sublease",
};

function LevelIcon({ level }: { level: "info" | "warn" | "danger" }) {
  if (level === "danger") return <Ionicons name="alert-circle" size={18} color={Colors.alertRed} />;
  if (level === "warn") return <Ionicons name="warning-outline" size={18} color={Colors.alertOrange} />;
  return <Ionicons name="information-circle-outline" size={18} color={Colors.skyBlueDark} />;
}

function LandlordAlertCard({ landlord }: { landlord: Landlord }) {
  const alert = LANDLORD_ALERTS[landlord];
  const bgColor = alert.level === "danger" ? "#FFF0F0" : alert.level === "warn" ? "#FFF4E6" : "#EFF8FF";
  const borderColor = alert.level === "danger" ? Colors.alertRed : alert.level === "warn" ? Colors.alertOrange : Colors.skyBlueDark;

  return (
    <View style={[styles.alertCard, { backgroundColor: bgColor, borderLeftColor: borderColor }]}>
      <View style={styles.alertHeader}>
        <LevelIcon level={alert.level} />
        <Text style={[styles.alertTitle, { color: borderColor }]}>{alert.title}</Text>
      </View>
      <Text style={styles.alertBody}>{alert.message}</Text>
    </View>
  );
}

function AgreementModal({ user, score, onClose }: { user: UserProfile; score: number; onClose: () => void }) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <Modal animationType="slide" transparent={true} visible={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Roommate Agreement</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <Ionicons name="close" size={22} color={Colors.charcoal} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.agreementSection}>
              <View style={styles.agreementHeaderBlock}>
                <Text style={styles.agreementTitleLarge}>PopMatch Roommate Agreement</Text>
                <Text style={styles.agreementDate}>Generated: {dateStr}</Text>
              </View>

              <View style={styles.agreementBlock}>
                <Text style={styles.agreementSectionTitle}>Parties</Text>
                <Text style={styles.agreementItem}>• Resident A: {user.name} ({user.email})</Text>
                <Text style={styles.agreementItem}>• Lease Type: {LEASE_LABELS[user.leaseType]}</Text>
                <Text style={styles.agreementItem}>• Match Score: {score}%</Text>
              </View>

              <View style={styles.agreementBlock}>
                <Text style={styles.agreementSectionTitle}>Utility Splits</Text>
                <Text style={styles.agreementItem}>• Ameren Illinois (Electric/Gas): Split equally by occupancy</Text>
                <Text style={styles.agreementItem}>• Illinois American Water: Split equally</Text>
                <Text style={styles.agreementItem}>• Internet (Xfinity/Volo): Rotate account holder annually</Text>
                <Text style={styles.agreementItem}>• Break periods: Person staying pays full utilities</Text>
              </View>

              <View style={styles.agreementBlock}>
                <Text style={styles.agreementSectionTitle}>Security Deposit Receipt</Text>
                <Text style={styles.agreementItem}>• Original security deposit to be transferred privately in cash or Venmo</Text>
                <Text style={styles.agreementItem}>• Both parties must sign a receipt confirming the exact amount</Text>
                <Text style={styles.agreementItem}>• Receipt serves as binding proof of transfer</Text>
              </View>

              <View style={styles.agreementBlock}>
                <Text style={styles.agreementSectionTitle}>House Rules</Text>
                <Text style={styles.agreementItem}>• Overnight guests: Max 3 consecutive nights without notice</Text>
                <Text style={styles.agreementItem}>• Chores: Rotate weekly (kitchen, bathroom, common areas)</Text>
                <Text style={styles.agreementItem}>• Thermostat: 68–72°F (agreed temp range)</Text>
                <Text style={styles.agreementItem}>• Quiet hours: 10pm–8am on weekdays</Text>
                <Text style={styles.agreementItem}>• Dishes: Washed within 24 hours of use</Text>
              </View>

              <View style={styles.agreementBlock}>
                <Text style={styles.agreementSectionTitle}>Break Arrangements</Text>
                <Text style={styles.agreementItem}>• Thanksgiving: {user.staysThanksgiving ? user.name + " stays" : user.name + " leaves"}</Text>
                <Text style={styles.agreementItem}>• Spring Break: {user.staysSpringBreak ? user.name + " stays" : user.name + " leaves"}</Text>
              </View>

              <View style={styles.signatureBlock}>
                <Text style={styles.signatureLine}>Resident A: _______________________  Date: _______</Text>
                <Text style={styles.signatureLine}>Resident B: _______________________  Date: _______</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function MatchesScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser, mockUsers, matches, computeScore } = useApp();
  const [selectedMatch, setSelectedMatch] = useState<UserProfile | null>(null);
  const [agreementUser, setAgreementUser] = useState<UserProfile | null>(null);

  const likedMatches = matches.filter(m => m.liked);
  const matchedUsers = likedMatches
    .map(m => {
      const user = mockUsers.find(u => u.id === m.userId);
      if (!user) return null;
      return { user, score: m.score };
    })
    .filter((m): m is { user: UserProfile; score: number } => m !== null)
    .sort((a, b) => b.score - a.score);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: Colors.parchment }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Text style={styles.headerTitle}>Matches</Text>
        <Text style={styles.headerSub}>{matchedUsers.length} connection{matchedUsers.length !== 1 ? "s" : ""}</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, {
        paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 90
      }]} showsVerticalScrollIndicator={false}>

        {matchedUsers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="heart-outline" size={52} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>No matches yet</Text>
            <Text style={styles.emptySub}>Start swiping to find your Illini roommate!</Text>
          </View>
        ) : (
          matchedUsers.map(({ user, score }) => (
            <View key={user.id} style={styles.matchCard}>
              <TouchableOpacity
                style={styles.matchCardInner}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedMatch(selectedMatch?.id === user.id ? null : user);
                }}>
                <View style={[styles.matchAvatar, { backgroundColor: user.avatarColor }]}>
                  <Text style={styles.matchAvatarText}>
                    {user.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </Text>
                </View>
                <View style={styles.matchInfo}>
                  <Text style={styles.matchName}>{user.name}</Text>
                  <Text style={styles.matchMajor}>{user.major}</Text>
                  <Text style={styles.matchDetail}>${user.budget}/mo · {LEASE_LABELS[user.leaseType]}</Text>
                </View>
                <View style={styles.matchRight}>
                  <View style={[styles.matchScore, {
                    backgroundColor: score >= 80 ? Colors.grassGreenDark : score >= 60 ? Colors.skyBlueDark : Colors.textMuted
                  }]}>
                    <Text style={styles.matchScoreText}>{score}%</Text>
                  </View>
                  <Ionicons name={selectedMatch?.id === user.id ? "chevron-up" : "chevron-down"} size={16} color={Colors.textMuted} />
                </View>
              </TouchableOpacity>

              {selectedMatch?.id === user.id && (
                <View style={styles.matchExpanded}>
                  <LandlordAlertCard landlord={user.landlord} />

                  <View style={styles.expandedDetails}>
                    <Text style={styles.expandedLabel}>Contact</Text>
                    <View style={styles.contactRow}>
                      <Ionicons name="mail-outline" size={14} color={Colors.skyBlueDark} />
                      <Text style={styles.contactEmail}>{user.email}</Text>
                    </View>
                    {user.bio ? (
                      <>
                        <Text style={styles.expandedLabel}>About</Text>
                        <Text style={styles.expandedBio}>{user.bio}</Text>
                      </>
                    ) : null}
                    <View style={styles.expandedStats}>
                      <View style={styles.expandedStat}>
                        <Ionicons name="sparkles-outline" size={14} color={Colors.grassGreenDark} />
                        <Text style={styles.expandedStatText}>Cleanliness: {user.cleanliness}/5</Text>
                      </View>
                      <View style={styles.expandedStat}>
                        <Ionicons name="volume-medium-outline" size={14} color={Colors.skyBlueDark} />
                        <Text style={styles.expandedStatText}>Noise: {user.noise}/5</Text>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity style={styles.agreementBtn}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setAgreementUser(user); }}>
                    <Ionicons name="document-text-outline" size={16} color={Colors.white} />
                    <Text style={styles.agreementBtnText}>Generate Roommate Agreement</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {agreementUser && (
        <AgreementModal
          user={agreementUser}
          score={currentUser ? computeScore(currentUser, agreementUser) : 0}
          onClose={() => setAgreementUser(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 28, color: Colors.charcoal },
  headerSub: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textMuted },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },
  emptyState: { alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 12 },
  emptyTitle: { fontFamily: "Nunito_700Bold", fontSize: 20, color: Colors.charcoal },
  emptySub: { fontFamily: "Nunito_400Regular", fontSize: 14, color: Colors.textMuted, textAlign: "center", paddingHorizontal: 20 },
  matchCard: {
    backgroundColor: Colors.cardBg, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.borderSoft,
    overflow: "hidden",
  },
  matchCardInner: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  matchAvatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  matchAvatarText: { fontFamily: "Nunito_800ExtraBold", fontSize: 18, color: Colors.white },
  matchInfo: { flex: 1 },
  matchName: { fontFamily: "Nunito_700Bold", fontSize: 16, color: Colors.charcoal },
  matchMajor: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted },
  matchDetail: { fontFamily: "Nunito_600SemiBold", fontSize: 12, color: Colors.skyBlueDark, marginTop: 2 },
  matchRight: { alignItems: "center", gap: 6 },
  matchScore: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  matchScoreText: { fontFamily: "Nunito_800ExtraBold", fontSize: 12, color: Colors.white },
  matchExpanded: {
    borderTopWidth: 1, borderTopColor: Colors.borderSoft, padding: 14, gap: 12,
    backgroundColor: Colors.parchment,
  },
  alertCard: {
    borderLeftWidth: 3, borderRadius: 10, padding: 12, gap: 6,
  },
  alertHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  alertTitle: { fontFamily: "Nunito_700Bold", fontSize: 13, flex: 1 },
  alertBody: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.charcoal, lineHeight: 18 },
  expandedDetails: { gap: 6 },
  expandedLabel: { fontFamily: "Nunito_700Bold", fontSize: 12, color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  contactEmail: { fontFamily: "Nunito_600SemiBold", fontSize: 13, color: Colors.skyBlueDark },
  expandedBio: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.charcoal, lineHeight: 19 },
  expandedStats: { flexDirection: "row", gap: 16 },
  expandedStat: { flexDirection: "row", alignItems: "center", gap: 5 },
  expandedStatText: { fontFamily: "Nunito_600SemiBold", fontSize: 12, color: Colors.charcoal },
  agreementBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.skyBlueDark, borderRadius: 12, paddingVertical: 12,
  },
  agreementBtnText: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.white },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContainer: { backgroundColor: Colors.parchment, borderTopLeftRadius: 20, borderTopRightRadius: 20, height: "90%" },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.borderSoft,
  },
  modalTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 18, color: Colors.charcoal },
  modalClose: { padding: 4 },
  modalScroll: { flex: 1 },
  agreementSection: { padding: 20, gap: 16 },
  agreementHeaderBlock: { alignItems: "center", gap: 4, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: Colors.borderSoft },
  agreementTitleLarge: { fontFamily: "Nunito_800ExtraBold", fontSize: 18, color: Colors.charcoal, textAlign: "center" },
  agreementDate: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted },
  agreementBlock: { gap: 6 },
  agreementSectionTitle: {
    fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.skyBlueDark,
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2,
  },
  agreementItem: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.charcoal, lineHeight: 20 },
  signatureBlock: { gap: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.borderSoft },
  signatureLine: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted },
});
