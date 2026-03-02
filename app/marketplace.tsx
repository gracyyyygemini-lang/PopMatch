import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Modal, Animated
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useApp, SubleasePost, Landlord } from "@/context/AppContext";
import FacePile from "@/components/FacePile";
import MicroFeedback from "@/components/MicroFeedback";
import { getApiUrl } from "@/lib/query-client";
import { formatDateRange } from "@/components/DateTimePicker";

const CATEGORY_LABELS: Record<string, string> = {
  all: "All",
  summer_only: "Summer Only",
  august_gap: "August Gap",
  semester_takeover: "Semester / Full Year",
  short_term: "Short-Term & Events",
};

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  all: "apps-outline",
  summer_only: "sunny-outline",
  august_gap: "time-outline",
  semester_takeover: "calendar-outline",
  short_term: "ticket-outline",
};

const CATEGORY_COLORS: Record<string, string> = {
  all: Colors.ocean,
  summer_only: Colors.orange,
  august_gap: Colors.ocean,
  semester_takeover: Colors.grassGreen,
  short_term: Colors.goldDark,
};

const CATEGORY_DATES: Record<string, string> = {
  summer_only: "May 15 – Aug 10",
  august_gap: "1–2 weeks in Aug",
  semester_takeover: "Aug–Dec, Jan–May, or Full Year",
  short_term: "1–14 days",
};

const ZONE_LABELS: Record<string, string> = {
  campustown: "Campustown",
  north: "North Campus",
  south: "South Campus",
  urbana: "Urbana",
  downtown: "Downtown",
};

const LANDLORD_LABELS: Record<Landlord, string> = {
  jsm: "JSM",
  ugroup: "UGroup",
  bailey: "Bailey",
  american: "American Campus",
  smile: "Smile",
  other: "Private",
};

const LEASE_LABELS: Record<string, string> = {
  full_year: "Full Year",
  fall_sublease: "Fall Sublease",
  spring_sublease: "Spring Sublease",
  summer_sublease: "Summer Sublease",
};

type CategoryFilter = "all" | "summer_only" | "august_gap" | "semester_takeover" | "short_term";

function CongratsSheet({ visible, onDone }: { visible: boolean; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const waveScale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      waveScale.setValue(0.7);
      opacity.setValue(0);
      Animated.parallel([
        Animated.spring(waveScale, { toValue: 1, tension: 60, friction: 10, useNativeDriver: false }),
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: false }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onDone}>
      <View style={cg.overlay}>
        <Animated.View style={[cg.sheet, { opacity, paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16) }]}>
          <View style={cg.handle} />
          <Animated.View style={[cg.waveCircle, { transform: [{ scale: waveScale }] }]} />
          <Text style={cg.emoji}>🏠</Text>
          <Text style={cg.title}>Your place found a home!</Text>
          <Text style={cg.sub}>Congrats on the successful sublease!</Text>
          <TouchableOpacity style={cg.btn} onPress={onDone}>
            <Text style={cg.btnText}>Done</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const cg = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: Colors.cardBg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 16, alignItems: "center", gap: 10,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.borderSoft,
    marginBottom: 12,
  },
  waveCircle: {
    position: "absolute", top: 40, width: 120, height: 120, borderRadius: 60,
    backgroundColor: Colors.ocean + "20",
  },
  emoji: { fontSize: 56, marginVertical: 8 },
  title: { fontFamily: "Nunito_800ExtraBold", fontSize: 24, color: Colors.ocean, textAlign: "center" },
  sub: { fontFamily: "Nunito_400Regular", fontSize: 14, color: Colors.textMuted, textAlign: "center" },
  btn: {
    backgroundColor: Colors.ocean, borderRadius: 14, paddingVertical: 14,
    paddingHorizontal: 40, marginTop: 12,
  },
  btnText: { fontFamily: "Nunito_700Bold", fontSize: 16, color: Colors.white },
});

function SubleaseCard({ post, onMarkLeased, onMessage }: {
  post: SubleasePost;
  onMarkLeased: (post: SubleasePost) => void;
  onMessage: (post: SubleasePost) => void;
}) {
  const { getTrustInfo, currentUser } = useApp();
  const trust = getTrustInfo(post.userEmail);
  const initials = post.userName.split(" ").map(n => n[0]).join("").slice(0, 2);
  const buildingInitial = post.buildingName[0]?.toUpperCase() ?? "?";
  const cat = post.category || "semester_takeover";
  const catColor = CATEGORY_COLORS[cat] || Colors.ocean;
  const isOwner = currentUser?.email === post.userEmail;
  const daysAgo = Math.floor((Date.now() - post.timestamp) / 86400000);

  const chipLabel = cat === "semester_takeover"
    ? LEASE_LABELS[post.leaseType]
    : CATEGORY_LABELS[cat];

  return (
    <View style={styles.card}>
      {/* ── Hero Image Block ── */}
      <View style={[styles.hero, { backgroundColor: catColor }]}>
        <View style={styles.heroOverlay} />

        {/* Top-left: category chip */}
        <View style={[styles.heroCatChip, { backgroundColor: "rgba(0,0,0,0.32)" }]}>
          <Ionicons name={CATEGORY_ICONS[cat] || "home-outline"} size={11} color="#fff" />
          <Text style={styles.heroCatText}>{chipLabel}</Text>
        </View>

        {/* Top-right: time + owner */}
        <View style={styles.heroTopRight}>
          {isOwner && (
            <View style={styles.heroOwnerBadge}>
              <Ionicons name="person" size={10} color={catColor} />
              <Text style={[styles.heroOwnerText, { color: catColor }]}>Your Post</Text>
            </View>
          )}
          <Text style={styles.heroTime}>{daysAgo === 0 ? "Today" : `${daysAgo}d ago`}</Text>
        </View>

        {/* Center: building initial */}
        <Text style={styles.heroBuildingInitial}>{buildingInitial}</Text>

        {/* Bottom overlay: price */}
        <View style={styles.heroPriceBar}>
          <Text style={styles.heroPrice}>${post.pricePerMonth.toLocaleString()}</Text>
          <Text style={styles.heroPriceSub}>/mo</Text>
          {post.availableDuringBreaks && (
            <View style={styles.heroBreakBadge}>
              <Ionicons name="home" size={10} color={Colors.grassGreen} />
              <Text style={styles.heroBreakText}>Break-Friendly</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Card Body ── */}
      <View style={styles.cardBody}>
        <Text style={styles.buildingName} numberOfLines={1}>
          {post.buildingName}{post.floorPlan ? ` — ${post.floorPlan}` : ""}
        </Text>
        {(post.moveInAt || post.moveOutAt) ? (
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={13} color={Colors.charcoal} />
            <Text style={styles.dateText}>{formatDateRange(post.moveInAt, post.moveOutAt)}</Text>
          </View>
        ) : null}

        {/* 3 icon chips */}
        <View style={styles.chipRow}>
          <View style={styles.iconChip}>
            <Ionicons name="location-outline" size={13} color={Colors.ocean} />
            <Text style={styles.iconChipText}>{ZONE_LABELS[post.zone]}</Text>
          </View>
          <View style={styles.chipDivider} />
          <View style={styles.iconChip}>
            <Ionicons name="business-outline" size={13} color={Colors.ocean} />
            <Text style={styles.iconChipText}>{LANDLORD_LABELS[post.landlord]}</Text>
          </View>
          {cat === "august_gap" || cat === "short_term" ? (
            <>
              <View style={styles.chipDivider} />
              <View style={styles.iconChip}>
                <Ionicons name="calendar-outline" size={13} color={Colors.ocean} />
                <Text style={styles.iconChipText}>{CATEGORY_DATES[cat]}</Text>
              </View>
            </>
          ) : null}
        </View>

        {post.description ? (
          <Text style={styles.description} numberOfLines={2}>{post.description}</Text>
        ) : null}

        {/* Poster + trust + action */}
        <View style={styles.posterRow}>
          <View style={[styles.posterAvatar, { backgroundColor: post.avatarColor }]}>
            <Text style={styles.posterInitials}>{initials}</Text>
          </View>
          <View style={styles.posterInfo}>
            <Text style={styles.posterName}>{post.userName}</Text>
            {trust.degree === 1 ? (
              <View style={styles.trustChipInline}>
                <Ionicons name="people" size={10} color={Colors.grassGreen} />
                <Text style={[styles.trustInlineText, { color: Colors.grassGreen }]}>1st Degree</Text>
              </View>
            ) : trust.degree === 2 && trust.mutualFriends.length > 0 ? (
              <FacePile mutuals={trust.mutualFriends} maxVisible={3} />
            ) : trust.sharedOrg ? (
              <View style={styles.trustChipInline}>
                <Ionicons name="school-outline" size={10} color={Colors.goldDark} />
                <Text style={[styles.trustInlineText, { color: Colors.goldDark }]}>{trust.sharedOrg}</Text>
              </View>
            ) : null}
          </View>

          {!isOwner ? (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: Colors.ocean }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onMessage(post); }}
            >
              <Ionicons name="chatbubble" size={14} color={Colors.white} />
              <Text style={styles.actionBtnText}>Message</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: Colors.ponyo }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); onMarkLeased(post); }}
            >
              <Ionicons name="checkmark-circle" size={14} color={Colors.white} />
              <Text style={styles.actionBtnText}>Leased</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

export default function MarketplaceScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ category?: string }>();
  const { subleases, removeSublease, currentUser } = useApp();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const [activeFilter, setActiveFilter] = useState<CategoryFilter>("all");
  const [showCongrats, setShowCongrats] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [leasedPost, setLeasedPost] = useState<SubleasePost | null>(null);

  useEffect(() => {
    if (params.category && Object.keys(CATEGORY_LABELS).includes(params.category)) {
      setActiveFilter(params.category as CategoryFilter);
    }
  }, [params.category]);

  const filtered = activeFilter === "all"
    ? subleases
    : subleases.filter(s => (s.category || "semester_takeover") === activeFilter);

  const headerCatColor = activeFilter !== "all" ? CATEGORY_COLORS[activeFilter] : Colors.ocean;

  const handleMarkLeased = async (post: SubleasePost) => {
    setLeasedPost(post);
    await removeSublease(post.id);
    try {
      const delUrl = new URL(`/api/listings/${post.id}`, getApiUrl()).toString();
      await fetch(delUrl, { method: "DELETE" });
      const incUrl = new URL("/api/stats/increment", getApiUrl()).toString();
      await fetch(incUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "successful_subleases" }),
      });
    } catch {}
    setShowCongrats(true);
  };

  const handleCongratsClose = () => {
    setShowCongrats(false);
    setTimeout(() => setShowFeedback(true), 400);
  };

  const handleMessage = async (post: SubleasePost) => {
    if (!currentUser) return;
    try {
      const url = new URL("/api/conversations/find-or-create", getApiUrl()).toString();
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails: [currentUser.email, post.userEmail],
          type: "sublease",
          listingId: post.id,
          listingTitle: post.buildingName,
        }),
      });
      if (res.ok) {
        const { conversationId } = await res.json();
        router.push({
          pathname: "/chat/[id]",
          params: {
            id: conversationId,
            otherEmail: post.userEmail,
            otherName: post.userName,
            listingTitle: post.buildingName,
          },
        });
      }
    } catch {}
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors.sand }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.ocean} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {activeFilter === "all" ? "Sublease Marketplace" : CATEGORY_LABELS[activeFilter]}
          </Text>
          <Text style={styles.headerSub}>
            {filtered.length} listing{filtered.length !== 1 ? "s" : ""}
            {activeFilter !== "all" && CATEGORY_DATES[activeFilter] ? ` · ${CATEGORY_DATES[activeFilter]}` : ""}
          </Text>
        </View>
        <TouchableOpacity style={[styles.postBtn, { backgroundColor: headerCatColor }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/post-sublease"); }}>
          <Ionicons name="add" size={20} color={Colors.white} />
          <Text style={styles.postBtnText}>Post</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {(Object.keys(CATEGORY_LABELS) as CategoryFilter[]).map(key => {
          const isActive = activeFilter === key;
          const chipColor = CATEGORY_COLORS[key];
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.filterChip,
                isActive && { backgroundColor: chipColor, borderColor: chipColor }
              ]}
              onPress={() => { setActiveFilter(key); Haptics.selectionAsync(); }}
            >
              <Ionicons
                name={CATEGORY_ICONS[key]}
                size={12}
                color={isActive ? Colors.white : Colors.textMuted}
              />
              <Text style={[
                styles.filterChipText,
                isActive && styles.filterChipTextActive
              ]}>
                {CATEGORY_LABELS[key]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, {
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 20
        }]}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="storefront-outline" size={44} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>No listings yet</Text>
            <Text style={styles.emptySub}>
              {activeFilter !== "all"
                ? `No ${CATEGORY_LABELS[activeFilter]} listings posted yet.`
                : "Be the first to post a sublease!"}
            </Text>
            <TouchableOpacity style={styles.postFirstBtn} onPress={() => router.push("/post-sublease")}>
              <Text style={styles.postFirstBtnText}>Post a Sublease</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filtered.map(post => (
            <SubleaseCard key={post.id} post={post} onMarkLeased={handleMarkLeased} onMessage={handleMessage} />
          ))
        )}
      </ScrollView>

      <CongratsSheet visible={showCongrats} onDone={handleCongratsClose} />

      <MicroFeedback
        visible={showFeedback}
        userEmail={currentUser?.email ?? ""}
        onClose={() => setShowFeedback(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.sand },
  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 8, gap: 10,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.cardBg,
    alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: Colors.borderSoft,
  },
  headerCenter: { flex: 1 },
  headerTitle: { fontFamily: "Nunito_700Bold", fontSize: 17, color: Colors.ocean },
  headerSub: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted },
  postBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
  },
  postBtnText: { fontFamily: "Nunito_700Bold", fontSize: 13, color: Colors.white },
  filterScroll: { maxHeight: 52 },
  filterRow: { paddingHorizontal: 16, gap: 8, paddingVertical: 8, alignItems: "center" },
  filterChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: Colors.cardBg, borderWidth: 1.5, borderColor: Colors.borderSoft,
  },
  filterChipText: { fontFamily: "Nunito_600SemiBold", fontSize: 12, color: Colors.textMuted },
  filterChipTextActive: { color: Colors.white },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },
  card: {
    backgroundColor: Colors.cardBg, borderRadius: 20, overflow: "hidden",
    shadowColor: Colors.charcoal, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10, shadowRadius: 12, elevation: 4,
  },

  // Hero block
  hero: {
    height: 155, justifyContent: "center", alignItems: "center",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  heroCatChip: {
    position: "absolute", top: 12, left: 12,
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  heroCatText: { fontFamily: "Nunito_700Bold", fontSize: 11, color: "#fff" },
  heroTopRight: {
    position: "absolute", top: 10, right: 12,
    flexDirection: "row", alignItems: "center", gap: 6,
  },
  heroOwnerBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4,
  },
  heroOwnerText: { fontFamily: "Nunito_700Bold", fontSize: 10 },
  heroTime: { fontFamily: "Nunito_600SemiBold", fontSize: 11, color: "rgba(255,255,255,0.85)" },
  heroBuildingInitial: {
    fontFamily: "Nunito_800ExtraBold", fontSize: 52, color: "rgba(255,255,255,0.35)",
  },
  heroPriceBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: "rgba(0,0,0,0.40)",
  },
  heroPrice: { fontFamily: "Nunito_800ExtraBold", fontSize: 26, color: "#fff" },
  heroPriceSub: { fontFamily: "Nunito_400Regular", fontSize: 13, color: "rgba(255,255,255,0.80)", marginTop: 2 },
  heroBreakBadge: {
    flexDirection: "row", alignItems: "center", gap: 4, marginLeft: "auto" as any,
    backgroundColor: Colors.grassGreen + "CC", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
  },
  heroBreakText: { fontFamily: "Nunito_700Bold", fontSize: 10, color: "#fff" },

  // Card body
  cardBody: { padding: 14, gap: 10 },
  buildingName: { fontFamily: "Nunito_800ExtraBold", fontSize: 16, color: Colors.charcoal },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 1 },
  dateText: {
    fontFamily: "Nunito_600SemiBold", fontSize: 12, color: Colors.charcoal,
  },
  chipRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.sand + "80",
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
  },
  iconChip: { flexDirection: "row", alignItems: "center", gap: 5, flex: 1 },
  iconChipText: { fontFamily: "Nunito_600SemiBold", fontSize: 11, color: Colors.charcoal },
  chipDivider: { width: 1, height: 14, backgroundColor: Colors.borderSoft, marginHorizontal: 4 },
  description: {
    fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textMuted, lineHeight: 19,
  },
  posterRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  posterAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  posterInitials: { fontFamily: "Nunito_700Bold", fontSize: 12, color: Colors.white },
  posterInfo: { flex: 1, gap: 2 },
  posterName: { fontFamily: "Nunito_700Bold", fontSize: 13, color: Colors.charcoal },
  trustChipInline: { flexDirection: "row", alignItems: "center", gap: 4 },
  trustInlineText: { fontFamily: "Nunito_600SemiBold", fontSize: 10 },
  actionBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  actionBtnText: { fontFamily: "Nunito_700Bold", fontSize: 12, color: Colors.white },

  emptyState: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTitle: { fontFamily: "Nunito_700Bold", fontSize: 20, color: Colors.charcoal },
  emptySub: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textMuted, textAlign: "center", paddingHorizontal: 20 },
  postFirstBtn: { backgroundColor: Colors.orange, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, marginTop: 8 },
  postFirstBtnText: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.white },
});
