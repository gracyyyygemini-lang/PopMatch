import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList,
  Platform, ActivityIndicator, Dimensions
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useApp, SubleasePost, ListingImage } from "@/context/AppContext";
import FacePile from "@/components/FacePile";
import { getApiUrl } from "@/lib/query-client";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const LANDLORD_LABELS: Record<string, string> = {
  jsm: "JSM", ugroup: "UGroup", bailey: "Bailey",
  american: "American Campus", smile: "Smile", other: "Private / Other",
};

const ZONE_LABELS: Record<string, string> = {
  campustown: "Campustown", north: "North Campus", south: "South Campus",
  urbana: "Urbana", downtown: "Downtown Champaign",
};

const CATEGORY_COLORS: Record<string, string> = {
  all: Colors.ocean, summer_only: Colors.orange, august_gap: Colors.ocean,
  semester_takeover: Colors.grassGreen, short_term: Colors.goldDark,
};

const LEASE_LABELS: Record<string, string> = {
  full_year: "Full Year", fall_sublease: "Fall Sublease",
  spring_sublease: "Spring Sublease", summer_sublease: "Summer Sublease",
};

function formatDateFull(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" })
    + " at "
    + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

const AMENITY_LIST = [
  { key: "wifiIncluded", label: "WiFi Included", icon: "wifi-outline" as const },
  { key: "inUnitLaundry", label: "In-Unit Laundry", icon: "shirt-outline" as const },
  { key: "privateBathroom", label: "Private Bathroom", icon: "water-outline" as const },
  { key: "parkingIncluded", label: "Parking Included", icon: "car-outline" as const },
  { key: "furnished", label: "Furnished", icon: "bed-outline" as const },
];

export default function ListingDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { subleases, currentUser, getTrustInfo } = useApp();
  const [post, setPost] = useState<SubleasePost | null>(null);
  const [images, setImages] = useState<ListingImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);
  const [conversationLoading, setConversationLoading] = useState(false);
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    async function load() {
      setLoading(true);
      // Try local context first
      const localPost = subleases.find(s => s.id === id);
      if (localPost) setPost(localPost);

      // Fetch fresh from API
      try {
        const url = new URL(`/api/listings/${id}`, getApiUrl()).toString();
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setPost({
            id: data.id,
            userId: data.user_id,
            userName: data.user_name ?? "Anonymous",
            userEmail: data.user_email_full ?? "",
            buildingName: data.building_name,
            address: data.address ?? "",
            floorPlan: data.floor_plan ?? "",
            leaseType: data.lease_type ?? "fall_sublease",
            pricePerMonth: data.price_per_month ?? 0,
            landlord: data.landlord ?? "other",
            zone: data.zone ?? "campustown",
            availableDuringBreaks: data.available_during_breaks ?? false,
            breakTypes: data.break_types ?? [],
            description: data.description ?? "",
            avatarColor: data.user_avatar ?? Colors.ocean,
            timestamp: new Date(data.created_at ?? Date.now()).getTime(),
            category: data.category ?? "semester_takeover",
            moveInAt: data.move_in_at ?? null,
            moveOutAt: data.move_out_at ?? null,
            wifiIncluded: data.wifi_included ?? false,
            inUnitLaundry: data.in_unit_laundry ?? false,
            bedroomsCount: data.bedrooms_count ?? 1,
            privateBathroom: data.private_bathroom ?? false,
            parkingIncluded: data.parking_included ?? false,
            furnished: data.furnished ?? false,
          });
        }
      } catch {}

      // Fetch images
      try {
        const imgUrl = new URL(`/api/listings/${id}/images`, getApiUrl()).toString();
        const imgRes = await fetch(imgUrl);
        if (imgRes.ok) {
          const imgData: { id: number; listing_id: string; category: string; image_data: string; verified: boolean }[] = await imgRes.json();
          setImages(imgData.map(i => ({ id: i.id, listingId: i.listing_id, category: i.category, imageData: i.image_data, verified: i.verified })));
        }
      } catch {}

      // Also include local images from context
      if (localPost?.images?.length) {
        setImages(prev => prev.length > 0 ? prev : (localPost.images ?? []));
      }

      setLoading(false);
    }
    if (id) load();
  }, [id]);

  const handleMessage = async () => {
    if (!post || !currentUser) return;
    setConversationLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const url = new URL("/api/conversations/find-or-create", getApiUrl()).toString();
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails: [currentUser.email, post.userEmail],
          type: "sublease", listingId: post.id, listingTitle: post.buildingName,
        }),
      });
      if (res.ok) {
        const { conversationId } = await res.json();
        router.push({
          pathname: "/chat/[id]",
          params: { id: conversationId, otherEmail: post.userEmail, otherName: post.userName, listingTitle: post.buildingName },
        });
      }
    } catch {}
    setConversationLoading(false);
  };

  if (loading && !post) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: topPadding }]}>
        <ActivityIndicator size="large" color={Colors.ocean} />
        <Text style={styles.loadingText}>Loading listing…</Text>
      </View>
    );
  }

  if (!post) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: topPadding }]}>
        <Ionicons name="home-outline" size={48} color={Colors.textLight} />
        <Text style={styles.loadingText}>Listing not found</Text>
        <TouchableOpacity style={styles.backFallback} onPress={() => router.back()}>
          <Text style={styles.backFallbackText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const trust = getTrustInfo(post.userEmail);
  const isOwner = currentUser?.email === post.userEmail;
  const cat = post.category || "semester_takeover";
  const catColor = CATEGORY_COLORS[cat] || Colors.ocean;
  const initials = post.userName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const buildingInitial = post.buildingName[0]?.toUpperCase() ?? "?";
  const activeAmenities = AMENITY_LIST.filter(a => !!(post as Record<string, unknown>)[a.key]);

  return (
    <View style={styles.container}>
      {/* ── Back Button (floating) ── */}
      <TouchableOpacity
        style={[styles.backBtn, { top: topPadding + 8 }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
      >
        <Ionicons name="arrow-back" size={20} color={Colors.charcoal} />
      </TouchableOpacity>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 90 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Image Carousel ── */}
        {images.length > 0 ? (
          <View>
            <FlatList
              data={images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(_, i) => String(i)}
              onMomentumScrollEnd={e => setActiveSlide(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH))}
              renderItem={({ item }) => (
                <View style={styles.imageSlide}>
                  <Image
                    source={{ uri: item.imageData }}
                    style={styles.slideImage}
                    contentFit="cover"
                  />
                  <View style={styles.slideCategoryBadge}>
                    <Text style={styles.slideCategoryText}>{item.category.charAt(0).toUpperCase() + item.category.slice(1)}</Text>
                    {item.verified && <Ionicons name="checkmark-circle" size={12} color={Colors.grassGreen} />}
                  </View>
                </View>
              )}
            />
            {images.length > 1 && (
              <View style={styles.dotsRow}>
                {images.map((_, i) => (
                  <View key={i} style={[styles.dot, activeSlide === i && styles.dotActive]} />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.heroPlaceholder, { backgroundColor: catColor }]}>
            <View style={styles.heroOverlay} />
            <Text style={styles.heroInitial}>{buildingInitial}</Text>
            <View style={styles.heroNoPhotoBadge}>
              <Ionicons name="camera-outline" size={12} color="rgba(255,255,255,0.7)" />
              <Text style={styles.heroNoPhotoText}>No photos yet</Text>
            </View>
          </View>
        )}

        <View style={styles.body}>
          {/* ── Price & Category Row ── */}
          <View style={styles.priceCatRow}>
            <Text style={styles.price}>${post.pricePerMonth.toLocaleString()}<Text style={styles.priceSub}>/mo</Text></Text>
            <View style={[styles.catBadge, { backgroundColor: catColor }]}>
              <Text style={styles.catBadgeText}>
                {cat === "semester_takeover" ? LEASE_LABELS[post.leaseType] : cat.replace("_", " ")}
              </Text>
            </View>
          </View>

          {/* ── Building & Floor Plan ── */}
          <Text style={styles.buildingName}>
            {post.buildingName}{post.floorPlan ? ` — ${post.floorPlan}` : ""}
          </Text>
          {post.address ? (
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.addressText}>{post.address}</Text>
            </View>
          ) : null}

          {/* ── Dates ── */}
          <View style={styles.datesCard}>
            <View style={styles.dateItem}>
              <View style={styles.dateIconWrap}>
                <Ionicons name="log-in-outline" size={16} color={Colors.grassGreen} />
              </View>
              <View>
                <Text style={styles.dateItemLabel}>Move-In</Text>
                <Text style={styles.dateItemValue}>{formatDateFull(post.moveInAt)}</Text>
              </View>
            </View>
            <View style={styles.dateDivider} />
            <View style={styles.dateItem}>
              <View style={styles.dateIconWrap}>
                <Ionicons name="log-out-outline" size={16} color={Colors.ponyo} />
              </View>
              <View>
                <Text style={styles.dateItemLabel}>Move-Out</Text>
                <Text style={styles.dateItemValue}>{formatDateFull(post.moveOutAt)}</Text>
              </View>
            </View>
          </View>

          {/* ── Info Chips ── */}
          <View style={styles.infoRow}>
            <View style={styles.infoChip}>
              <Ionicons name="map-outline" size={14} color={Colors.ocean} />
              <Text style={styles.infoChipText}>{ZONE_LABELS[post.zone] ?? post.zone}</Text>
            </View>
            <View style={styles.infoChip}>
              <Ionicons name="business-outline" size={14} color={Colors.ocean} />
              <Text style={styles.infoChipText}>{LANDLORD_LABELS[post.landlord] ?? post.landlord}</Text>
            </View>
            <View style={styles.infoChip}>
              <Ionicons name="bed-outline" size={14} color={Colors.ocean} />
              <Text style={styles.infoChipText}>{post.bedroomsCount ?? 1} BR</Text>
            </View>
            {post.availableDuringBreaks && (
              <View style={[styles.infoChip, { backgroundColor: Colors.grassGreen + "15", borderColor: Colors.grassGreen + "40" }]}>
                <Ionicons name="home-outline" size={14} color={Colors.grassGreen} />
                <Text style={[styles.infoChipText, { color: Colors.grassGreen }]}>Break-Friendly</Text>
              </View>
            )}
          </View>

          {/* ── Amenities ── */}
          {activeAmenities.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Amenities</Text>
              <View style={styles.amenityRow}>
                {activeAmenities.map(a => (
                  <View key={a.key} style={styles.amenityPill}>
                    <Ionicons name={a.icon} size={14} color={Colors.ocean} />
                    <Text style={styles.amenityPillText}>{a.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── Description ── */}
          {post.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About this place</Text>
              <Text style={styles.descText}>{post.description}</Text>
            </View>
          ) : null}

          {/* ── Poster Section ── */}
          <View style={styles.posterCard}>
            <View style={[styles.posterAvatar, { backgroundColor: post.avatarColor }]}>
              <Text style={styles.posterInitials}>{initials}</Text>
            </View>
            <View style={styles.posterInfo}>
              <Text style={styles.posterName}>{post.userName}</Text>
              {isOwner ? (
                <Text style={[styles.posterSub, { color: Colors.ocean }]}>Your listing</Text>
              ) : trust.degree === 1 ? (
                <View style={styles.trustRow}>
                  <Ionicons name="people" size={12} color={Colors.grassGreen} />
                  <Text style={[styles.posterSub, { color: Colors.grassGreen }]}>1st Degree Friend</Text>
                </View>
              ) : trust.degree === 2 && trust.mutualFriends.length > 0 ? (
                <FacePile mutuals={trust.mutualFriends} maxVisible={3} />
              ) : trust.sharedOrg ? (
                <View style={styles.trustRow}>
                  <Ionicons name="school-outline" size={12} color={Colors.goldDark} />
                  <Text style={[styles.posterSub, { color: Colors.goldDark }]}>{trust.sharedOrg}</Text>
                </View>
              ) : (
                <Text style={styles.posterSub}>{post.userEmail}</Text>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ── Sticky CTA Footer ── */}
      {!isOwner && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 8 }]}>
          <TouchableOpacity style={styles.msgBtn} onPress={handleMessage} disabled={conversationLoading}>
            {conversationLoading
              ? <ActivityIndicator size="small" color={Colors.white} />
              : <Ionicons name="chatbubble" size={18} color={Colors.white} />}
            <Text style={styles.msgBtnText}>Message {post.userName.split(" ")[0]}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.sand },
  scroll: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: Colors.sand },
  loadingText: { fontFamily: "Nunito_600SemiBold", fontSize: 14, color: Colors.textMuted },
  backFallback: { backgroundColor: Colors.ocean, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10, marginTop: 8 },
  backFallbackText: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.white },

  backBtn: {
    position: "absolute", left: 16, zIndex: 100,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },

  imageSlide: { width: SCREEN_WIDTH, height: 280 },
  slideImage: { width: "100%", height: "100%" },
  slideCategoryBadge: {
    position: "absolute", bottom: 12, left: 14,
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(0,0,0,0.52)", borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  slideCategoryText: { fontFamily: "Nunito_600SemiBold", fontSize: 12, color: "#fff" },
  dotsRow: { flexDirection: "row", justifyContent: "center", gap: 6, paddingVertical: 10, backgroundColor: Colors.cardBg },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.borderSoft },
  dotActive: { backgroundColor: Colors.ocean, width: 16 },

  heroPlaceholder: { height: 280, justifyContent: "center", alignItems: "center" },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.18)" },
  heroInitial: { fontFamily: "Nunito_800ExtraBold", fontSize: 80, color: "rgba(255,255,255,0.3)" },
  heroNoPhotoBadge: {
    position: "absolute", bottom: 16, left: 16,
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(0,0,0,0.4)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
  },
  heroNoPhotoText: { fontFamily: "Nunito_600SemiBold", fontSize: 11, color: "rgba(255,255,255,0.7)" },

  body: { padding: 20, gap: 16 },

  priceCatRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  price: { fontFamily: "Nunito_800ExtraBold", fontSize: 34, color: Colors.charcoal },
  priceSub: { fontFamily: "Nunito_400Regular", fontSize: 15, color: Colors.textMuted },
  catBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  catBadgeText: { fontFamily: "Nunito_700Bold", fontSize: 12, color: Colors.white },

  buildingName: { fontFamily: "Nunito_800ExtraBold", fontSize: 22, color: Colors.charcoal, lineHeight: 28 },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: -8 },
  addressText: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textMuted },

  datesCard: {
    backgroundColor: Colors.cardBg, borderRadius: 16, borderWidth: 1.5,
    borderColor: Colors.borderSoft, padding: 16, gap: 12,
  },
  dateItem: { flexDirection: "row", alignItems: "center", gap: 12 },
  dateIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: Colors.sand, alignItems: "center", justifyContent: "center",
  },
  dateItemLabel: { fontFamily: "Nunito_600SemiBold", fontSize: 11, color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  dateItemValue: { fontFamily: "Nunito_700Bold", fontSize: 13, color: Colors.charcoal, marginTop: 1 },
  dateDivider: { height: 1, backgroundColor: Colors.borderSoft },

  infoRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  infoChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
    backgroundColor: Colors.ocean + "12", borderWidth: 1, borderColor: Colors.ocean + "30",
  },
  infoChipText: { fontFamily: "Nunito_600SemiBold", fontSize: 12, color: Colors.ocean },

  section: { gap: 10 },
  sectionTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 16, color: Colors.charcoal },
  amenityRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  amenityPill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: Colors.ocean + "12", borderWidth: 1, borderColor: Colors.ocean + "30",
  },
  amenityPillText: { fontFamily: "Nunito_600SemiBold", fontSize: 12, color: Colors.ocean },
  descText: { fontFamily: "Nunito_400Regular", fontSize: 14, color: Colors.charcoal, lineHeight: 22 },

  posterCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.cardBg, borderRadius: 16, borderWidth: 1.5,
    borderColor: Colors.borderSoft, padding: 14,
  },
  posterAvatar: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  posterInitials: { fontFamily: "Nunito_800ExtraBold", fontSize: 16, color: Colors.white },
  posterInfo: { flex: 1, gap: 4 },
  posterName: { fontFamily: "Nunito_700Bold", fontSize: 15, color: Colors.charcoal },
  posterSub: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted },
  trustRow: { flexDirection: "row", alignItems: "center", gap: 4 },

  footer: {
    paddingHorizontal: 20, paddingTop: 12, backgroundColor: Colors.sand,
    borderTopWidth: 1, borderTopColor: Colors.borderSoft,
  },
  msgBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.ocean, borderRadius: 16, paddingVertical: 15,
  },
  msgBtnText: { fontFamily: "Nunito_800ExtraBold", fontSize: 16, color: Colors.white },
});
