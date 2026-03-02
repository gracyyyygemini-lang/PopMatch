import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
  Modal, TextInput, Alert
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useApp, UserProfile, Landlord, FriendRecord, MOCK_USERS } from "@/context/AppContext";

const LANDLORD_ALERTS: Record<Landlord, { level: "info" | "warn" | "danger"; title: string; message: string }> = {
  jsm: {
    level: "info", title: "JSM Sublease Warning",
    message: "JSM charges a $50 sublease fee. Your replacement tenant must provide proof of Renter's Insurance. Get JSM's written approval before making any handoff arrangements."
  },
  ugroup: {
    level: "warn", title: "UGroup — 72-Hour Report",
    message: "UGroup charges $125 transfer fee. A 72-hour Move-In Condition Report is mandatory — document ALL pre-existing damage with photos within 72 hours of move-in or you'll be charged on move-out."
  },
  bailey: {
    level: "warn", title: "Bailey — Walk In Together!",
    message: "IMPORTANT: Walk into the Bailey office TOGETHER with your replacement tenant. Never go separately. The landlord has been known to negotiate a new full lease directly with the sublessee, cutting out the original tenant."
  },
  american: {
    level: "danger", title: "American Campus — $600 RELET FEE",
    message: "FLASH ALERT: American Campus Communities (Latitude, 212, Tower) charges up to $600 in Relet fees. This is one of the highest in Champaign. Weigh all alternatives carefully and get every detail in writing."
  },
  smile: {
    level: "info", title: "Smile Properties",
    message: "Smile Properties: Always confirm sublease approval in writing before proceeding. Keep copies of all signed documents. Contact their office early in the semester."
  },
  other: {
    level: "info", title: "Private Landlord",
    message: "For private landlords: get a written sublease agreement signed by all parties. Document the security deposit transfer with a signed cash receipt. Meet in person and verify their identity."
  },
};

const LEASE_LABELS: Record<string, string> = {
  full_year: "Full Year",
  fall_sublease: "Fall Sublease",
  spring_sublease: "Spring Sublease",
  summer_sublease: "Summer Sublease",
};

const COLLEGE_COLORS: Record<string, string> = {
  Grainger: Colors.ocean,
  Gies: Colors.orange,
  LAS: Colors.grassGreen,
  FAA: "#9B59B6",
  Media: "#CC5500",
  iSchool: Colors.goldDark,
  ACES: "#5A8A5A",
};

function TrustBadge({ label, type }: { label: string; type: "friend" | "mutual" | "vouched" | "org" }) {
  const bg =
    type === "friend" ? Colors.grassGreen + "20" :
    type === "vouched" ? Colors.orange + "20" :
    type === "mutual" ? Colors.ocean + "18" :
    Colors.goldDark + "18";
  const color =
    type === "friend" ? Colors.grassGreen :
    type === "vouched" ? Colors.orange :
    type === "mutual" ? Colors.ocean :
    Colors.goldDark;
  const icon: keyof typeof Ionicons.glyphMap =
    type === "friend" ? "people" :
    type === "vouched" ? "star" :
    type === "mutual" ? "link" :
    "school-outline";

  return (
    <View style={[badge.wrap, { backgroundColor: bg, borderColor: color + "40" }]}>
      <Ionicons name={icon} size={11} color={color} />
      <Text style={[badge.text, { color }]}>{label}</Text>
    </View>
  );
}

const badge = StyleSheet.create({
  wrap: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1,
  },
  text: { fontFamily: "Nunito_700Bold", fontSize: 10 },
});

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
                <View style={[styles.scorePill, { backgroundColor: score >= 80 ? Colors.grassGreen : Colors.ocean }]}>
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

function AddFriendModal({ onClose, onAdd }: { onClose: () => void; onAdd: (email: string) => void }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  const handleAdd = () => {
    const trimmed = input.trim().toLowerCase();
    if (!trimmed.endsWith("@illinois.edu")) {
      setError("Must be an @illinois.edu address");
      return;
    }
    onAdd(trimmed);
    onClose();
  };

  return (
    <Modal animationType="fade" transparent visible onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          style={[styles.modalContainer, { height: "auto", padding: 24, borderRadius: 22 }]}
          activeOpacity={1}
        >
          <Text style={styles.modalTitle}>Add to My Circle</Text>
          <Text style={[styles.agreementDate, { marginBottom: 16 }]}>
            Enter their @illinois.edu email to connect
          </Text>
          <TextInput
            style={styles.addInput}
            placeholder="netid@illinois.edu"
            placeholderTextColor={Colors.textLight}
            value={input}
            onChangeText={t => { setInput(t); setError(""); }}
            autoCapitalize="none"
            keyboardType="email-address"
            autoFocus
          />
          {!!error && <Text style={styles.errorText}>{error}</Text>}
          <View style={styles.addBtnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

export default function MyCircleScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser, mockUsers, matches, computeScore, friends, addFriend, removeFriend, toggleVouch, getTrustInfo } = useApp();
  const [activeTab, setActiveTab] = useState<"circle" | "matches">("circle");
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [agreementUser, setAgreementUser] = useState<UserProfile | null>(null);
  const [showAddFriend, setShowAddFriend] = useState(false);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const likedMatches = matches
    .filter(m => m.liked)
    .map(m => {
      const user = mockUsers.find(u => u.id === m.userId);
      if (!user) return null;
      return { user, score: m.score };
    })
    .filter((m): m is { user: UserProfile; score: number } => m !== null)
    .sort((a, b) => b.score - a.score);

  const handleAddFriend = (email: string) => {
    const mockUser = MOCK_USERS.find(u => u.email === email);
    if (email === currentUser?.email) {
      Alert.alert("That's you!", "You cannot add yourself to your circle.");
      return;
    }
    if (friends.some(f => f.email === email)) {
      Alert.alert("Already connected", "This person is already in your circle.");
      return;
    }
    if (mockUser) {
      addFriend({
        email: mockUser.email,
        name: mockUser.name,
        avatarColor: mockUser.avatarColor,
        major: mockUser.major,
        college: mockUser.college,
        organizations: mockUser.organizations,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Alert.alert(
        "Not found yet",
        "That student hasn't joined PopMatch yet, but we'll notify you when they do.",
        [{ text: "OK" }]
      );
    }
  };

  const handleRemoveFriend = (friend: FriendRecord) => {
    Alert.alert(
      "Remove from Circle",
      `Remove ${friend.name} from your circle?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            removeFriend(friend.email);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors.sand }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <View>
          <Text style={styles.headerTitle}>My Circle</Text>
          <Text style={styles.headerSub}>{friends.length} connection{friends.length !== 1 ? "s" : ""} · {likedMatches.length} match{likedMatches.length !== 1 ? "es" : ""}</Text>
        </View>
        <TouchableOpacity
          style={styles.addCircleBtn}
          onPress={() => setShowAddFriend(true)}
        >
          <Ionicons name="person-add-outline" size={18} color={Colors.ocean} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "circle" && styles.tabActive]}
          onPress={() => { setActiveTab("circle"); Haptics.selectionAsync(); }}
        >
          <Ionicons name="people-outline" size={15} color={activeTab === "circle" ? Colors.ocean : Colors.textMuted} />
          <Text style={[styles.tabText, activeTab === "circle" && styles.tabTextActive]}>My Circle</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "matches" && styles.tabActive]}
          onPress={() => { setActiveTab("matches"); Haptics.selectionAsync(); }}
        >
          <Ionicons name="heart-outline" size={15} color={activeTab === "matches" ? Colors.ocean : Colors.textMuted} />
          <Text style={[styles.tabText, activeTab === "matches" && styles.tabTextActive]}>Matches</Text>
          {likedMatches.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{likedMatches.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, {
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 90
        }]}
        showsVerticalScrollIndicator={false}
      >

        {activeTab === "circle" && (
          <>
            {friends.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={52} color={Colors.textLight} />
                <Text style={styles.emptyTitle}>Your circle is empty</Text>
                <Text style={styles.emptySub}>Add fellow Illini to build trust and see connection badges on listings.</Text>
                <TouchableOpacity style={styles.emptyAddBtn} onPress={() => setShowAddFriend(true)}>
                  <Ionicons name="person-add-outline" size={15} color={Colors.white} />
                  <Text style={styles.emptyAddBtnText}>Add your first connection</Text>
                </TouchableOpacity>
              </View>
            ) : (
              friends.map((friend) => {
                const initials = friend.name.split(" ").map(n => n[0]).join("").slice(0, 2);
                const collegeColor = friend.college ? COLLEGE_COLORS[friend.college] || Colors.textMuted : Colors.textMuted;

                return (
                  <View key={friend.email} style={styles.friendCard}>
                    <View style={[styles.friendAvatar, { backgroundColor: friend.avatarColor }]}>
                      <Text style={styles.friendAvatarText}>{initials}</Text>
                    </View>
                    <View style={styles.friendInfo}>
                      <Text style={styles.friendName}>{friend.name}</Text>
                      <Text style={styles.friendEmail}>{friend.email}</Text>
                      <View style={styles.friendTagRow}>
                        {friend.major ? (
                          <View style={styles.friendTag}>
                            <Text style={styles.friendTagText}>{friend.major}</Text>
                          </View>
                        ) : null}
                        {friend.college ? (
                          <View style={[styles.friendTag, { backgroundColor: collegeColor + "18", borderColor: collegeColor + "30" }]}>
                            <Text style={[styles.friendTagText, { color: collegeColor }]}>{friend.college}</Text>
                          </View>
                        ) : null}
                      </View>
                      <View style={styles.friendBadgeRow}>
                        <TrustBadge label="1st Degree" type="friend" />
                        {friend.vouchedByMe && <TrustBadge label="You vouched" type="vouched" />}
                      </View>
                    </View>
                    <View style={styles.friendActions}>
                      <TouchableOpacity
                        style={[
                          styles.vouchBtn,
                          friend.vouchedByMe && styles.vouchBtnActive
                        ]}
                        onPress={() => {
                          Haptics.selectionAsync();
                          toggleVouch(friend.email);
                        }}
                      >
                        <Ionicons
                          name={friend.vouchedByMe ? "star" : "star-outline"}
                          size={15}
                          color={friend.vouchedByMe ? Colors.orange : Colors.textMuted}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => handleRemoveFriend(friend)}
                      >
                        <Ionicons name="person-remove-outline" size={15} color={Colors.textLight} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}

            <View style={styles.suggestSection}>
              <Text style={styles.suggestTitle}>Suggested connections</Text>
              <Text style={styles.suggestSub}>Fellow Illini on PopMatch</Text>
              {MOCK_USERS.filter(u =>
                u.email !== currentUser?.email &&
                !friends.some(f => f.email === u.email)
              ).slice(0, 4).map(u => {
                const initials = u.name.split(" ").map(n => n[0]).join("").slice(0, 2);
                const sharedCollege = u.college === (currentUser?.college || "");
                const sharedOrgs = (u.organizations || []).some(
                  org => (currentUser?.organizations || []).includes(org)
                );

                return (
                  <View key={u.email} style={styles.suggestCard}>
                    <View style={[styles.suggestAvatar, { backgroundColor: u.avatarColor }]}>
                      <Text style={styles.suggestAvatarText}>{initials}</Text>
                    </View>
                    <View style={styles.suggestInfo}>
                      <Text style={styles.suggestName}>{u.name}</Text>
                      <Text style={styles.suggestMajor}>{u.major}{u.college ? ` · ${u.college}` : ""}</Text>
                      {(sharedCollege || sharedOrgs) && (
                        <View style={styles.suggestBadgeRow}>
                          {sharedCollege && <TrustBadge label={`Both in ${u.college}`} type="org" />}
                          {sharedOrgs && !sharedCollege && <TrustBadge label="Shared RSO" type="org" />}
                        </View>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.connectBtn}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        addFriend({
                          email: u.email,
                          name: u.name,
                          avatarColor: u.avatarColor,
                          major: u.major,
                          college: u.college,
                          organizations: u.organizations,
                        });
                      }}
                    >
                      <Ionicons name="add" size={16} color={Colors.white} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {activeTab === "matches" && (
          <>
            {likedMatches.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="heart-outline" size={52} color={Colors.textLight} />
                <Text style={styles.emptyTitle}>No matches yet</Text>
                <Text style={styles.emptySub}>Open the Year-Long Matchmaker and start swiping!</Text>
              </View>
            ) : (
              likedMatches.map(({ user, score }) => {
                const initials = user.name.split(" ").map(n => n[0]).join("").slice(0, 2);
                const isOpen = selectedMatch === user.id;
                const alert = LANDLORD_ALERTS[user.landlord];
                const alertBg = alert.level === "danger" ? "#FFF0F0" : alert.level === "warn" ? "#FFF4E6" : "#EEF6FF";
                const alertBorder = alert.level === "danger" ? Colors.alertRed : alert.level === "warn" ? Colors.alertOrange : Colors.ocean;
                const trust = getTrustInfo(user.email);

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
                        {trust.degree !== null && (
                          <View style={styles.trustRow}>
                            {trust.degree === 1 && <TrustBadge label="1st Degree" type="friend" />}
                            {trust.degree === 2 && <TrustBadge label="2nd Degree" type="mutual" />}
                            {trust.vouchedByFriend && <TrustBadge label={`Vouched by ${trust.vouchedByFriend}`} type="vouched" />}
                          </View>
                        )}
                        {trust.sharedOrg && (
                          <View style={styles.trustRow}>
                            <TrustBadge label={`Both in ${trust.sharedOrg}`} type="org" />
                          </View>
                        )}
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
          </>
        )}
      </ScrollView>

      {agreementUser && (
        <AgreementModal
          user={agreementUser}
          score={currentUser ? computeScore(currentUser, agreementUser) : 0}
          onClose={() => setAgreementUser(null)}
        />
      )}

      {showAddFriend && (
        <AddFriendModal
          onClose={() => setShowAddFriend(false)}
          onAdd={handleAddFriend}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingHorizontal: 20, paddingBottom: 12,
  },
  headerTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 28, color: Colors.ocean },
  headerSub: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textMuted },
  addCircleBtn: {
    width: 40, height: 40, borderRadius: 13, backgroundColor: Colors.ocean + "15",
    borderWidth: 1.5, borderColor: Colors.ocean + "30",
    alignItems: "center", justifyContent: "center",
  },
  tabRow: {
    flexDirection: "row", marginHorizontal: 16, marginBottom: 4,
    backgroundColor: Colors.sandDark, borderRadius: 14, padding: 4, gap: 4,
  },
  tab: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 9, borderRadius: 11,
  },
  tabActive: { backgroundColor: Colors.cardBg, shadowColor: Colors.charcoal, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  tabText: { fontFamily: "Nunito_600SemiBold", fontSize: 13, color: Colors.textMuted },
  tabTextActive: { color: Colors.ocean },
  tabBadge: {
    backgroundColor: Colors.ocean, borderRadius: 8, minWidth: 16,
    paddingHorizontal: 4, paddingVertical: 1, alignItems: "center",
  },
  tabBadgeText: { fontFamily: "Nunito_700Bold", fontSize: 10, color: Colors.white },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 10 },
  emptyState: { alignItems: "center", paddingTop: 40, gap: 12 },
  emptyTitle: { fontFamily: "Nunito_700Bold", fontSize: 20, color: Colors.charcoal },
  emptySub: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textMuted, textAlign: "center", paddingHorizontal: 24 },
  emptyAddBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.ocean, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12, marginTop: 4,
  },
  emptyAddBtnText: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.white },
  friendCard: {
    flexDirection: "row", alignItems: "flex-start",
    backgroundColor: Colors.cardBg, borderRadius: 16, borderWidth: 1.5,
    borderColor: Colors.borderSoft, padding: 14, gap: 12,
  },
  friendAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  friendAvatarText: { fontFamily: "Nunito_800ExtraBold", fontSize: 16, color: Colors.white },
  friendInfo: { flex: 1, gap: 4 },
  friendName: { fontFamily: "Nunito_700Bold", fontSize: 15, color: Colors.charcoal },
  friendEmail: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted },
  friendTagRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 2 },
  friendTag: {
    backgroundColor: Colors.ocean + "14", borderRadius: 8, borderWidth: 1,
    borderColor: Colors.ocean + "25", paddingHorizontal: 7, paddingVertical: 2,
  },
  friendTagText: { fontFamily: "Nunito_600SemiBold", fontSize: 10, color: Colors.ocean },
  friendBadgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 2 },
  friendActions: { gap: 8, alignItems: "center" },
  vouchBtn: {
    width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.sandDark, borderWidth: 1.5, borderColor: Colors.borderSoft,
  },
  vouchBtnActive: { backgroundColor: Colors.orange + "20", borderColor: Colors.orange + "40" },
  removeBtn: {
    width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.sandDark, borderWidth: 1.5, borderColor: Colors.borderSoft,
  },
  suggestSection: { gap: 10, marginTop: 8 },
  suggestTitle: { fontFamily: "Nunito_700Bold", fontSize: 15, color: Colors.charcoal },
  suggestSub: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted, marginTop: -6 },
  suggestCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.cardBg, borderRadius: 14, borderWidth: 1.5,
    borderColor: Colors.borderSoft, padding: 12, gap: 10,
  },
  suggestAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  suggestAvatarText: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.white },
  suggestInfo: { flex: 1, gap: 3 },
  suggestName: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.charcoal },
  suggestMajor: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted },
  suggestBadgeRow: { flexDirection: "row", gap: 5, marginTop: 2 },
  connectBtn: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.ocean,
    alignItems: "center", justifyContent: "center",
  },
  trustRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 3 },
  matchCard: { backgroundColor: Colors.cardBg, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.borderSoft, overflow: "hidden" },
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
  matchExpanded: { borderTopWidth: 1, borderTopColor: Colors.borderSoft, padding: 14, gap: 10, backgroundColor: Colors.sand },
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
  agreementSectionTitle: { fontFamily: "Nunito_700Bold", fontSize: 13, color: Colors.ocean, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  agreementItem: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.charcoal, lineHeight: 20 },
  signatureBlock: { gap: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.borderSoft },
  signatureLine: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted },
  addInput: {
    backgroundColor: Colors.cardBg, borderRadius: 14, borderWidth: 1.5,
    borderColor: Colors.borderSoft, paddingHorizontal: 16, paddingVertical: 12,
    fontFamily: "Nunito_400Regular", fontSize: 15, color: Colors.charcoal,
    marginBottom: 8,
  },
  errorText: { fontFamily: "Nunito_600SemiBold", fontSize: 12, color: Colors.alertRed, marginBottom: 8 },
  addBtnRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 12,
    backgroundColor: Colors.sandDark, borderWidth: 1.5, borderColor: Colors.borderSoft,
  },
  cancelBtnText: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.textMuted },
  addBtn: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 12, backgroundColor: Colors.ocean },
  addBtnText: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.white },
});
