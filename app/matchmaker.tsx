import React, { useState, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, Animated, PanResponder, Dimensions,
  TouchableOpacity, ScrollView, Platform
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useApp, UserProfile, HousingStatus, SubleasePost, TrustInfo } from "@/context/AppContext";
import FacePile from "@/components/FacePile";

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

const STATUS_LABELS: Record<HousingStatus, string> = {
  host: "Host",
  joiner: "Joiner",
  co_seeker: "Co-Seeker",
  sublessor: "Sublessor",
  sublessee: "Sublessee",
};

const STATUS_COLORS: Record<HousingStatus, string> = {
  host: Colors.ocean,
  joiner: Colors.grassGreen,
  co_seeker: Colors.ponyo,
  sublessor: Colors.goldDark,
  sublessee: Colors.teal,
};

const SUBLEASE_DATE_RANGES: Record<string, string> = {
  fall_sublease: "Aug – Dec",
  spring_sublease: "Jan – May",
  summer_sublease: "May – Aug",
  full_year: "Aug – Jul",
};

function matchesGenderFilter(current: UserProfile, candidate: UserProfile): boolean {
  if (current.genderPref === "girls_only" && candidate.gender !== "female") return false;
  if (current.genderPref === "boys_only" && candidate.gender !== "male") return false;
  return true;
}

function TrustBadge({ trustInfo }: { trustInfo: TrustInfo }) {
  return (
    <View style={tStyles.trustRow}>
      {trustInfo.isFriend ? (
        <View style={[tStyles.trustBadge, { backgroundColor: Colors.grassGreen + "20" }]}>
          <Ionicons name="shield-checkmark" size={11} color={Colors.grassGreen} />
          <Text style={[tStyles.trustText, { color: Colors.grassGreen }]}>1st Degree</Text>
        </View>
      ) : trustInfo.degree === 2 ? (
        <View style={[tStyles.trustBadge, { backgroundColor: Colors.ocean + "18" }]}>
          <Ionicons name="people" size={11} color={Colors.ocean} />
          <Text style={[tStyles.trustText, { color: Colors.ocean }]}>2nd Degree</Text>
        </View>
      ) : trustInfo.sharedOrg ? (
        <View style={[tStyles.trustBadge, { backgroundColor: Colors.gold + "30" }]}>
          <Ionicons name="school" size={11} color={Colors.goldDark} />
          <Text style={[tStyles.trustText, { color: Colors.goldDark }]}>{trustInfo.sharedOrg}</Text>
        </View>
      ) : (
        <View style={[tStyles.trustBadge, { backgroundColor: Colors.textMuted + "18" }]}>
          <Ionicons name="help-circle-outline" size={11} color={Colors.textMuted} />
          <Text style={[tStyles.trustText, { color: Colors.textMuted }]}>No Connections</Text>
        </View>
      )}
      {trustInfo.mutualFriends.length > 0 && (
        <FacePile mutuals={trustInfo.mutualFriends} maxVisible={3} />
      )}
    </View>
  );
}

const tStyles = StyleSheet.create({
  trustRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  trustBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  trustText: { fontFamily: "Nunito_600SemiBold", fontSize: 10 },
});

function HostCard({ user, score, listing, trustInfo }: { user: UserProfile; score: number; listing?: SubleasePost; trustInfo: TrustInfo }) {
  const initials = user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  return (
    <ScrollView style={cardStyles.scroll} showsVerticalScrollIndicator={false} bounces={false}>
      <View style={cardStyles.content}>
        <View style={cardStyles.topSection}>
          <View style={[cardStyles.avatar, { backgroundColor: user.avatarColor }]}>
            <Text style={cardStyles.avatarText}>{initials}</Text>
          </View>
          <View style={cardStyles.nameBlock}>
            <Text style={cardStyles.name}>{user.name}</Text>
            <Text style={cardStyles.major}>{user.major}</Text>
          </View>
          <View style={[cardStyles.scorePill, {
            backgroundColor: score >= 80 ? Colors.grassGreen : score >= 60 ? Colors.ocean : Colors.textMuted
          }]}>
            <Text style={cardStyles.scorePillText}>{score}%</Text>
          </View>
        </View>

        <View style={[cardStyles.intentBadge, { backgroundColor: STATUS_COLORS.host + "18" }]}>
          <Ionicons name="key" size={13} color={STATUS_COLORS.host} />
          <Text style={[cardStyles.intentText, { color: STATUS_COLORS.host }]}>Host</Text>
        </View>

        {listing && (
          <View style={cardStyles.listingBox}>
            <Text style={cardStyles.listingLabel}>Lease at {listing.buildingName}</Text>
            <Text style={cardStyles.listingPrice}>Price: ${listing.pricePerMonth}/mo</Text>
            <View style={cardStyles.tagsRow}>
              <View style={[cardStyles.tag, { backgroundColor: Colors.ocean + "18" }]}>
                <Ionicons name="location-outline" size={11} color={Colors.ocean} />
                <Text style={[cardStyles.tagText, { color: Colors.ocean }]}>{ZONE_LABELS[listing.zone]}</Text>
              </View>
            </View>
          </View>
        )}

        <TrustBadge trustInfo={trustInfo} />

        {user.bio ? <Text style={cardStyles.bio}>{user.bio}</Text> : null}
      </View>
    </ScrollView>
  );
}

function SublessorCard({ user, score, listing, trustInfo }: { user: UserProfile; score: number; listing?: SubleasePost; trustInfo: TrustInfo }) {
  const initials = user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  return (
    <ScrollView style={cardStyles.scroll} showsVerticalScrollIndicator={false} bounces={false}>
      <View style={cardStyles.content}>
        <View style={cardStyles.topSection}>
          <View style={[cardStyles.avatar, { backgroundColor: user.avatarColor }]}>
            <Text style={cardStyles.avatarText}>{initials}</Text>
          </View>
          <View style={cardStyles.nameBlock}>
            <Text style={cardStyles.name}>{user.name}</Text>
            <Text style={cardStyles.major}>{user.major}</Text>
          </View>
          <View style={[cardStyles.scorePill, {
            backgroundColor: score >= 80 ? Colors.grassGreen : score >= 60 ? Colors.ocean : Colors.textMuted
          }]}>
            <Text style={cardStyles.scorePillText}>{score}%</Text>
          </View>
        </View>

        <View style={cardStyles.sublessorBadges}>
          <View style={[cardStyles.intentBadge, { backgroundColor: STATUS_COLORS.sublessor + "18" }]}>
            <Ionicons name="exit-outline" size={13} color={STATUS_COLORS.sublessor} />
            <Text style={[cardStyles.intentText, { color: STATUS_COLORS.sublessor }]}>Sublessor</Text>
          </View>
          <View style={cardStyles.shortTermBadge}>
            <Text style={cardStyles.shortTermText}>Short-Term</Text>
          </View>
        </View>

        {listing && (
          <View style={cardStyles.listingBox}>
            <Text style={cardStyles.listingLabel}>{listing.buildingName}</Text>
            <Text style={cardStyles.listingPrice}>${listing.pricePerMonth}/mo</Text>
            <Text style={cardStyles.dateRange}>{SUBLEASE_DATE_RANGES[listing.leaseType] || "Flexible"}</Text>
          </View>
        )}

        <TrustBadge trustInfo={trustInfo} />

        {user.bio ? <Text style={cardStyles.bio}>{user.bio}</Text> : null}
      </View>
    </ScrollView>
  );
}

function JoinerCard({ user, score, listing, trustInfo }: { user: UserProfile; score: number; listing?: SubleasePost; trustInfo: TrustInfo }) {
  const initials = user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  return (
    <ScrollView style={cardStyles.scroll} showsVerticalScrollIndicator={false} bounces={false}>
      <View style={cardStyles.content}>
        <View style={cardStyles.topSection}>
          <View style={[cardStyles.avatar, { backgroundColor: user.avatarColor }]}>
            <Text style={cardStyles.avatarText}>{initials}</Text>
          </View>
          <View style={cardStyles.nameBlock}>
            <Text style={cardStyles.name}>{user.name}</Text>
            <Text style={cardStyles.major}>{user.major}</Text>
          </View>
          <View style={[cardStyles.scorePill, {
            backgroundColor: score >= 80 ? Colors.grassGreen : score >= 60 ? Colors.ocean : Colors.textMuted
          }]}>
            <Text style={cardStyles.scorePillText}>{score}%</Text>
          </View>
        </View>

        <View style={[cardStyles.intentBadge, { backgroundColor: STATUS_COLORS.joiner + "18" }]}>
          <Ionicons name="enter-outline" size={13} color={STATUS_COLORS.joiner} />
          <Text style={[cardStyles.intentText, { color: STATUS_COLORS.joiner }]}>Joiner</Text>
        </View>

        <View style={cardStyles.tagsRow}>
          <View style={[cardStyles.tag, { backgroundColor: Colors.ocean + "18" }]}>
            <Ionicons name="location-outline" size={11} color={Colors.ocean} />
            <Text style={[cardStyles.tagText, { color: Colors.ocean }]}>{ZONE_LABELS[user.zone]}</Text>
          </View>
          <View style={[cardStyles.tag, { backgroundColor: Colors.gold + "35" }]}>
            <Ionicons name="cash-outline" size={11} color={Colors.charcoal} />
            <Text style={[cardStyles.tagText, { color: Colors.charcoal }]}>${user.budget}/mo</Text>
          </View>
          <View style={[cardStyles.tag, { backgroundColor: Colors.orange + "18" }]}>
            <Ionicons name="calendar-outline" size={11} color={Colors.orange} />
            <Text style={[cardStyles.tagText, { color: Colors.orange }]}>{LEASE_LABELS[user.leaseType]}</Text>
          </View>
        </View>

        <View style={cardStyles.lifestyleSection}>
          <View style={cardStyles.lifestyleRow}>
            <Text style={cardStyles.lifestyleLabel}>Cleanliness</Text>
            <View style={cardStyles.dots}>
              {[1,2,3,4,5].map(n => (
                <View key={n} style={[cardStyles.dot, { backgroundColor: n <= user.cleanliness ? Colors.grassGreen : Colors.borderSoft }]} />
              ))}
            </View>
          </View>
          <View style={cardStyles.lifestyleRow}>
            <Text style={cardStyles.lifestyleLabel}>Noise Level</Text>
            <View style={cardStyles.dots}>
              {[1,2,3,4,5].map(n => (
                <View key={n} style={[cardStyles.dot, { backgroundColor: n <= user.noise ? Colors.ocean : Colors.borderSoft }]} />
              ))}
            </View>
          </View>
        </View>

        <TrustBadge trustInfo={trustInfo} />

        {user.bio ? <Text style={cardStyles.bio}>{user.bio}</Text> : null}
      </View>
    </ScrollView>
  );
}

function SublesseeCard({ user, score, trustInfo }: { user: UserProfile; score: number; trustInfo: TrustInfo }) {
  const initials = user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  return (
    <ScrollView style={cardStyles.scroll} showsVerticalScrollIndicator={false} bounces={false}>
      <View style={cardStyles.content}>
        <View style={cardStyles.topSection}>
          <View style={[cardStyles.avatar, { backgroundColor: user.avatarColor }]}>
            <Text style={cardStyles.avatarText}>{initials}</Text>
          </View>
          <View style={cardStyles.nameBlock}>
            <Text style={cardStyles.name}>{user.name}</Text>
            <Text style={cardStyles.major}>{user.major}</Text>
          </View>
          <View style={[cardStyles.scorePill, {
            backgroundColor: score >= 80 ? Colors.grassGreen : score >= 60 ? Colors.ocean : Colors.textMuted
          }]}>
            <Text style={cardStyles.scorePillText}>{score}%</Text>
          </View>
        </View>

        <View style={cardStyles.sublessorBadges}>
          <View style={[cardStyles.intentBadge, { backgroundColor: STATUS_COLORS.sublessee + "18" }]}>
            <Ionicons name="search-outline" size={13} color={STATUS_COLORS.sublessee} />
            <Text style={[cardStyles.intentText, { color: STATUS_COLORS.sublessee }]}>Sublessee</Text>
          </View>
          <View style={cardStyles.shortTermBadge}>
            <Text style={cardStyles.shortTermText}>Looking for Sublease</Text>
          </View>
        </View>

        <View style={cardStyles.tagsRow}>
          <View style={[cardStyles.tag, { backgroundColor: Colors.ocean + "18" }]}>
            <Ionicons name="location-outline" size={11} color={Colors.ocean} />
            <Text style={[cardStyles.tagText, { color: Colors.ocean }]}>Preferred: {ZONE_LABELS[user.zone]}</Text>
          </View>
          <View style={[cardStyles.tag, { backgroundColor: Colors.gold + "35" }]}>
            <Ionicons name="cash-outline" size={11} color={Colors.charcoal} />
            <Text style={[cardStyles.tagText, { color: Colors.charcoal }]}>Budget: ${user.budget}/mo</Text>
          </View>
          <View style={[cardStyles.tag, { backgroundColor: Colors.orange + "18" }]}>
            <Ionicons name="calendar-outline" size={11} color={Colors.orange} />
            <Text style={[cardStyles.tagText, { color: Colors.orange }]}>{LEASE_LABELS[user.leaseType]}</Text>
          </View>
        </View>

        <TrustBadge trustInfo={trustInfo} />

        {user.bio ? <Text style={cardStyles.bio}>{user.bio}</Text> : null}
      </View>
    </ScrollView>
  );
}

function CoSeekerCard({ user, score, trustInfo }: { user: UserProfile; score: number; trustInfo: TrustInfo }) {
  const initials = user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  return (
    <ScrollView style={cardStyles.scroll} showsVerticalScrollIndicator={false} bounces={false}>
      <View style={cardStyles.content}>
        <View style={cardStyles.topSection}>
          <View style={[cardStyles.avatar, { backgroundColor: user.avatarColor }]}>
            <Text style={cardStyles.avatarText}>{initials}</Text>
          </View>
          <View style={cardStyles.nameBlock}>
            <Text style={cardStyles.name}>{user.name}</Text>
            <Text style={cardStyles.major}>{user.major}</Text>
          </View>
          <View style={[cardStyles.scorePill, {
            backgroundColor: score >= 80 ? Colors.grassGreen : score >= 60 ? Colors.ocean : Colors.textMuted
          }]}>
            <Text style={cardStyles.scorePillText}>{score}%</Text>
          </View>
        </View>

        <View style={[cardStyles.intentBadge, { backgroundColor: STATUS_COLORS.co_seeker + "18" }]}>
          <Ionicons name="people" size={13} color={STATUS_COLORS.co_seeker} />
          <Text style={[cardStyles.intentText, { color: STATUS_COLORS.co_seeker }]}>Co-Seeker</Text>
        </View>

        <View style={cardStyles.lifestyleSection}>
          <View style={cardStyles.lifestyleRow}>
            <Text style={cardStyles.lifestyleLabel}>Cleanliness</Text>
            <View style={cardStyles.dots}>
              {[1,2,3,4,5].map(n => (
                <View key={n} style={[cardStyles.dot, { backgroundColor: n <= user.cleanliness ? Colors.grassGreen : Colors.borderSoft }]} />
              ))}
            </View>
          </View>
          <View style={cardStyles.lifestyleRow}>
            <Text style={cardStyles.lifestyleLabel}>Noise Level</Text>
            <View style={cardStyles.dots}>
              {[1,2,3,4,5].map(n => (
                <View key={n} style={[cardStyles.dot, { backgroundColor: n <= user.noise ? Colors.ocean : Colors.borderSoft }]} />
              ))}
            </View>
          </View>
        </View>

        <View style={cardStyles.tagsRow}>
          <View style={[cardStyles.tag, { backgroundColor: Colors.ocean + "18" }]}>
            <Ionicons name="location-outline" size={11} color={Colors.ocean} />
            <Text style={[cardStyles.tagText, { color: Colors.ocean }]}>{ZONE_LABELS[user.zone]}</Text>
          </View>
          <View style={[cardStyles.tag, { backgroundColor: Colors.gold + "35" }]}>
            <Ionicons name="cash-outline" size={11} color={Colors.charcoal} />
            <Text style={[cardStyles.tagText, { color: Colors.charcoal }]}>${user.budget}/mo</Text>
          </View>
          <View style={[cardStyles.tag, { backgroundColor: Colors.ponyo + "18" }]}>
            <Ionicons name="school-outline" size={11} color={Colors.ponyo} />
            <Text style={[cardStyles.tagText, { color: Colors.ponyo }]}>{user.major}</Text>
          </View>
        </View>

        <TrustBadge trustInfo={trustInfo} />

        <TouchableOpacity style={cardStyles.ctaBtn} activeOpacity={0.85}>
          <Ionicons name="search" size={15} color={Colors.white} />
          <Text style={cardStyles.ctaText}>Let's find a place together</Text>
        </TouchableOpacity>

        {user.bio ? <Text style={cardStyles.bio}>{user.bio}</Text> : null}
      </View>
    </ScrollView>
  );
}

function DefaultCard({ user, score, trustInfo }: { user: UserProfile; score: number; trustInfo: TrustInfo }) {
  const initials = user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  const status = user.housingStatus || "joiner";
  return (
    <ScrollView style={cardStyles.scroll} showsVerticalScrollIndicator={false} bounces={false}>
      <View style={cardStyles.content}>
        <View style={cardStyles.topSection}>
          <View style={[cardStyles.avatar, { backgroundColor: user.avatarColor }]}>
            <Text style={cardStyles.avatarText}>{initials}</Text>
          </View>
          <View style={cardStyles.nameBlock}>
            <Text style={cardStyles.name}>{user.name}</Text>
            <Text style={cardStyles.major}>{user.major}</Text>
          </View>
          <View style={[cardStyles.scorePill, {
            backgroundColor: score >= 80 ? Colors.grassGreen : score >= 60 ? Colors.ocean : Colors.textMuted
          }]}>
            <Text style={cardStyles.scorePillText}>{score}%</Text>
          </View>
        </View>

        <View style={[cardStyles.intentBadge, { backgroundColor: (STATUS_COLORS[status] || Colors.teal) + "18" }]}>
          <Text style={[cardStyles.intentText, { color: STATUS_COLORS[status] || Colors.teal }]}>{STATUS_LABELS[status]}</Text>
        </View>

        <View style={cardStyles.tagsRow}>
          <View style={[cardStyles.tag, { backgroundColor: Colors.ocean + "18" }]}>
            <Ionicons name="location-outline" size={11} color={Colors.ocean} />
            <Text style={[cardStyles.tagText, { color: Colors.ocean }]}>{ZONE_LABELS[user.zone]}</Text>
          </View>
          <View style={[cardStyles.tag, { backgroundColor: Colors.gold + "35" }]}>
            <Ionicons name="cash-outline" size={11} color={Colors.charcoal} />
            <Text style={[cardStyles.tagText, { color: Colors.charcoal }]}>${user.budget}/mo</Text>
          </View>
          <View style={[cardStyles.tag, { backgroundColor: Colors.orange + "18" }]}>
            <Ionicons name="calendar-outline" size={11} color={Colors.orange} />
            <Text style={[cardStyles.tagText, { color: Colors.orange }]}>{LEASE_LABELS[user.leaseType]}</Text>
          </View>
        </View>

        <TrustBadge trustInfo={trustInfo} />

        {user.bio ? <Text style={cardStyles.bio}>{user.bio}</Text> : null}
      </View>
    </ScrollView>
  );
}

function ProfileCard({ user, score, listing, trustInfo }: { user: UserProfile; score: number; listing?: SubleasePost; trustInfo: TrustInfo }) {
  const status = user.housingStatus || "joiner";

  if (status === "host") return <HostCard user={user} score={score} listing={listing} trustInfo={trustInfo} />;
  if (status === "sublessor") return <SublessorCard user={user} score={score} listing={listing} trustInfo={trustInfo} />;
  if (status === "joiner") return <JoinerCard user={user} score={score} listing={listing} trustInfo={trustInfo} />;
  if (status === "sublessee") return <SublesseeCard user={user} score={score} trustInfo={trustInfo} />;
  if (status === "co_seeker") return <CoSeekerCard user={user} score={score} trustInfo={trustInfo} />;
  return <DefaultCard user={user} score={score} trustInfo={trustInfo} />;
}

const cardStyles = StyleSheet.create({
  scroll: { maxHeight: 440 },
  content: { padding: 18, gap: 10 },
  topSection: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: "Nunito_800ExtraBold", fontSize: 18, color: Colors.white },
  nameBlock: { flex: 1 },
  name: { fontFamily: "Nunito_800ExtraBold", fontSize: 18, color: Colors.charcoal },
  major: { fontFamily: "Nunito_600SemiBold", fontSize: 12, color: Colors.textMuted },
  scorePill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, alignSelf: "flex-start" },
  scorePillText: { fontFamily: "Nunito_800ExtraBold", fontSize: 12, color: Colors.white },
  intentBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, alignSelf: "flex-start" },
  intentText: { fontFamily: "Nunito_700Bold", fontSize: 12 },
  sublessorBadges: { flexDirection: "row", gap: 6 },
  shortTermBadge: { backgroundColor: Colors.ponyo + "20", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  shortTermText: { fontFamily: "Nunito_700Bold", fontSize: 12, color: Colors.ponyo },
  listingBox: {
    backgroundColor: Colors.ocean + "0C", borderRadius: 12, padding: 12, gap: 3,
    borderWidth: 1, borderColor: Colors.ocean + "20",
  },
  listingLabel: { fontFamily: "Nunito_700Bold", fontSize: 15, color: Colors.charcoal },
  listingPrice: { fontFamily: "Nunito_800ExtraBold", fontSize: 16, color: Colors.ocean },
  dateRange: { fontFamily: "Nunito_600SemiBold", fontSize: 12, color: Colors.textMuted },
  lifestyleSection: { gap: 8 },
  lifestyleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  lifestyleLabel: { fontFamily: "Nunito_600SemiBold", fontSize: 12, color: Colors.textMuted },
  dots: { flexDirection: "row", gap: 5 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  tagText: { fontFamily: "Nunito_600SemiBold", fontSize: 11 },
  bio: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.charcoal, lineHeight: 19 },
  ctaBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: Colors.ponyo, borderRadius: 12, paddingVertical: 10,
  },
  ctaText: { fontFamily: "Nunito_700Bold", fontSize: 13, color: Colors.white },
});

function SwipeableCard({
  user, score, listing, trustInfo, onLike, onPass, isTop
}: {
  user: UserProfile; score: number; listing?: SubleasePost; trustInfo: TrustInfo;
  onLike: () => void; onPass: () => void; isTop: boolean;
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
      <ProfileCard user={user} score={score} listing={listing} trustInfo={trustInfo} />
    </Animated.View>
  );
}

export default function MatchmakerScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser, mockUsers, subleases, friends, addMatch, addLiked, addPassed, likedUserIds, passedUserIds, computeScore, getTrustInfo } = useApp();

  const userStatus = currentUser?.housingStatus || "joiner";

  const filtered = mockUsers.filter(u => {
    if (!currentUser) return true;
    if (u.id === currentUser.id) return false;
    if (!matchesGenderFilter(currentUser, u)) return false;

    if (userStatus === "joiner" || userStatus === "sublessee") {
      return u.housingStatus === "host" || u.housingStatus === "sublessor";
    }
    if (userStatus === "host" || userStatus === "sublessor") {
      return u.housingStatus === "joiner" || u.housingStatus === "sublessee" || u.housingStatus === "co_seeker";
    }
    if (userStatus === "co_seeker") {
      return u.housingStatus === "co_seeker" || u.housingStatus === "joiner";
    }
    return true;
  });

  const remaining = filtered.filter(u => !likedUserIds.includes(u.id) && !passedUserIds.includes(u.id));
  const topCards = remaining.slice(0, 3);

  const getLinkedListing = (user: UserProfile): SubleasePost | undefined => {
    if (user.linkedListingId) {
      return subleases.find(s => s.id === user.linkedListingId);
    }
    return subleases.find(s => s.userId === user.id);
  };

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

  const needsListing = (userStatus === "host" || userStatus === "sublessor") && !currentUser?.linkedListingId;
  const ownListing = currentUser ? subleases.find(s => s.userId === currentUser.id) : null;
  const isBlocked = needsListing && !ownListing;

  const intentLabel = userStatus === "joiner" || userStatus === "sublessee"
    ? "Showing listings with attached hosts"
    : userStatus === "co_seeker"
      ? "Find someone to search with"
      : "People looking for your listing";

  return (
    <View style={[styles.container, { backgroundColor: Colors.sand }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.ocean} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Matchmaker</Text>
          <Text style={styles.headerSub}>{intentLabel}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.matchBadge, { backgroundColor: Colors.grassGreen + "20" }]}>
            <Text style={[styles.matchBadgeText, { color: Colors.grassGreen }]}>{likedUserIds.length}</Text>
          </View>
        </View>
      </View>

      {isBlocked ? (
        <View style={styles.blockedContainer}>
          <View style={styles.blockedCard}>
            <Ionicons name="link-outline" size={48} color={Colors.ocean} />
            <Text style={styles.blockedTitle}>Link a Listing First</Text>
            <Text style={styles.blockedSub}>
              As a {STATUS_LABELS[userStatus]}, you need to create a listing before using the Matchmaker.
            </Text>
            <TouchableOpacity style={styles.createListingBtn} onPress={() => router.push("/create-listing" as any)}>
              <Ionicons name="add" size={18} color={Colors.white} />
              <Text style={styles.createListingText}>Create Listing</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          {(userStatus === "host" || userStatus === "sublessor") && ownListing && (
            <View style={styles.listingPreview}>
              <View style={styles.listingPreviewHeader}>
                <Ionicons name="home" size={14} color={Colors.ocean} />
                <Text style={styles.listingPreviewTitle}>Your Listing</Text>
              </View>
              <View style={styles.listingPreviewBody}>
                <Text style={styles.listingPreviewName}>{ownListing.buildingName}</Text>
                <Text style={styles.listingPreviewPrice}>${ownListing.pricePerMonth}/mo</Text>
                {ownListing.roomsAvailable && (
                  <Text style={styles.listingPreviewRooms}>{ownListing.roomsAvailable} room{ownListing.roomsAvailable > 1 ? "s" : ""} available</Text>
                )}
              </View>
              {ownListing.lifestyleTags && ownListing.lifestyleTags.length > 0 && (
                <View style={styles.listingPreviewTags}>
                  {ownListing.lifestyleTags.map(tag => (
                    <View key={tag} style={styles.listingPreviewTag}>
                      <Text style={styles.listingPreviewTagText}>
                        {tag.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
          <View style={styles.deckArea}>
            {remaining.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="checkmark-circle" size={52} color={Colors.grassGreen} />
                <Text style={styles.emptyTitle}>All caught up!</Text>
                <Text style={styles.emptySub}>Check your My Circle tab to connect with people you liked.</Text>
                <TouchableOpacity style={styles.goMatchesBtn} onPress={() => router.push("/(tabs)/matches")}>
                  <Text style={styles.goMatchesBtnText}>View Matches</Text>
                </TouchableOpacity>
              </View>
            ) : (
              topCards.map((user, i) => {
                const isTop = i === 0;
                const score = currentUser ? computeScore(currentUser, user) : 75;
                const listing = getLinkedListing(user);
                const trustInfo = getTrustInfo(user.email);
                return (
                  <SwipeableCard key={user.id} user={user} score={score} listing={listing}
                    trustInfo={trustInfo} isTop={isTop}
                    onLike={() => handleLike(user)} onPass={() => handlePass(user)} />
                );
              }).reverse()
            )}
          </View>

          {remaining.length > 0 && (
            <View style={[styles.actionRow, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 16 }]}>
              <TouchableOpacity style={[styles.actionBtn, styles.passActionBtn]}
                onPress={() => handlePass(remaining[0])}>
                <Ionicons name="close" size={28} color={Colors.errorRed} />
              </TouchableOpacity>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{remaining.length} left</Text>
              </View>
              <TouchableOpacity style={[styles.actionBtn, styles.likeActionBtn]}
                onPress={() => handleLike(remaining[0])}>
                <Ionicons name="heart" size={26} color={Colors.grassGreen} />
              </TouchableOpacity>
            </View>
          )}
        </>
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
  swipeLabel: {
    position: "absolute", top: 18, flexDirection: "row", alignItems: "center",
    gap: 5, zIndex: 20, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 10, borderWidth: 2,
  },
  swipeLike: { right: 18, borderColor: Colors.grassGreen, backgroundColor: Colors.grassGreen + "20" },
  swipePass: { left: 18, borderColor: Colors.errorRed, backgroundColor: Colors.errorRed + "20" },
  swipeLabelText: { fontFamily: "Nunito_800ExtraBold", fontSize: 14 },
  actionRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 24, paddingHorizontal: 40, paddingTop: 16,
  },
  actionBtn: {
    width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.cardBg, borderWidth: 2,
    shadowColor: Colors.charcoal, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  passActionBtn: { borderColor: Colors.errorRed + "60" },
  likeActionBtn: { borderColor: Colors.grassGreen + "60" },
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
  blockedContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  blockedCard: {
    width: "100%", backgroundColor: Colors.cardBg, borderRadius: 22,
    borderWidth: 1.5, borderColor: Colors.borderSoft, padding: 32,
    alignItems: "center", gap: 12,
  },
  blockedTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 20, color: Colors.charcoal },
  blockedSub: { fontFamily: "Nunito_400Regular", fontSize: 14, color: Colors.textMuted, textAlign: "center", lineHeight: 20 },
  createListingBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: Colors.ocean, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 14, marginTop: 8,
  },
  createListingText: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.white },
  listingPreview: {
    marginHorizontal: 16, marginBottom: 8, backgroundColor: Colors.cardBg,
    borderRadius: 16, borderWidth: 1.5, borderColor: Colors.ocean + "30",
    padding: 14, gap: 6,
  },
  listingPreviewHeader: {
    flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2,
  },
  listingPreviewTitle: { fontFamily: "Nunito_700Bold", fontSize: 12, color: Colors.ocean },
  listingPreviewBody: {
    flexDirection: "row", alignItems: "baseline", gap: 10, flexWrap: "wrap",
  },
  listingPreviewName: { fontFamily: "Nunito_800ExtraBold", fontSize: 15, color: Colors.charcoal },
  listingPreviewPrice: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.ocean },
  listingPreviewRooms: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted },
  listingPreviewTags: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 },
  listingPreviewTag: {
    backgroundColor: Colors.teal + "18", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
  },
  listingPreviewTagText: { fontFamily: "Nunito_600SemiBold", fontSize: 11, color: Colors.teal },
});
