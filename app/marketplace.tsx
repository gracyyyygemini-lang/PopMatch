import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useApp, SubleasePost, LeaseType, Landlord } from "@/context/AppContext";

const LEASE_LABELS: Record<string, string> = {
  full_year: "Full Year",
  fall_sublease: "Fall Sublease",
  spring_sublease: "Spring Sublease",
  summer_sublease: "Summer Sublease",
};

const LEASE_COLORS: Record<string, string> = {
  full_year: Colors.ocean,
  fall_sublease: Colors.orange,
  spring_sublease: Colors.grassGreen,
  summer_sublease: Colors.goldDark,
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

const FILTERS: { key: LeaseType | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "fall_sublease", label: "Fall" },
  { key: "spring_sublease", label: "Spring" },
  { key: "summer_sublease", label: "Summer" },
  { key: "full_year", label: "Full Year" },
];

function SubleaseCard({ post }: { post: SubleasePost }) {
  const leaseColor = LEASE_COLORS[post.leaseType];
  const initials = post.userName.split(" ").map(n => n[0]).join("").slice(0, 2);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.leaseTag, { backgroundColor: leaseColor + "20", borderColor: leaseColor + "50" }]}>
          <Text style={[styles.leaseTagText, { color: leaseColor }]}>{LEASE_LABELS[post.leaseType]}</Text>
        </View>
        {post.availableDuringBreaks && (
          <View style={styles.breakAvailTag}>
            <Ionicons name="home" size={10} color={Colors.grassGreen} />
            <Text style={styles.breakAvailText}>Break-Friendly</Text>
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
        <View>
          <Text style={styles.posterName}>{post.userName}</Text>
          <Text style={styles.posterEmail}>{post.userEmail}</Text>
        </View>
      </View>
    </View>
  );
}

export default function MarketplaceScreen() {
  const insets = useSafeAreaInsets();
  const { subleases } = useApp();
  const [activeFilter, setActiveFilter] = useState<LeaseType | "all">("all");
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const filtered = activeFilter === "all"
    ? subleases
    : subleases.filter(s => s.leaseType === activeFilter);

  return (
    <View style={[styles.container, { backgroundColor: Colors.sand }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.ocean} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Sublease Marketplace</Text>
          <Text style={styles.headerSub}>{filtered.length} listing{filtered.length !== 1 ? "s" : ""}</Text>
        </View>
        <TouchableOpacity style={styles.postBtn}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/post-sublease"); }}>
          <Ionicons name="add" size={20} color={Colors.white} />
          <Text style={styles.postBtnText}>Post</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f.key} style={[styles.filterChip, activeFilter === f.key && styles.filterChipActive]}
            onPress={() => { setActiveFilter(f.key); Haptics.selectionAsync(); }}>
            <Text style={[styles.filterChipText, activeFilter === f.key && styles.filterChipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, {
        paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 20
      }]} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="storefront-outline" size={44} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>No listings yet</Text>
            <Text style={styles.emptySub}>Be the first to post a sublease!</Text>
            <TouchableOpacity style={styles.postFirstBtn} onPress={() => router.push("/post-sublease")}>
              <Text style={styles.postFirstBtnText}>Post a Sublease</Text>
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
    backgroundColor: Colors.orange, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  postBtnText: { fontFamily: "Nunito_700Bold", fontSize: 13, color: Colors.white },
  filterScroll: { maxHeight: 50 },
  filterRow: { paddingHorizontal: 16, gap: 8, paddingVertical: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: Colors.cardBg, borderWidth: 1.5, borderColor: Colors.borderSoft,
  },
  filterChipActive: { backgroundColor: Colors.ocean, borderColor: Colors.ocean },
  filterChipText: { fontFamily: "Nunito_600SemiBold", fontSize: 13, color: Colors.textMuted },
  filterChipTextActive: { color: Colors.white },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },
  card: {
    backgroundColor: Colors.cardBg, borderRadius: 18, borderWidth: 1.5, borderColor: Colors.borderSoft,
    padding: 16, gap: 10,
    shadowColor: Colors.charcoal, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  leaseTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  leaseTagText: { fontFamily: "Nunito_700Bold", fontSize: 11 },
  breakAvailTag: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    backgroundColor: Colors.grassGreen + "20",
  },
  breakAvailText: { fontFamily: "Nunito_600SemiBold", fontSize: 10, color: Colors.grassGreen },
  cardTime: { fontFamily: "Nunito_400Regular", fontSize: 11, color: Colors.textLight, marginLeft: "auto" },
  buildingName: { fontFamily: "Nunito_800ExtraBold", fontSize: 20, color: Colors.charcoal },
  address: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted, marginTop: -4 },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 2 },
  price: { fontFamily: "Nunito_800ExtraBold", fontSize: 26, color: Colors.ocean },
  priceSub: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textMuted },
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
  posterName: { fontFamily: "Nunito_700Bold", fontSize: 13, color: Colors.charcoal },
  posterEmail: { fontFamily: "Nunito_400Regular", fontSize: 11, color: Colors.textMuted },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTitle: { fontFamily: "Nunito_700Bold", fontSize: 20, color: Colors.charcoal },
  emptySub: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textMuted },
  postFirstBtn: { backgroundColor: Colors.orange, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, marginTop: 8 },
  postFirstBtnText: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.white },
});
