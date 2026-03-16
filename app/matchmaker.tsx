import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View, Text, StyleSheet, Animated, PanResponder, Dimensions,
  TouchableOpacity, Platform, useWindowDimensions, Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useApp, UserProfile, Zone, VibeProfile } from "@/context/AppContext";
import ZonePicker from "@/components/ZonePicker";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const CORAL = "#FF8C69";
const DARK_TEAL = "#2C555C";
const SCREEN_BG = "#FBFBF9";

const YEAR_LABELS: Record<string, string> = {
  freshman: "Freshman",
  sophomore: "Sophomore",
  junior: "Junior",
  senior: "Senior",
  grad_phd: "Grad/PhD",
};

const GREEK_LABELS: Record<string, string> = {
  sorority: "Sorority",
  fraternity: "Fraternity",
  prof_frat: "Prof. Frat",
  independent: "Independent",
};

const SLEEP_LABELS: Record<string, string> = {
  early_bird: "Early Bird",
  night_owl: "Night Owl",
  varies: "Varies",
};

const CLEAN_LABELS: Record<string, string> = {
  neat_freak: "Neat Freak",
  tidy: "Tidy",
  organized_chaos: "Organized Chaos",
  messy: "Messy",
};

const VICE_LABELS: Record<string, string> = {
  "420_friendly": "420 Friendly",
  drinks_socially: "Social Drinker",
  social_smoker: "Social Smoker",
  no_vices: "Substance Free",
  vapes: "Vapes",
};

function matchesGenderFilter(current: UserProfile, candidate: UserProfile): boolean {
  if (current.genderPref === "girls_only" && candidate.gender !== "female") return false;
  if (current.genderPref === "boys_only" && candidate.gender !== "male") return false;
  return true;
}

function getHabitChips(vp: VibeProfile): string[] {
  const chips: string[] = [];
  if (vp.sleep) chips.push(vp.sleep === "night_owl" ? "Night Owl 🦇" : vp.sleep === "early_bird" ? "Early Bird 🌅" : "Flexible 🔄");
  if (vp.cleanlinessVibe) chips.push(CLEAN_LABELS[vp.cleanlinessVibe] ? `${CLEAN_LABELS[vp.cleanlinessVibe]} ✨` : vp.cleanlinessVibe);
  if (vp.vices?.length) {
    vp.vices.forEach(v => {
      if (v === "420_friendly") chips.push("🌿 420 Friendly");
      else if (v === "drinks_socially") chips.push("🍷 Social Drinker");
      else if (v === "no_vices") chips.push("🚫 Substance Free");
    });
  }
  if (vp.pets?.length) {
    vp.pets.forEach(p => {
      if (p === "cats") chips.push("🐱 Cat Lover");
      else if (p === "dogs") chips.push("🐶 Dog Lover");
      else if (p === "plants") chips.push("🌿 Plant Parent");
    });
  }
  if (vp.guests === "love_hosting") chips.push("🎉 Love Hosting");
  else if (vp.guests === "rarely") chips.push("🤫 Quiet Space");
  return chips.slice(0, 5);
}

function HeroCard({
  user, score, cardHeight, cardWidth,
}: {
  user: UserProfile; score: number; cardHeight: number; cardWidth: number;
}) {
  const vp = user.vibeProfile;
  const initials = user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  const hasImage = !!user.profileImage;
  const habitChips = vp ? getHabitChips(vp) : [];
  const yearLabel = vp?.year ? YEAR_LABELS[vp.year] || vp.year : "";
  const greekLabel = vp?.greekLife && vp.greekLife !== "independent" ? GREEK_LABELS[vp.greekLife] || "" : "";
  const vitals = [yearLabel, greekLabel].filter(Boolean).join(" · ");

  return (
    <View style={[hc.container, { height: cardHeight, width: cardWidth }]}>
      {hasImage ? (
        <Image source={{ uri: user.profileImage }} style={hc.bgImage} />
      ) : (
        <View style={[hc.bgFallback, { backgroundColor: user.avatarColor }]}>
          <Text style={hc.bgInitials}>{initials}</Text>
        </View>
      )}

      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.15)", "rgba(0,0,0,0.75)"]}
        locations={[0.3, 0.55, 1]}
        style={hc.gradient}
      />

      <View style={hc.content}>
        <View style={hc.scoreRow}>
          <Text style={hc.scoreNum}>{score}</Text>
          <Text style={hc.scoreLabel}>MATCH ✨</Text>
        </View>

        <Text style={hc.name}>{user.name}</Text>
        {vitals ? <Text style={hc.vitals}>{vitals}</Text> : null}
        <Text style={hc.major}>{user.major}</Text>

        {habitChips.length > 0 && (
          <View style={hc.chipsRow}>
            {habitChips.map((chip, i) => (
              <View key={i} style={hc.chip}>
                <Text style={hc.chipText}>{chip}</Text>
              </View>
            ))}
          </View>
        )}

        {vp?.prompt && vp?.promptAnswer && (
          <View style={hc.icebreakerBox}>
            <Text style={hc.icebreakerPrompt}>{vp.prompt}</Text>
            <Text style={hc.icebreakerAnswer}>{vp.promptAnswer}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const hc = StyleSheet.create({
  container: { borderRadius: 32, overflow: "hidden", position: "relative" },
  bgImage: { width: "100%", height: "100%", resizeMode: "cover", position: "absolute" },
  bgFallback: {
    width: "100%", height: "100%", position: "absolute",
    alignItems: "center", justifyContent: "center",
  },
  bgInitials: { fontFamily: "Nunito_800ExtraBold", fontSize: 80, color: "rgba(255,255,255,0.3)" },
  gradient: { position: "absolute", left: 0, right: 0, bottom: 0, height: "70%" },
  content: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 20, justifyContent: "flex-end" },
  scoreRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 4 },
  scoreNum: {
    fontFamily: "Nunito_800ExtraBold", fontSize: 60, color: CORAL, lineHeight: 64,
    textShadowColor: "rgba(0,0,0,0.5)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8,
  },
  scoreLabel: {
    fontFamily: "Nunito_800ExtraBold", fontSize: 15, color: "#FFFFFF",
    letterSpacing: 2, marginBottom: 10,
    textShadowColor: "rgba(0,0,0,0.4)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  name: {
    fontFamily: "Nunito_800ExtraBold", fontSize: 26, color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.4)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  vitals: {
    fontFamily: "Nunito_600SemiBold", fontSize: 14, color: "rgba(255,255,255,0.8)", marginTop: 1,
  },
  major: {
    fontFamily: "Nunito_400Regular", fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 1,
  },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  chip: {
    backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 16,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  chipText: { fontFamily: "Nunito_600SemiBold", fontSize: 12, color: "#FFFFFF" },
  icebreakerBox: {
    backgroundColor: "rgba(0,0,0,0.4)", borderRadius: 12, padding: 12, marginTop: 10,
  },
  icebreakerPrompt: {
    fontFamily: "Nunito_700Bold", fontSize: 13, color: "rgba(255,255,255,0.85)", marginBottom: 4,
  },
  icebreakerAnswer: { fontFamily: "Nunito_400Regular", fontSize: 13, color: "#FFFFFF", lineHeight: 18 },
});

function SwipeableCard({
  user, score, onLike, onPass, isTop, cardWidth, cardHeight,
}: {
  user: UserProfile; score: number; onLike: () => void; onPass: () => void;
  isTop: boolean; cardWidth: number; cardHeight: number;
}) {
  const pan = useRef(new Animated.ValueXY()).current;
  const rotate = pan.x.interpolate({ inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2], outputRange: ["-8deg", "0deg", "8deg"] });
  const likeOpacity = pan.x.interpolate({ inputRange: [0, SWIPE_THRESHOLD], outputRange: [0, 1], extrapolate: "clamp" });
  const passOpacity = pan.x.interpolate({ inputRange: [-SWIPE_THRESHOLD, 0], outputRange: [1, 0], extrapolate: "clamp" });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isTop,
      onMoveShouldSetPanResponder: (_, g) => isTop && Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 5,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (_, gs) => {
        if (gs.dx > SWIPE_THRESHOLD) {
          Animated.spring(pan, { toValue: { x: SCREEN_WIDTH * 1.5, y: gs.dy }, useNativeDriver: false }).start(onLike);
        } else if (gs.dx < -SWIPE_THRESHOLD) {
          Animated.spring(pan, { toValue: { x: -SCREEN_WIDTH * 1.5, y: gs.dy }, useNativeDriver: false }).start(onPass);
        } else {
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
        }
      },
    })
  ).current;

  return (
    <Animated.View
      style={[styles.card, {
        width: cardWidth, height: cardHeight,
        transform: [{ translateX: pan.x }, { translateY: isTop ? pan.y : 0 }, { rotate: isTop ? rotate : "0deg" }],
        zIndex: isTop ? 10 : 5,
        opacity: isTop ? 1 : 0.92,
      }]}
      {...(isTop ? panResponder.panHandlers : {})}
    >
      {isTop && (
        <>
          <Animated.View style={[styles.swipeLabel, styles.swipeLike, { opacity: likeOpacity }]}>
            <Ionicons name="heart" size={24} color="#FFFFFF" />
            <Text style={[styles.swipeLabelText, { color: "#FFFFFF" }]}>CONNECT</Text>
          </Animated.View>
          <Animated.View style={[styles.swipeLabel, styles.swipePass, { opacity: passOpacity }]}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
            <Text style={[styles.swipeLabelText, { color: "#FFFFFF" }]}>PASS</Text>
          </Animated.View>
        </>
      )}
      <HeroCard user={user} score={score} cardHeight={cardHeight} cardWidth={cardWidth} />
    </Animated.View>
  );
}

export default function MatchmakerScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { currentUser, mockUsers, addMatch, addLiked, addPassed, likedUserIds, passedUserIds, computeScore, subleases } = useApp();
  const [zoneFilter, setZoneFilter] = useState<Zone | "all">("all");

  const isDesktopMm = Platform.OS === "web" && screenWidth >= 1024;
  const topPadding = Platform.OS === "web" ? (isDesktopMm ? 24 : 67) : insets.top;
  const bottomPadding = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const contentMaxW = isDesktopMm ? 520 : Math.min(screenWidth, 500);
  const cardWidth = contentMaxW * 0.95;
  const cardHeight = Math.min(screenHeight * 0.72, 620);

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

  return (
    <View style={[styles.container, isDesktopMm && { maxWidth: contentMaxW + 40, alignSelf: "center" as const, width: "100%" }]}>
      <View style={[styles.header, { paddingTop: topPadding + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)")}>
          <Ionicons name="arrow-back" size={20} color={Colors.ocean} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Matchmaker</Text>
          <Text style={styles.headerSub}>{remaining.length} potential roommates</Text>
        </View>
        <View style={[styles.matchBadge, { backgroundColor: Colors.grassGreen + "20" }]}>
          <Ionicons name="heart" size={12} color={Colors.grassGreen} />
          <Text style={[styles.matchBadgeText, { color: Colors.grassGreen }]}>{likedUserIds.length}</Text>
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
                cardWidth={cardWidth} cardHeight={cardHeight}
                onLike={() => handleLike(user)} onPass={() => handlePass(user)} />
            );
          }).reverse()
        )}
      </View>

      {remaining.length > 0 && (
        <View style={[styles.actionRow, { paddingBottom: bottomPadding + 12 }]}>
          <TouchableOpacity style={[styles.actionBtn, styles.passBtn]} onPress={() => handlePass(remaining[0])}>
            <Ionicons name="close" size={30} color={DARK_TEAL} />
          </TouchableOpacity>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{remaining.length} left</Text>
          </View>
          <TouchableOpacity style={[styles.actionBtn, styles.likeBtn]} onPress={() => handleLike(remaining[0])}>
            <Ionicons name="heart" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SCREEN_BG },
  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 6, gap: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 14, backgroundColor: Colors.white,
    alignItems: "center", justifyContent: "center",
    shadowColor: "rgba(0,0,0,0.06)", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2,
  },
  headerCenter: { flex: 1 },
  headerTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 20, color: DARK_TEAL },
  headerSub: { fontFamily: "Nunito_400Regular", fontSize: 12, color: "#6B8A8F" },
  matchBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  matchBadgeText: { fontFamily: "Nunito_800ExtraBold", fontSize: 14 },
  deckArea: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    position: "absolute",
    borderRadius: 32, overflow: "hidden",
    shadowColor: "rgba(0,0,0,0.08)", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1, shadowRadius: 24, elevation: 8,
  },
  swipeLabel: {
    position: "absolute", top: 24, flexDirection: "row", alignItems: "center",
    gap: 6, zIndex: 20, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 14,
  },
  swipeLike: { right: 20, backgroundColor: Colors.grassGreen },
  swipePass: { left: 20, backgroundColor: Colors.errorRed },
  swipeLabelText: { fontFamily: "Nunito_800ExtraBold", fontSize: 15 },
  actionRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 28, paddingTop: 12,
  },
  actionBtn: {
    width: 75, height: 75, borderRadius: 38, alignItems: "center", justifyContent: "center",
    shadowColor: "rgba(0,0,0,0.08)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 4,
  },
  passBtn: { backgroundColor: "#F0F3F3" },
  likeBtn: { backgroundColor: CORAL },
  countBadge: { backgroundColor: "#EDF2F2", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 8 },
  countText: { fontFamily: "Nunito_600SemiBold", fontSize: 13, color: "#6B8A8F" },
  emptyCard: {
    alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.white, borderRadius: 28, padding: 40, gap: 12,
    maxWidth: 400, width: "90%",
    shadowColor: "rgba(0,0,0,0.06)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 16, elevation: 4,
  },
  emptyTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 22, color: DARK_TEAL },
  emptySub: { fontFamily: "Nunito_400Regular", fontSize: 14, color: "#6B8A8F", textAlign: "center" },
  goMatchesBtn: { backgroundColor: Colors.ocean, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14, marginTop: 8 },
  goMatchesBtnText: { fontFamily: "Nunito_700Bold", fontSize: 15, color: Colors.white },
});
