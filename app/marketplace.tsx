import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useApp, SubleasePost, Landlord } from "@/context/AppContext";

const CATEGORY_LABELS: Record<string, string> = {
  all: "All",
  summer_only: "Summer Only",
  august_gap: "August Gap",
  semester_takeover: "Semester / Full Year",
  short_term: "Short-Term",
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
  fall_sublease: "Fall",
  spring_sublease: "Spring",
  summer_sublease: "Summer",
};

type CategoryFilter = "all" | "summer_only" | "august_gap" | "semester_takeover" | "short_term";

function TrustLine({ userEmail }: { userEmail: string }) {
  const { getTrustInfo } = useApp();
  const trust = getTrustInfo(userEmail);

  const parts: string[] = [];
  if (trust.isFriend) parts.push("Friend");
  if (trust.mutualFriendNames.length > 0) {
    const names = trust.mutualFriendNames.slice(0, 2).join(", ");
    const extra = trust.mutualFriendNames.length > 2 ? ` +${trust.mutualFriendNames.length - 2}` : "";
    parts.push(`${trust.mutualFriendNames.length} mutual: ${names}${extra}`);
  }
  if (trust.vouchedByFriend) parts.push(`Vouched by ${trust.vouchedByFriend}`);
  if (trust.sharedOrg && !trust.isFriend) parts.push(`Both in ${trust.sharedOrg}`);

  if (parts.length === 0) return null;

  const color = trust.isFriend ? Colors.grassGreen : trust.mutualFriendNames.length > 0 ? Colors.ocean : Colors.goldDark;
  const icon: keyof typeof Ionicons.glyphMap = trust.isFriend ? "people" : trust.mutualFriendNames.length > 0 ? "person-add" : "star";

  return (
    <View style={trust_styles.row}>
      <Ionicons name={icon} size={11} color={color} />
      <Text style={[trust_styles.text, { color }]}>{parts.join(" · ")}</Text>
    </View>
  );
}

const trust_styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  text: { fontFamily: "Nunito_600SemiBold", fontSize: 11, flex: 1 },
});

function SubleaseCard({ post }: { post: SubleasePost }) {
  const cat = post.category || "semester_takeover";
  const catColor = CATEGORY_COLORS[cat] || Colors.ocean;
  const initials = post.userName.split(" ").map(n => n[0]).join("").slice(0, 2);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.catTag, { backgroundColor: catColor + "18", borderColor: catColor + "40" }]}>
          <Ionicons name={CATEGORY_ICONS[cat] || "home-outline"} size={11} color={catColor} />
          <Text style={[styles.catTagText, { color: catColor }]}>
            {cat === "semester_takeover" ? LEASE_LABELS[post.leaseType] : CATEGORY_LABELS[cat]}
          </Text>
        </View>
        {post.availableDuringBreaks && (
          <View style={styles.breakTag}>
            <Ionicons name="home" size={10} color={Colors.grassGreen} />
            <Text style={styles.breakTagText}>Break OK</Text>
          </View>
        )}
      </View>

      <Text style={styles.buildingName}>{post.buildingName}</Text>
      {post.address ? <Text style={styles.address}>{post.address}</Text> : null}

      <View style={styles.priceRow}>
        <Text style={styles.price}>${post.pricePerMonth}</Text>
        <Text style={styles.priceSub}>/mo</Text>
        {(post.moveInDate && post.moveOutDate) ? (
          <View style={styles.dateBadge}>
            <Ionicons name="calendar-outline" size={11} color={Colors.textMuted} />
            <Text style={styles.dateBadgeText}>{post.moveInDate} → {post.moveOutDate}</Text>
          </View>
        ) : null}
      </View>

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
          <TrustLine userEmail={post.userEmail} />
        </View>
      </View>
    </View>
  );
}

export default function MarketplaceScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ category?: string }>();
  const { subleases } = useApp();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const [activeFilter, setActiveFilter] = useState<CategoryFilter>("all");

  useEffect(() => {
    if (params.category && Object.keys(CATEGORY_LABELS).includes(params.category)) {
      setActiveFilter(params.category as CategoryFilter);
    }
  }, [params.category]);

  const filtered = activeFilter === "all"
    ? subleases
    : subleases.filter(s => (s.category || "semester_takeover") === activeFilter);

  const headerCatColor = activeFilter !== "all" ? CATEGORY_COLORS[activeFilter] : Colors.ocean;

  return (
    <View style={[styles.container, { backgroundColor: Colors.sand }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.ocean} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {activeFilter === "all" ? "Marketplace" : CATEGORY_LABELS[activeFilter]}
          </Text>
          <Text style={styles.headerSub}>{filtered.length} listing{filtered.length !== 1 ? "s" : ""}</Text>
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
              style={[styles.filterChip, isActive && { backgroundColor: chipColor, borderColor: chipColor }]}
              onPress={() => { setActiveFilter(key); Haptics.selectionAsync(); }}
            >
              <Ionicons name={CATEGORY_ICONS[key]} size={12} color={isActive ? Colors.white : Colors.textMuted} />
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
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
            <TouchableOpacity style={styles.postFirstBtn} onPress={() => router.push("/post-sublease")}>
              <Text style={styles.postFirstBtnText}>Post a sublease</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filtered.map(post => <SubleaseCard key={post.id} post={post} />)
        )}
      </ScrollView>
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
    padding: 16, gap: 9,
    shadowColor: Colors.charcoal, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 7 },
  catTag: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, borderWidth: 1,
  },
  catTagText: { fontFamily: "Nunito_700Bold", fontSize: 10 },
  breakTag: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    backgroundColor: Colors.grassGreen + "20",
  },
  breakTagText: { fontFamily: "Nunito_600SemiBold", fontSize: 10, color: Colors.grassGreen },
  buildingName: { fontFamily: "Nunito_800ExtraBold", fontSize: 20, color: Colors.charcoal },
  address: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted, marginTop: -4 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
  price: { fontFamily: "Nunito_800ExtraBold", fontSize: 26, color: Colors.ocean },
  priceSub: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textMuted },
  dateBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    marginLeft: 6, backgroundColor: Colors.sandDark,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  dateBadgeText: { fontFamily: "Nunito_600SemiBold", fontSize: 11, color: Colors.textMuted },
  metaRow: { flexDirection: "row", gap: 16 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontFamily: "Nunito_600SemiBold", fontSize: 12, color: Colors.textMuted },
  posterRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.borderSoft,
  },
  posterAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  posterInitials: { fontFamily: "Nunito_700Bold", fontSize: 11, color: Colors.white },
  posterInfo: { flex: 1 },
  posterName: { fontFamily: "Nunito_700Bold", fontSize: 13, color: Colors.charcoal },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyTitle: { fontFamily: "Nunito_700Bold", fontSize: 18, color: Colors.charcoal },
  postFirstBtn: { backgroundColor: Colors.orange, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 },
  postFirstBtnText: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.white },
});
