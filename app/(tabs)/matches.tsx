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
    message: "JSM charges a $50 sublease fee. Your replacement tenant must provide proof of Renter's Insurance. Get JSM's written approval before making any handoff arrangements."
  },
  ugroup: {
    level: "warn",
    title: "UGroup — 72-Hour Report",
    message: "UGroup charges $125 transfer fee. A 72-hour Move-In Condition Report is mandatory — document ALL pre-existing damage with photos within 72 hours of move-in or you'll be charged on move-out."
  },
  bailey: {
    level: "warn",
    title: "Bailey — Walk In Together!",
    message: "IMPORTANT: Walk into the Bailey office TOGETHER with your replacement tenant. Never go separately. The landlord has been known to negotiate a new full lease directly with the sublessee, cutting out the original tenant."
  },
  american: {
    level: "danger",
    title: "American Campus — $600 RELET FEE",
    message: "FLASH ALERT: American Campus Communities (Latitude, 212, Tower) charges up to $600 in Relet fees. This is one of the highest in Champaign. Weigh all alternatives carefully and get every detail in writing."
  },
  smile: {
    level: "info",
    title: "Smile Properties",
    message: "Smile Properties: Always confirm sublease approval in writing before proceeding. Keep copies of all signed documents. Contact their office early in the semester."
  },
  other: {
    level: "info",
    title: "Private Landlord",
    message: "For private landlords: get a written sublease agreement signed by all parties. Document the security deposit transfer with a signed cash receipt. Meet in person and verify their identity."
  },
};

const LEASE_LABELS: Record<string, string> = {
  full_year: "Full Year",
  fall_sublease: "Fall Sublease",
  spring_sublease: "Spring Sublease",
  summer_sublease: "Summer Sublease",
};

function AgreementModal({ user, score, onClose }: { user: UserProfile; score: number; onClose: () => void }) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <Modal animationType="slide" transparent visible onRequestClose={onClose}>
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
                <Text style={styles.agreementTitle}>PopMatch Roommate Agreement</Text>
                <Text style={styles.agreementDate}>Generated: {dateStr}</Text>
                <View style={[styles.scorePill, {
                  backgroundColor: score >= 80 ? Colors.grassGreen : Colors.ocean
                }]}>
                  <Text style={styles.scorePillText}>{score}% compatibility</Text>
                </View>
              </View>

              {[
                {
                  title: "Parties",
                  items: [
                    `Resident A: ${user.name} (${user.email})`,
                    `Lease Type: ${LEASE_LABELS[user.leaseType]}`,
                  ]
                },
                {
                  title: "Utility Splits",
                  items: [
                    "Ameren Illinois (Electric/Gas): Split equally by occupancy days",
                    "Illinois American Water: Split equally per person",
                    "Internet (Xfinity/Volo): Rotate account holder annually",
                    "Break periods: Person staying pays full utilities that month",
                  ]
                },
                {
                  title: "Security Deposit",
                  items: [
                    "Original deposit transferred privately via cash or Venmo",
                    "Both parties sign a receipt confirming exact amount",
                    "Receipt is binding proof of transfer",
                  ]
                },
                {
                  title: "House Rules",
                  items: [
                    "Overnight guests: Max 3 consecutive nights without notice",
                    "Chores: Rotate weekly (kitchen, bathroom, common areas)",
                    "Thermostat: 68–72°F agreed range",
                    "Quiet hours: 10pm–8am weekdays",
                    "Dishes: Cleaned within 24 hours",
                  ]
                },
                {
                  title: "Break Arrangements",
                  items: [
                    `Thanksgiving: ${user.staysThanksgiving ? user.name + " staying" : user.name + " leaving"}`,
                    `Spring Break: ${user.staysSpringBreak ? user.name + " staying" : user.name + " leaving"}`,
                  ]
                },
              ].map(section => (
                <View key={section.title} style={styles.agreementBlock}>
                  <Text style={styles.agreementSectionTitle}>{section.title}</Text>
                  {section.items.map(item => (
                    <Text key={item} style={styles.agreementItem}>• {item}</Text>
                  ))}
                </View>
              ))}

              <View style={styles.signatureBlock}>
                <Text style={styles.signatureLine}>Resident A: _______________________  Date: _________</Text>
                <Text style={styles.signatureLine}>Resident B: _______________________  Date: _________</Text>
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
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
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
    <View style={[styles.container, { backgroundColor: Colors.sand }]}>
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
            <Text style={styles.emptySub}>Open the Year-Long Matchmaker and start swiping!</Text>
          </View>
        ) : (
          matchedUsers.map(({ user, score }) => {
            const initials = user.name.split(" ").map(n => n[0]).join("").slice(0, 2);
            const isOpen = selectedMatch === user.id;
            const alert = LANDLORD_ALERTS[user.landlord];
            const alertBg = alert.level === "danger" ? "#FFF0F0" : alert.level === "warn" ? "#FFF4E6" : "#EEF6FF";
            const alertBorder = alert.level === "danger" ? Colors.alertRed : alert.level === "warn" ? Colors.alertOrange : Colors.ocean;

            return (
              <View key={user.id} style={styles.matchCard}>
                <TouchableOpacity style={styles.matchCardTop}
                  onPress={() => { Haptics.selectionAsync(); setSelectedMatch(isOpen ? null : user.id); }}>
                  <View style={[styles.matchAvatar, { backgroundColor: user.avatarColor }]}>
                    <Text style={styles.matchAvatarText}>{initials}</Text>
                  </View>
                  <View style={styles.matchInfo}>
                    <Text style={styles.matchName}>{user.name}</Text>
                    <Text style={styles.matchMajor}>{user.major}</Text>
                    <Text style={styles.matchDetail}>${user.budget}/mo · {LEASE_LABELS[user.leaseType]}</Text>
                  </View>
                  <View style={styles.matchRight}>
                    <View style={[styles.matchScore, {
                      backgroundColor: score >= 80 ? Colors.grassGreen : score >= 60 ? Colors.ocean : Colors.textMuted
                    }]}>
                      <Text style={styles.matchScoreText}>{score}%</Text>
                    </View>
                    <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={14} color={Colors.textMuted} />
                  </View>
                </TouchableOpacity>

                {isOpen && (
                  <View style={styles.matchExpanded}>
                    <View style={[styles.alertCard, { backgroundColor: alertBg, borderLeftColor: alertBorder }]}>
                      <View style={styles.alertHeader}>
                        <Ionicons
                          name={alert.level === "danger" ? "alert-circle" : alert.level === "warn" ? "warning-outline" : "information-circle-outline"}
                          size={16} color={alertBorder} />
                        <Text style={[styles.alertTitle, { color: alertBorder }]}>{alert.title}</Text>
                      </View>
                      <Text style={styles.alertBody}>{alert.message}</Text>
                    </View>

                    <View style={styles.contactBlock}>
                      <Ionicons name="mail-outline" size={14} color={Colors.ocean} />
                      <Text style={styles.contactEmail}>{user.email}</Text>
                    </View>

                    {user.bio ? <Text style={styles.expandedBio}>{user.bio}</Text> : null}

                    <View style={styles.expandedStats}>
                      <View style={styles.expandedStat}>
                        <Ionicons name="sparkles-outline" size={13} color={Colors.grassGreen} />
                        <Text style={styles.expandedStatText}>Clean: {user.cleanliness}/5</Text>
                      </View>
                      <View style={styles.expandedStat}>
                        <Ionicons name="volume-medium-outline" size={13} color={Colors.ocean} />
                        <Text style={styles.expandedStatText}>Noise: {user.noise}/5</Text>
                      </View>
                    </View>

                    <TouchableOpacity style={styles.agreementBtn}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setAgreementUser(user); }}>
                      <Ionicons name="document-text-outline" size={15} color={Colors.white} />
                      <Text style={styles.agreementBtnText}>Generate Roommate Agreement</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
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
  headerTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 28, color: Colors.ocean },
  headerSub: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textMuted },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyTitle: { fontFamily: "Nunito_700Bold", fontSize: 20, color: Colors.charcoal },
  emptySub: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textMuted, textAlign: "center", paddingHorizontal: 20 },
  matchCard: {
    backgroundColor: Colors.cardBg, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.borderSoft, overflow: "hidden",
  },
  matchCardTop: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  matchAvatar: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  matchAvatarText: { fontFamily: "Nunito_800ExtraBold", fontSize: 17, color: Colors.white },
  matchInfo: { flex: 1 },
  matchName: { fontFamily: "Nunito_700Bold", fontSize: 16, color: Colors.charcoal },
  matchMajor: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted },
  matchDetail: { fontFamily: "Nunito_600SemiBold", fontSize: 12, color: Colors.ocean, marginTop: 2 },
  matchRight: { alignItems: "center", gap: 5 },
  matchScore: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  matchScoreText: { fontFamily: "Nunito_800ExtraBold", fontSize: 12, color: Colors.white },
  matchExpanded: {
    borderTopWidth: 1, borderTopColor: Colors.borderSoft, padding: 14, gap: 10, backgroundColor: Colors.sand,
  },
  alertCard: { borderLeftWidth: 3, borderRadius: 10, padding: 12, gap: 6 },
  alertHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  alertTitle: { fontFamily: "Nunito_700Bold", fontSize: 13, flex: 1 },
  alertBody: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.charcoal, lineHeight: 18 },
  contactBlock: { flexDirection: "row", alignItems: "center", gap: 7 },
  contactEmail: { fontFamily: "Nunito_600SemiBold", fontSize: 13, color: Colors.ocean },
  expandedBio: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.charcoal, lineHeight: 19 },
  expandedStats: { flexDirection: "row", gap: 16 },
  expandedStat: { flexDirection: "row", alignItems: "center", gap: 5 },
  expandedStatText: { fontFamily: "Nunito_600SemiBold", fontSize: 12, color: Colors.charcoal },
  agreementBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.ocean, borderRadius: 12, paddingVertical: 11,
  },
  agreementBtnText: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.white },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContainer: { backgroundColor: Colors.sand, borderTopLeftRadius: 22, borderTopRightRadius: 22, height: "90%" },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.borderSoft,
  },
  modalTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 18, color: Colors.charcoal },
  modalClose: { padding: 4 },
  modalScroll: { flex: 1 },
  agreementSection: { padding: 20, gap: 16 },
  agreementHeaderBlock: { alignItems: "center", gap: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderSoft },
  agreementTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 18, color: Colors.charcoal, textAlign: "center" },
  agreementDate: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted },
  scorePill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  scorePillText: { fontFamily: "Nunito_700Bold", fontSize: 12, color: Colors.white },
  agreementBlock: { gap: 6 },
  agreementSectionTitle: {
    fontFamily: "Nunito_700Bold", fontSize: 13, color: Colors.ocean,
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2,
  },
  agreementItem: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.charcoal, lineHeight: 20 },
  signatureBlock: { gap: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.borderSoft },
  signatureLine: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted },
});
