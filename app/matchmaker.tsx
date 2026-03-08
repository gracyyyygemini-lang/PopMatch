import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View, Text, StyleSheet, Animated, PanResponder, Dimensions,
  TouchableOpacity, ScrollView, Platform
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useApp, UserProfile, Zone } from "@/context/AppContext";
import ZonePicker from "@/components/ZonePicker";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width - 40;
const SWIPE_THRESHOLD = width * 0.28;

const ZONE_LABELS: Record<string, string> = {
  campustown: "Campustown",
  north: "North Campus",
  south: "South Campus",
  urbana: "Urbana",
  downtown: "Downtown",
};

const LEASE_LABELS: Record<string, string> = {
  full_year: "Full Year",
  fall_sublease: "Fall Sub",
  spring_sublease: "Spring Sub",
  summer_sublease: "Summer Sub",
};

function matchesGenderFilter(current: UserProfile, candidate: UserProfile): boolean {
  if (current.genderPref === "girls_only" && candidate.gender !== "female") return false;
  if (current.genderPref === "boys_only" && candidate.gender !== "male") return false;
  return true;
}

function ProfileCard({ user, score }: { user: UserProfile; score: number }) {
  const { startConversation, subleases } = useApp();
  const initials = user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  const userListing = subleases.find(s => s.userId === user.id);

  return (
    <ScrollView style={styles.cardScroll} showsVerticalScrollIndicator={false} bounces={false}>
      <View style={styles.cardContent}>
        <View style={styles.cardTopSection}>
          <View style={[styles.avatar, { backgroundColor: user.avatarColor }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.nameBlock}>
            <Text style={styles.cardName}>{user.name}</Text>
            <Text style={styles.cardMajor}>{user.major}</Text>
            <Text style={styles.cardEmail}>{user.email}</Text>
          </View>
          <View style={[styles.scorePill, {
            backgroundColor: score >= 80 ? Colors.grassGreen : score >= 60 ? Colors.ocean : Colors.textMuted
          }]}>
            <Text style={styles.scorePillText}>{score}%</Text>
          </View>
        </View>

        {user.bio ? (
          <Text style={styles.cardBio}>{user.bio}</Text>
        ) : null}

        <View style={styles.tagsRow}>
          <View style={[styles.tag, { backgroundColor: Colors.ocean + "18" }]}>
            <Ionicons name="location-outline" size={11} color={Colors.ocean} />
            <Text style={[styles.tagText, { color: Colors.ocean }]}>{ZONE_LABELS[user.zone]}</Text>
          </View>
          <View style={[styles.tag, { backgroundColor: Colors.gold + "35" }]}>
            <Ionicons name="cash-outline" size={11} color={Colors.charcoal} />
            <Text style={[styles.tagText, { color: Colors.charcoal }]}>${user.budget}/mo</Text>
          </View>
          <View style={[styles.tag, { backgroundColor: Colors.orange + "18" }]}>
            <Ionicons name="calendar-outline" size={11} color={Colors.orange} />
            <Text style={[styles.tagText, { color: Colors.orange }]}>{LEASE_LABELS[user.leaseType]}</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statItemLabel}>Cleanliness</Text>
            <View style={styles.dots}>
              {[1,2,3,4,5].map(n => (
                <View key={n} style={[styles.dot, { backgroundColor: n <= user.cleanliness ? Colors.grassGreen : Colors.borderSoft }]} />
              ))}
            </View>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statItemLabel}>Noise Level</Text>
            <View style={styles.dots}>
              {[1,2,3,4,5].map(n => (
                <View key={n} style={[styles.dot, { backgroundColor: n <= user.noise ? Colors.ocean : Colors.borderSoft }]} />
              ))}
            </View>
          </View>
        </View>

        <View style={styles.breakRow}>
          <View style={[styles.breakChip, { opacity: user.staysThanksgiving ? 1 : 0.4 }]}>
            <Ionicons name="home-outline" size={11} color={Colors.charcoal} />
            <Text style={styles.breakChipText}>Thanksgiving</Text>
          </View>
          <View style={[styles.breakChip, { opacity: user.staysSpringBreak ? 1 : 0.4 }]}>
            <Ionicons name="sunny-outline" size={11} color={Colors.charcoal} />
            <Text style={styles.breakChipText}>Spring Break</Text>
          </View>
          <View style={[styles.genderPrefChip]}>
            <Text style={styles.genderPrefText}>
              {user.genderPref === "girls_only" ? "Girls Only" : user.genderPref === "boys_only" ? "Boys Only" : "Open"}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.msgBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const listing = userListing;
            const convoId = startConversation(
              user.id, user.name, user.avatarColor, user.email,
              listing?.id || `roommate-${user.id}`,
              listing?.buildingName || "Roommate Match",
              listing?.pricePerMonth || user.budget
            );
            router.push(`/chat?conversationId=${convoId}`);
          }}
        >
          <Ionicons name="chatbubble-outline" size={14} color={Colors.ocean} />
          <Text style={styles.msgBtnText}>Message {user.name.split(" ")[0]}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function SwipeableCard({
  user, score, onLike, onPass, isTop
}: {
  user: UserProfile; score: number; onLike: () => void; onPass: () => void; isTop: boolean;
}) {
  const pan = useRef(new Animated.ValueXY()).current;
  const rotate = pan.x.interpolate({ inputRange: [-width / 2, 0, width / 2], outputRange: ["-10deg", "0deg", "10deg"] });
  const likeOpacity = pan.x.interpolate({ inputRange: [0, SWIPE_THRESHOLD], outputRange: [0, 1] });
  const passOpacity = pan.x.interpolate({ inputRange: [-SWIPE_THRESHOLD, 0], outputRange: [1, 0] });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isTop,
      onMoveShouldSetPanResponder: (_, g) => isTop && Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 5,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (_, gs) => {
        if (gs.dx > SWIPE_THRESHOLD) {
          Animated.spring(pan, { toValue: { x: width * 1.5, y: gs.dy }, useNativeDriver: false }).start(onLike);
        } else if (gs.dx < -SWIPE_THRESHOLD) {
          Animated.spring(pan, { toValue: { x: -width * 1.5, y: gs.dy }, useNativeDriver: false }).start(onPass);
        } else {
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
        }
      },
    })
  ).current;

  return (
    <Animated.View
      style={[styles.card, {
        transform: [{ translateX: pan.x }, { translateY: isTop ? pan.y : 0 }, { rotate: isTop ? rotate : "0deg" }],
        zIndex: isTop ? 10 : 5,
        opacity: isTop ? 1 : 0.9,
      }]}
      {...(isTop ? panResponder.panHandlers : {})}
    >
      {isTop && (
        <>
          <Animated.View style={[styles.swipeLabel, styles.swipeLike, { opacity: likeOpacity }]}>
            <Ionicons name="heart" size={22} color={Colors.grassGreen} />
            <Text style={[styles.swipeLabelText, { color: Colors.grassGreen }]}>CONNECT</Text>
          </Animated.View>
          <Animated.View style={[styles.swipeLabel, styles.swipePass, { opacity: passOpacity }]}>
            <Ionicons name="close" size={22} color={Colors.errorRed} />
            <Text style={[styles.swipeLabelText, { color: Colors.errorRed }]}>PASS</Text>
          </Animated.View>
        </>
      )}
      <ProfileCard user={user} score={score} />
    </Animated.View>
  );
}

export default function MatchmakerScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser, mockUsers, addMatch, addLiked, addPassed, likedUserIds, passedUserIds, computeScore, subleases } = useApp();
  const [zoneFilter, setZoneFilter] = useState<Zone | "all">("all");

  useEffect(() => {
    if (currentUser?.intent === "host" || currentUser?.intent === "sublessor") {
      const hasListing = subleases.some(s => s.userId === currentUser.id);
      if (!hasListing) {
        router.replace("/link-listing");
      }
    }
  }, [currentUser?.intent]);

  const filtered = mockUsers.filter(u => {
    if (!currentUser) return true;
    if (u.id === currentUser.id) return false;
    if (!matchesGenderFilter(currentUser, u)) return false;
    if (zoneFilter !== "all" && u.zone !== zoneFilter) return false;
    return true;
  });

  const remaining = filtered.filter(u => !likedUserIds.includes(u.id) && !passedUserIds.includes(u.id));
  const topCards = remaining.slice(0, 3);

  const handleLike = useCallback(async (user: UserProfile) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const score = currentUser ? computeScore(currentUser, user) : 75;
    await addLiked(user.id);
    await addMatch({ userId: user.id, score, liked: true, timestamp: Date.now() });
  }, [currentUser, computeScore]);

  const handlePass = useCallback(async (user: UserProfile) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await addPassed(user.id);
  }, []);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: Colors.sand }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)")}>
          <Ionicons name="arrow-back" size={20} color={Colors.ocean} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Year-Long Matchmaker</Text>
          <Text style={styles.headerSub}>{remaining.length} potential roommates</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.matchBadge, { backgroundColor: Colors.grassGreen + "20" }]}>
            <Text style={[styles.matchBadgeText, { color: Colors.grassGreen }]}>{likedUserIds.length}</Text>
          </View>
        </View>
      </View>

      <ZonePicker selected={zoneFilter} onSelect={setZoneFilter} />

      <View style={styles.deckArea}>
        {remaining.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-circle" size={52} color={Colors.grassGreen} />
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptySub}>Check your Inbox to connect with people you liked.</Text>
            <TouchableOpacity style={styles.goMatchesBtn} onPress={() => router.push("/(tabs)/inbox")}>
              <Text style={styles.goMatchesBtnText}>View Matches</Text>
            </TouchableOpacity>
          </View>
        ) : (
          topCards.map((user, i) => {
            const isTop = i === 0;
            const score = currentUser ? computeScore(currentUser, user) : 75;
            return (
              <SwipeableCard key={user.id} user={user} score={score} isTop={isTop}
                onLike={() => handleLike(user)} onPass={() => handlePass(user)} />
            );
          }).reverse()
        )}
      </View>

      {remaining.length > 0 && (
        <View style={[styles.actionRow, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 16 }]}>
          <TouchableOpacity style={[styles.actionBtn, styles.passBtn]}
            onPress={() => handlePass(remaining[0])}>
            <Ionicons name="close" size={28} color={Colors.errorRed} />
          </TouchableOpacity>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{remaining.length} left</Text>
          </View>
          <TouchableOpacity style={[styles.actionBtn, styles.likeBtn]}
            onPress={() => handleLike(remaining[0])}>
            <Ionicons name="heart" size={26} color={Colors.grassGreen} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.sand },
  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 8, gap: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.cardBg,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: Colors.borderSoft,
  },
  headerCenter: { flex: 1 },
  headerTitle: { fontFamily: "Nunito_700Bold", fontSize: 17, color: Colors.ocean },
  headerSub: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted },
  headerRight: {},
  matchBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  matchBadgeText: { fontFamily: "Nunito_800ExtraBold", fontSize: 14 },
  deckArea: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  card: {
    position: "absolute", width: CARD_WIDTH, maxHeight: 440,
    backgroundColor: Colors.cardBg, borderRadius: 22,
    borderWidth: 1.5, borderColor: Colors.borderSoft,
    shadowColor: Colors.charcoal, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 16, elevation: 5, overflow: "hidden",
  },
  cardScroll: { maxHeight: 440 },
  swipeLabel: {
    position: "absolute", top: 18, flexDirection: "row", alignItems: "center",
    gap: 5, zIndex: 20, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 10, borderWidth: 2,
  },
  swipeLike: { right: 18, borderColor: Colors.grassGreen, backgroundColor: Colors.grassGreen + "20" },
  swipePass: { left: 18, borderColor: Colors.errorRed, backgroundColor: Colors.errorRed + "20" },
  swipeLabelText: { fontFamily: "Nunito_800ExtraBold", fontSize: 14 },
  cardContent: { padding: 18, gap: 12 },
  cardTopSection: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  avatar: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: "Nunito_800ExtraBold", fontSize: 20, color: Colors.white },
  nameBlock: { flex: 1 },
  cardName: { fontFamily: "Nunito_800ExtraBold", fontSize: 19, color: Colors.charcoal },
  cardMajor: { fontFamily: "Nunito_600SemiBold", fontSize: 12, color: Colors.textMuted },
  cardEmail: { fontFamily: "Nunito_400Regular", fontSize: 11, color: Colors.textLight },
  scorePill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, alignSelf: "flex-start" },
  scorePillText: { fontFamily: "Nunito_800ExtraBold", fontSize: 12, color: Colors.white },
  cardBio: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.charcoal, lineHeight: 19 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  tagText: { fontFamily: "Nunito_600SemiBold", fontSize: 11 },
  statsGrid: { flexDirection: "row", gap: 20 },
  statItem: { flex: 1, gap: 5 },
  statItemLabel: { fontFamily: "Nunito_600SemiBold", fontSize: 11, color: Colors.textMuted },
  dots: { flexDirection: "row", gap: 5 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  breakRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  breakChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: Colors.sandDark },
  breakChipText: { fontFamily: "Nunito_600SemiBold", fontSize: 11, color: Colors.charcoal },
  genderPrefChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: Colors.ocean + "18" },
  genderPrefText: { fontFamily: "Nunito_600SemiBold", fontSize: 11, color: Colors.ocean },
  msgBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7,
    backgroundColor: Colors.ocean + "10", borderRadius: 10, paddingVertical: 10,
    borderWidth: 1.5, borderColor: Colors.ocean + "30", marginTop: 2,
  },
  msgBtnText: { fontFamily: "Nunito_700Bold", fontSize: 13, color: Colors.ocean },
  actionRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 24, paddingHorizontal: 40, paddingTop: 16,
  },
  actionBtn: {
    width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.cardBg, borderWidth: 2,
    shadowColor: Colors.charcoal, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  passBtn: { borderColor: Colors.errorRed + "60" },
  likeBtn: { borderColor: Colors.grassGreen + "60" },
  countBadge: { backgroundColor: Colors.sandDark, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 7 },
  countText: { fontFamily: "Nunito_600SemiBold", fontSize: 13, color: Colors.textMuted },
  emptyCard: {
    width: CARD_WIDTH, alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.cardBg, borderRadius: 22, borderWidth: 1.5,
    borderColor: Colors.borderSoft, padding: 40, gap: 12,
  },
  emptyTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 20, color: Colors.charcoal },
  emptySub: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textMuted, textAlign: "center" },
  goMatchesBtn: {
    backgroundColor: Colors.ocean, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, marginTop: 8,
  },
  goMatchesBtnText: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.white },
});
