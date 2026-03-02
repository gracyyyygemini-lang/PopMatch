import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View, Text, StyleSheet, Animated, PanResponder, Dimensions,
  TouchableOpacity, ScrollView, Platform, ActivityIndicator
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useApp, UserProfile } from "@/context/AppContext";
import { getApiUrl } from "@/lib/query-client";

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

interface GroupProfile {
  id: string;
  creator_email: string;
  building_name: string;
  address: string;
  zone: string;
  rent_per_person: number;
  rooms_available: number;
  description: string;
  avatar_color: string;
}

function matchesGenderFilter(current: UserProfile, candidate: UserProfile): boolean {
  if (current.genderPref === "girls_only" && candidate.gender !== "female") return false;
  if (current.genderPref === "boys_only" && candidate.gender !== "male") return false;
  return true;
}

function ProfileCard({ user, score }: { user: UserProfile; score: number }) {
  const initials = user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
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
        {user.bio ? <Text style={styles.cardBio}>{user.bio}</Text> : null}
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
          <View style={styles.genderPrefChip}>
            <Text style={styles.genderPrefText}>
              {user.genderPref === "girls_only" ? "Girls Only" : user.genderPref === "boys_only" ? "Boys Only" : "Open"}
            </Text>
          </View>
        </View>
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

function GroupCard({ group, onRequest }: { group: GroupProfile; onRequest: () => void }) {
  const initials = group.building_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <View style={styles.groupCard}>
      <View style={styles.groupCardTop}>
        <View style={[styles.avatar, { backgroundColor: group.avatar_color }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.nameBlock}>
          <Text style={styles.cardName}>{group.building_name}</Text>
          {group.address ? <Text style={styles.cardMajor}>{group.address}</Text> : null}
        </View>
        <View style={[styles.roomBadge, { backgroundColor: Colors.grassGreen + "20" }]}>
          <Text style={[styles.roomBadgeText, { color: Colors.grassGreen }]}>
            {group.rooms_available} open
          </Text>
        </View>
      </View>
      <View style={styles.tagsRow}>
        <View style={[styles.tag, { backgroundColor: Colors.ocean + "18" }]}>
          <Ionicons name="location-outline" size={11} color={Colors.ocean} />
          <Text style={[styles.tagText, { color: Colors.ocean }]}>{ZONE_LABELS[group.zone] ?? group.zone}</Text>
        </View>
        <View style={[styles.tag, { backgroundColor: Colors.gold + "35" }]}>
          <Ionicons name="cash-outline" size={11} color={Colors.charcoal} />
          <Text style={[styles.tagText, { color: Colors.charcoal }]}>${group.rent_per_person}/mo</Text>
        </View>
      </View>
      {group.description ? (
        <Text style={styles.groupDesc} numberOfLines={3}>{group.description}</Text>
      ) : null}
      <TouchableOpacity style={styles.requestBtn} onPress={onRequest}>
        <Ionicons name="paper-plane-outline" size={16} color={Colors.white} />
        <Text style={styles.requestBtnText}>Request to Join</Text>
      </TouchableOpacity>
    </View>
  );
}

function MatchOverlay({ matchedName, matchedEmail, conversationId, onClose }: {
  matchedName: string;
  matchedEmail: string;
  conversationId: string;
  onClose: () => void;
}) {
  const scale = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 120, friction: 8 }),
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);
  const initials = matchedName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <View style={styles.matchOverlay}>
      <Animated.View style={[styles.matchModal, { transform: [{ scale }], opacity }]}>
        <View style={styles.matchHearts}>
          <Text style={{ fontSize: 40 }}>🎉</Text>
        </View>
        <Text style={styles.matchTitle}>You connected!</Text>
        <View style={[styles.avatar, { backgroundColor: Colors.ocean, alignSelf: "center", width: 64, height: 64, borderRadius: 32 }]}>
          <Text style={[styles.avatarText, { fontSize: 22 }]}>{initials}</Text>
        </View>
        <Text style={styles.matchName}>{matchedName}</Text>
        <Text style={styles.matchSub}>Say hi, and start browsing the Sublease tab together to find your perfect spot.</Text>
        <TouchableOpacity
          style={styles.startChatBtn}
          onPress={() => {
            onClose();
            router.push({
              pathname: "/chat/[id]",
              params: { id: conversationId, otherEmail: matchedEmail, otherName: matchedName },
            });
          }}
        >
          <Ionicons name="chatbubble-outline" size={18} color={Colors.white} />
          <Text style={styles.startChatBtnText}>Start Chatting</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.matchLaterBtn} onPress={onClose}>
          <Text style={styles.matchLaterText}>Maybe Later</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

type MatcherPath = "select" | "A" | "B";

export default function MatchmakerScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser, mockUsers, addMatch, addLiked, addPassed, likedUserIds, passedUserIds, computeScore } = useApp();
  const [path, setPath] = useState<MatcherPath>("select");
  const [groupProfiles, setGroupProfiles] = useState<GroupProfile[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [matchOverlay, setMatchOverlay] = useState<{
    name: string; email: string; conversationId: string;
  } | null>(null);

  const filtered = mockUsers.filter(u => {
    if (!currentUser) return true;
    if (u.id === currentUser.id) return false;
    if (!matchesGenderFilter(currentUser, u)) return false;
    return true;
  });
  const remaining = filtered.filter(u => !likedUserIds.includes(u.id) && !passedUserIds.includes(u.id));
  const topCards = remaining.slice(0, 3);

  const fetchGroupProfiles = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const url = new URL("/api/group-profiles", getApiUrl()).toString();
      const res = await fetch(url);
      if (res.ok) setGroupProfiles(await res.json());
    } catch {}
    setLoadingGroups(false);
  }, []);

  const handleLike = useCallback(async (user: UserProfile) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const score = currentUser ? computeScore(currentUser, user) : 75;
    await addLiked(user.id);
    await addMatch({ userId: user.id, score, liked: true, timestamp: Date.now() });
    if (currentUser) {
      try {
        const url = new URL("/api/conversations/find-or-create", getApiUrl()).toString();
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emails: [currentUser.email, user.email],
            type: "match",
            listingId: "",
            systemMessage: "You're a match! Say hi, and start browsing the Sublease tab together to find your perfect spot. 🌊",
          }),
        });
        if (res.ok) {
          const { conversationId } = await res.json();
          setMatchOverlay({ name: user.name, email: user.email, conversationId });
        }
      } catch {}
    }
  }, [currentUser, computeScore]);

  const handlePass = useCallback(async (user: UserProfile) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await addPassed(user.id);
  }, []);

  const handleRequestJoin = useCallback(async (group: GroupProfile) => {
    if (!currentUser) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const url = new URL("/api/conversations/find-or-create", getApiUrl()).toString();
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails: [currentUser.email, group.creator_email],
          type: "group_request",
          listingId: group.id,
          listingTitle: group.building_name,
          systemMessage: `Hi! I'm interested in joining your group at ${group.building_name}. Let's chat!`,
        }),
      });
      if (res.ok) {
        const { conversationId } = await res.json();
        router.push({
          pathname: "/chat/[id]",
          params: {
            id: conversationId,
            otherEmail: group.creator_email,
            otherName: group.creator_email.split("@")[0],
            listingTitle: group.building_name,
          },
        });
      }
    } catch {}
  }, [currentUser]);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  if (path === "select") {
    return (
      <View style={[styles.container]}>
        <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={Colors.ocean} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Roommate Matchmaker</Text>
            <Text style={styles.headerSub}>What are you looking for?</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.selectContent, {
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 20
          }]}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={styles.pathCard}
            onPress={() => { Haptics.selectionAsync(); setPath("A"); }}
            activeOpacity={0.85}
          >
            <View style={[styles.pathIconWrap, { backgroundColor: Colors.ocean + "18" }]}>
              <Ionicons name="people" size={34} color={Colors.ocean} />
            </View>
            <Text style={styles.pathTitle}>I need to find roommates</Text>
            <Text style={styles.pathSub}>
              Swipe through individual profiles and connect with people who match your budget, vibe, and lease type.
            </Text>
            <View style={styles.pathFooter}>
              <Text style={styles.pathFooterText}>Browse people →</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pathCard, { borderColor: Colors.orange + "60" }]}
            onPress={() => {
              Haptics.selectionAsync();
              setPath("B");
              fetchGroupProfiles();
            }}
            activeOpacity={0.85}
          >
            <View style={[styles.pathIconWrap, { backgroundColor: Colors.orange + "18" }]}>
              <Ionicons name="home" size={34} color={Colors.orange} />
            </View>
            <Text style={styles.pathTitle}>I have a place, need roommates</Text>
            <Text style={styles.pathSub}>
              Already have a lease? Create a group profile showing your apartment and find people to fill the remaining rooms.
            </Text>
            <View style={[styles.pathFooter, { borderTopColor: Colors.orange + "30" }]}>
              <Text style={[styles.pathFooterText, { color: Colors.orange }]}>Browse groups →</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  if (path === "B") {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setPath("select")}>
            <Ionicons name="arrow-back" size={20} color={Colors.ocean} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Group Profiles</Text>
            <Text style={styles.headerSub}>Find a place with spots open</Text>
          </View>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: Colors.ocean }]}
            onPress={() => router.push("/create-group")}
          >
            <Ionicons name="add" size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {loadingGroups ? (
          <View style={styles.centered}>
            <ActivityIndicator color={Colors.ocean} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[styles.groupList, {
              paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 20
            }]}
            showsVerticalScrollIndicator={false}
          >
            {groupProfiles.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="home-outline" size={52} color={Colors.textLight} />
                <Text style={styles.emptyTitle}>No groups yet</Text>
                <Text style={styles.emptySub}>Be the first to create a group profile for your place!</Text>
                <TouchableOpacity style={styles.goMatchesBtn} onPress={() => router.push("/create-group")}>
                  <Text style={styles.goMatchesBtnText}>Create Group Profile</Text>
                </TouchableOpacity>
              </View>
            ) : (
              groupProfiles.map(g => (
                <GroupCard key={g.id} group={g} onRequest={() => handleRequestJoin(g)} />
              ))
            )}
          </ScrollView>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setPath("select")}>
          <Ionicons name="arrow-back" size={20} color={Colors.ocean} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Find a Roommate</Text>
          <Text style={styles.headerSub}>{remaining.length} potential roommates</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.matchBadge, { backgroundColor: Colors.grassGreen + "20" }]}>
            <Text style={[styles.matchBadgeText, { color: Colors.grassGreen }]}>{likedUserIds.length}</Text>
          </View>
        </View>
      </View>

      <View style={styles.deckArea}>
        {remaining.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-circle" size={52} color={Colors.grassGreen} />
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptySub}>Check your Chats tab to connect with people you liked.</Text>
            <TouchableOpacity style={styles.goMatchesBtn} onPress={() => router.push("/(tabs)/chats")}>
              <Text style={styles.goMatchesBtnText}>Go to Chats</Text>
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

      {matchOverlay && (
        <MatchOverlay
          matchedName={matchOverlay.name}
          matchedEmail={matchOverlay.email}
          conversationId={matchOverlay.conversationId}
          onClose={() => setMatchOverlay(null)}
        />
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
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },

  selectContent: { padding: 20, gap: 16 },
  pathCard: {
    backgroundColor: Colors.cardBg, borderRadius: 20,
    borderWidth: 2, borderColor: Colors.ocean + "40",
    padding: 20, gap: 10,
    shadowColor: Colors.charcoal, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 3,
  },
  pathIconWrap: {
    width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center",
  },
  pathTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 20, color: Colors.charcoal },
  pathSub: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textMuted, lineHeight: 20 },
  pathFooter: {
    borderTopWidth: 1, borderTopColor: Colors.ocean + "20", paddingTop: 12, marginTop: 4,
  },
  pathFooterText: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.ocean },

  groupList: { padding: 16, gap: 14 },
  groupCard: {
    backgroundColor: Colors.cardBg, borderRadius: 18,
    borderWidth: 1.5, borderColor: Colors.borderSoft,
    padding: 16, gap: 10,
    shadowColor: Colors.charcoal, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07, shadowRadius: 12, elevation: 2,
  },
  groupCardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  roomBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  roomBadgeText: { fontFamily: "Nunito_700Bold", fontSize: 12 },
  groupDesc: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.charcoal, lineHeight: 19 },
  requestBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: Colors.ocean, borderRadius: 12, paddingVertical: 12,
  },
  requestBtnText: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.white },

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
  breakChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: Colors.sandDark,
  },
  breakChipText: { fontFamily: "Nunito_600SemiBold", fontSize: 11, color: Colors.charcoal },
  genderPrefChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: Colors.ocean + "18" },
  genderPrefText: { fontFamily: "Nunito_600SemiBold", fontSize: 11, color: Colors.ocean },
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

  matchOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center", justifyContent: "center",
    zIndex: 100, padding: 24,
  },
  matchModal: {
    backgroundColor: Colors.cardBg, borderRadius: 28, padding: 28,
    width: "100%", alignItems: "center", gap: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3, shadowRadius: 24, elevation: 20,
  },
  matchHearts: { alignItems: "center" },
  matchTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 28, color: Colors.ocean },
  matchName: { fontFamily: "Nunito_700Bold", fontSize: 18, color: Colors.charcoal },
  matchSub: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textMuted, textAlign: "center", lineHeight: 20 },
  startChatBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.ocean, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14, marginTop: 4, width: "100%",
    justifyContent: "center",
  },
  startChatBtnText: { fontFamily: "Nunito_700Bold", fontSize: 16, color: Colors.white },
  matchLaterBtn: { paddingVertical: 8 },
  matchLaterText: { fontFamily: "Nunito_600SemiBold", fontSize: 14, color: Colors.textMuted },
  gold: { color: Colors.goldDark },
});
