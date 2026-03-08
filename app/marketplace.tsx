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

function SubleaseCard({ post, onMarkLeased }: {
  post: SubleasePost;
  onMarkLeased: (post: SubleasePost) => void;
}) {
  const { getTrustInfo, currentUser } = useApp();
  const trust = getTrustInfo(post.userEmail);
  const initials = post.userName.split(" ").map(n => n[0]).join("").slice(0, 2);
  const cat = post.category || "semester_takeover";
  const catColor = CATEGORY_COLORS[cat] || Colors.ocean;
  const isOwner = currentUser?.email === post.userEmail;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        {cat !== "semester_takeover" && (
          <View style={[styles.catTag, { backgroundColor: catColor + "18", borderColor: catColor + "40" }]}>
            <Ionicons name={CATEGORY_ICONS[cat] || "home-outline"} size={11} color={catColor} />
            <Text style={[styles.catTagText, { color: catColor }]}>{CATEGORY_LABELS[cat] ?? cat}</Text>
          </View>
        )}
        {cat === "semester_takeover" && (
          <View style={[styles.catTag, { backgroundColor: Colors.grassGreen + "18", borderColor: Colors.grassGreen + "40" }]}>
            <Text style={[styles.catTagText, { color: Colors.grassGreen }]}>{LEASE_LABELS[post.leaseType]}</Text>
          </View>
        )}
        {post.availableDuringBreaks && (
          <View style={styles.breakAvailTag}>
            <Ionicons name="home" size={10} color={Colors.grassGreen} />
            <Text style={styles.breakAvailText}>Break-Friendly</Text>
          </View>
        )}
        {isOwner && (
          <View style={styles.ownerTag}>
            <Ionicons name="person" size={10} color={Colors.ocean} />
            <Text style={styles.ownerTagText}>Your Post</Text>
          </View>
        )}
        <Text style={styles.cardTime}>
          {Math.floor((Date.now() - post.timestamp) / 86400000)}d ago
        </Text>
      </View>

      <Text style={styles.buildingName}>{post.buildingName}</Text>
      <Text style={styles.address}>{post.address}</Text>

      <View style={styles.priceRow}>
        <Text style={styles.price}>${post.pricePerMonth}</Text>
        <Text style={styles.priceSub}>/month</Text>
        {cat === "august_gap" || cat === "short_term" ? (
          <View style={[styles.dateBadge, { backgroundColor: catColor + "15" }]}>
            <Text style={[styles.dateBadgeText, { color: catColor }]}>
              {CATEGORY_DATES[cat]}
            </Text>
          </View>
        ) : null}
      </View>

      {post.description ? (
        <Text style={styles.description} numberOfLines={2}>{post.description}</Text>
      ) : null}

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
          <Text style={styles.metaText}>{ZONE_LABELS[post.zone]}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="business-outline" size={12} color={Colors.textMuted} />
          <Text style={styles.metaText}>{LANDLORD_LABELS[post.landlord]}</Text>
        </View>
      </View>

      <View style={styles.posterRow}>
        <View style={[styles.posterAvatar, { backgroundColor: post.avatarColor }]}>
          <Text style={styles.posterInitials}>{initials}</Text>
        </View>
        <View style={styles.posterInfo}>
          <Text style={styles.posterName}>{post.userName}</Text>
          <Text style={styles.posterEmail}>{post.userEmail}</Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          {trust.degree === 1 && (
            <View style={[styles.trustChip, { backgroundColor: Colors.grassGreen + "20" }]}>
              <Ionicons name="people" size={10} color={Colors.grassGreen} />
              <Text style={[styles.trustChipText, { color: Colors.grassGreen }]}>1st Degree</Text>
            </View>
          )}
          {trust.degree === 2 && trust.mutualFriends.length > 0 ? (
            <FacePile mutuals={trust.mutualFriends} maxVisible={3} />
          ) : trust.sharedOrg && !trust.degree ? (
            <View style={[styles.trustChip, { backgroundColor: Colors.goldDark + "20" }]}>
              <Ionicons name="school-outline" size={10} color={Colors.goldDark} />
              <Text style={[styles.trustChipText, { color: Colors.goldDark }]}>{trust.sharedOrg}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {isOwner && (
        <TouchableOpacity
          style={styles.leasedBtn}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); onMarkLeased(post); }}
        >
          <Ionicons name="checkmark-circle" size={16} color={Colors.white} />
          <Text style={styles.leasedBtnText}>Mark as Leased</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function MarketplaceScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ category?: string; zone?: string }>();
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

  const zoneFiltered = params.zone
    ? subleases.filter(s => s.zone === params.zone)
    : subleases;

  const filtered = activeFilter === "all"
    ? zoneFiltered
    : zoneFiltered.filter(s => (s.category || "semester_takeover") === activeFilter);

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
            <SubleaseCard key={post.id} post={post} onMarkLeased={handleMarkLeased} />
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
    backgroundColor: Colors.cardBg, borderRadius: 18, borderWidth: 1.5, borderColor: Colors.borderSoft,
    padding: 16, gap: 10,
    shadowColor: Colors.charcoal, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 7, flexWrap: "wrap" },
  catTag: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, borderWidth: 1,
  },
  catTagText: { fontFamily: "Nunito_700Bold", fontSize: 10 },
  breakAvailTag: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    backgroundColor: Colors.grassGreen + "20",
  },
  breakAvailText: { fontFamily: "Nunito_600SemiBold", fontSize: 10, color: Colors.grassGreen },
  ownerTag: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    backgroundColor: Colors.ocean + "15",
  },
  ownerTagText: { fontFamily: "Nunito_600SemiBold", fontSize: 10, color: Colors.ocean },
  cardTime: { fontFamily: "Nunito_400Regular", fontSize: 11, color: Colors.textLight, marginLeft: "auto" },
  buildingName: { fontFamily: "Nunito_800ExtraBold", fontSize: 20, color: Colors.charcoal },
  address: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted, marginTop: -4 },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 2 },
  price: { fontFamily: "Nunito_800ExtraBold", fontSize: 26, color: Colors.ocean },
  priceSub: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textMuted },
  dateBadge: {
    marginLeft: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, alignSelf: "center",
  },
  dateBadgeText: { fontFamily: "Nunito_600SemiBold", fontSize: 11 },
  description: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.charcoal, lineHeight: 19 },
  metaRow: { flexDirection: "row", gap: 16 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontFamily: "Nunito_600SemiBold", fontSize: 12, color: Colors.textMuted },
  posterRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.borderSoft,
  },
  posterAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  posterInitials: { fontFamily: "Nunito_700Bold", fontSize: 12, color: Colors.white },
  posterInfo: { flex: 1 },
  posterName: { fontFamily: "Nunito_700Bold", fontSize: 13, color: Colors.charcoal },
  posterEmail: { fontFamily: "Nunito_400Regular", fontSize: 11, color: Colors.textMuted },
  trustChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8,
  },
  trustChipText: { fontFamily: "Nunito_700Bold", fontSize: 10 },
  leasedBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.ponyo, borderRadius: 12, paddingVertical: 12, marginTop: 2,
  },
  leasedBtnText: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.white },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTitle: { fontFamily: "Nunito_700Bold", fontSize: 20, color: Colors.charcoal },
  emptySub: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textMuted, textAlign: "center", paddingHorizontal: 20 },
  postFirstBtn: { backgroundColor: Colors.orange, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, marginTop: 8 },
  postFirstBtnText: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.white },
});
