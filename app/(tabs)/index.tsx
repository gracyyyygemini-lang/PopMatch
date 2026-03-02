import React, { useState, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, Animated, PanResponder, Dimensions,
  TouchableOpacity, ScrollView, Platform
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useApp, UserProfile, MOCK_USERS } from "@/context/AppContext";
import { ScamBanner } from "@/components/ScamBanner";

const { width, height } = Dimensions.get("window");
const CARD_WIDTH = width - 40;
const SWIPE_THRESHOLD = width * 0.3;

const LEASE_LABELS: Record<string, string> = {
  full_year: "Full Year",
  fall_sublease: "Fall Sublease",
  spring_sublease: "Spring Sublease",
};

const ZONE_LABELS: Record<string, string> = {
  campustown: "Campustown",
  north: "North Campus",
  south: "South Campus",
  urbana: "Urbana",
  downtown: "Downtown",
};

function matchesGenderFilter(current: UserProfile, candidate: UserProfile): boolean {
  if (current.genderPref === "girls_only" && candidate.gender !== "female") return false;
  if (current.genderPref === "boys_only" && candidate.gender !== "male") return false;
  return true;
}

function ProfileCard({ user, score }: { user: UserProfile; score: number }) {
  const initials = user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <View style={styles.cardContent}>
      <View style={[styles.avatar, { backgroundColor: user.avatarColor }]}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.nameRow}>
          <Text style={styles.cardName}>{user.name}</Text>
          <View style={[styles.scoreBadge, {
            backgroundColor: score >= 80 ? Colors.grassGreenDark : score >= 60 ? Colors.skyBlueDark : Colors.textMuted
          }]}>
            <Text style={styles.scoreText}>{score}% match</Text>
          </View>
        </View>
        <Text style={styles.cardMajor}>{user.major} · {user.email.split("@")[0]}</Text>
        {user.bio ? <Text style={styles.cardBio} numberOfLines={3}>{user.bio}</Text> : null}
        <View style={styles.tagsRow}>
          <View style={[styles.tag, { backgroundColor: Colors.skyBlue + "40" }]}>
            <Ionicons name="location-outline" size={12} color={Colors.skyBlueDark} />
            <Text style={[styles.tagText, { color: Colors.skyBlueDark }]}>{ZONE_LABELS[user.zone]}</Text>
          </View>
          <View style={[styles.tag, { backgroundColor: Colors.sunflower + "40" }]}>
            <Ionicons name="cash-outline" size={12} color={Colors.warmBrown} />
            <Text style={[styles.tagText, { color: Colors.warmBrown }]}>${user.budget}/mo</Text>
          </View>
          <View style={[styles.tag, { backgroundColor: Colors.grassGreen + "40" }]}>
            <Ionicons name="calendar-outline" size={12} color={Colors.grassGreenDark} />
            <Text style={[styles.tagText, { color: Colors.grassGreenDark }]}>{LEASE_LABELS[user.leaseType]}</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Cleanliness</Text>
            <View style={styles.dots}>
              {[1,2,3,4,5].map(n => (
                <View key={n} style={[styles.dot, { backgroundColor: n <= user.cleanliness ? Colors.grassGreenDark : Colors.borderSoft }]} />
              ))}
            </View>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Noise</Text>
            <View style={styles.dots}>
              {[1,2,3,4,5].map(n => (
                <View key={n} style={[styles.dot, { backgroundColor: n <= user.noise ? Colors.skyBlueDark : Colors.borderSoft }]} />
              ))}
            </View>
          </View>
        </View>
        <View style={styles.breakRow}>
          <View style={[styles.breakTag, { opacity: user.staysThanksgiving ? 1 : 0.4 }]}>
            <Ionicons name="home-outline" size={11} color={Colors.charcoal} />
            <Text style={styles.breakText}>Thanksgiving</Text>
          </View>
          <View style={[styles.breakTag, { opacity: user.staysSpringBreak ? 1 : 0.4 }]}>
            <Ionicons name="home-outline" size={11} color={Colors.charcoal} />
            <Text style={styles.breakText}>Spring Break</Text>
          </View>
        </View>
      </View>
    </View>
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
      onMoveShouldSetPanResponder: () => isTop,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD) {
          Animated.spring(pan, { toValue: { x: width * 1.5, y: gestureState.dy }, useNativeDriver: false }).start(onLike);
        } else if (gestureState.dx < -SWIPE_THRESHOLD) {
          Animated.spring(pan, { toValue: { x: -width * 1.5, y: gestureState.dy }, useNativeDriver: false }).start(onPass);
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
      }]}
      {...(isTop ? panResponder.panHandlers : {})}
    >
      {isTop && (
        <>
          <Animated.View style={[styles.swipeLabel, styles.swipeLike, { opacity: likeOpacity }]}>
            <Ionicons name="heart" size={28} color={Colors.grassGreenDark} />
            <Text style={[styles.swipeLabelText, { color: Colors.grassGreenDark }]}>LIKE</Text>
          </Animated.View>
          <Animated.View style={[styles.swipeLabel, styles.swipePass, { opacity: passOpacity }]}>
            <Ionicons name="close" size={28} color={Colors.errorRed} />
            <Text style={[styles.swipeLabelText, { color: Colors.errorRed }]}>PASS</Text>
          </Animated.View>
        </>
      )}
      <ProfileCard user={user} score={score} />
    </Animated.View>
  );
}

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser, mockUsers, addMatch, addLiked, addPassed, likedUserIds, passedUserIds, computeScore } = useApp();
  const [cardIndex, setCardIndex] = useState(0);

  const filtered = mockUsers.filter(u => {
    if (!currentUser) return true;
    if (u.id === currentUser.id) return false;
    if (!matchesGenderFilter(currentUser, u)) return false;
    return true;
  });

  const remaining = filtered.filter(u => !likedUserIds.includes(u.id) && !passedUserIds.includes(u.id));

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

  const topCards = remaining.slice(0, 3);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: Colors.parchment }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <View>
          <Text style={styles.headerTitle}>Discover</Text>
          <Text style={styles.headerSub}>Find your perfect Illini roommate</Text>
        </View>
        <View style={styles.headerIcon}>
          <Text style={styles.headerEmoji}>🏫</Text>
        </View>
      </View>

      <ScamBanner />

      <View style={styles.deckArea}>
        {remaining.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-circle-outline" size={52} color={Colors.grassGreenDark} />
            <Text style={styles.emptyTitle}>You've seen everyone!</Text>
            <Text style={styles.emptySub}>Check your matches or update your preferences.</Text>
          </View>
        ) : (
          topCards.map((user, i) => {
            const isTop = i === 0;
            const score = currentUser ? computeScore(currentUser, user) : 75;
            return (
              <SwipeableCard
                key={user.id}
                user={user}
                score={score}
                isTop={isTop}
                onLike={() => handleLike(user)}
                onPass={() => handlePass(user)}
              />
            );
          }).reverse()
        )}
      </View>

      {remaining.length > 0 && (
        <View style={[styles.actionRow, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 80 }]}>
          <TouchableOpacity style={[styles.actionBtn, styles.passBtn]}
            onPress={() => handlePass(remaining[0])}>
            <Ionicons name="close" size={28} color={Colors.errorRed} />
          </TouchableOpacity>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{remaining.length} left</Text>
          </View>
          <TouchableOpacity style={[styles.actionBtn, styles.likeBtn]}
            onPress={() => handleLike(remaining[0])}>
            <Ionicons name="heart" size={28} color={Colors.grassGreenDark} />
          </TouchableOpacity>
        </View>
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
  headerTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 28, color: Colors.charcoal },
  headerSub: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textMuted },
  headerIcon: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerEmoji: { fontSize: 28 },
  deckArea: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 20,
  },
  card: {
    position: "absolute",
    width: CARD_WIDTH,
    backgroundColor: Colors.cardBg,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: Colors.borderSoft,
    shadowColor: Colors.charcoal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    overflow: "hidden",
  },
  swipeLabel: {
    position: "absolute", top: 20, flexDirection: "row", alignItems: "center",
    gap: 6, zIndex: 20, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 10, borderWidth: 2,
  },
  swipeLike: { right: 20, borderColor: Colors.grassGreenDark, backgroundColor: Colors.grassGreen + "20" },
  swipePass: { left: 20, borderColor: Colors.errorRed, backgroundColor: Colors.errorRed + "20" },
  swipeLabelText: { fontFamily: "Nunito_800ExtraBold", fontSize: 16 },
  cardContent: { padding: 20, gap: 14 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: "center", justifyContent: "center", alignSelf: "center",
  },
  avatarText: { fontFamily: "Nunito_800ExtraBold", fontSize: 26, color: Colors.white },
  cardBody: { gap: 10 },
  nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardName: { fontFamily: "Nunito_800ExtraBold", fontSize: 22, color: Colors.charcoal },
  scoreBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  scoreText: { fontFamily: "Nunito_700Bold", fontSize: 12, color: Colors.white },
  cardMajor: { fontFamily: "Nunito_600SemiBold", fontSize: 13, color: Colors.textMuted },
  cardBio: { fontFamily: "Nunito_400Regular", fontSize: 14, color: Colors.charcoal, lineHeight: 20 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  tagText: { fontFamily: "Nunito_600SemiBold", fontSize: 11 },
  statsRow: { flexDirection: "row", gap: 20 },
  stat: { flex: 1, gap: 4 },
  statLabel: { fontFamily: "Nunito_600SemiBold", fontSize: 11, color: Colors.textMuted },
  dots: { flexDirection: "row", gap: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  breakRow: { flexDirection: "row", gap: 8 },
  breakTag: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: Colors.parchmentDark },
  breakText: { fontFamily: "Nunito_600SemiBold", fontSize: 11, color: Colors.charcoal },
  actionRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 24, paddingHorizontal: 40, paddingTop: 12,
  },
  actionBtn: {
    width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.borderSoft,
    shadowColor: Colors.charcoal, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  passBtn: { borderColor: Colors.errorRed + "50" },
  likeBtn: { borderColor: Colors.grassGreenDark + "50" },
  countBadge: { backgroundColor: Colors.parchmentDark, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  countText: { fontFamily: "Nunito_600SemiBold", fontSize: 13, color: Colors.textMuted },
  emptyCard: {
    width: CARD_WIDTH, alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.cardBg, borderRadius: 24, borderWidth: 1.5,
    borderColor: Colors.borderSoft, padding: 40, gap: 12,
  },
  emptyTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 20, color: Colors.charcoal, textAlign: "center" },
  emptySub: { fontFamily: "Nunito_400Regular", fontSize: 14, color: Colors.textMuted, textAlign: "center" },
});
