import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Platform, Modal, KeyboardAvoidingView, Dimensions
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useApp, BreakPost, BreakType, Zone } from "@/context/AppContext";

const BREAK_CONFIG: Record<BreakType, { label: string; dates: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  thanksgiving: { label: "Thanksgiving", dates: "Nov 27 – Dec 1", color: Colors.orange, icon: "home" },
  spring_break: { label: "Spring Break", dates: "Mar 15 – 23", color: Colors.grassGreen, icon: "sunny" },
  winter: { label: "Winter Break", dates: "Dec 20 – Jan 13", color: Colors.ocean, icon: "snow" },
};

const ZONE_OPTIONS: { key: Zone; label: string }[] = [
  { key: "campustown", label: "Campustown (Central Campus)" },
  { key: "north", label: "North Campus (Engineering / Midtown)" },
  { key: "south", label: "South Campus (Ikenberry / Seniorland)" },
  { key: "urbana", label: "Urbana (Gradland)" },
  { key: "downtown", label: "Downtown Champaign" },
];

const STICKY_COLORS = [
  "#FFF9C4", "#FFE0B2", "#E8F5E9", "#E3F2FD", "#F3E5F5", "#FCE4EC"
];

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function StickyNote({ post, index }: { post: BreakPost; index: number }) {
  const bg = STICKY_COLORS[index % STICKY_COLORS.length];
  const breakInfo = BREAK_CONFIG[post.breakType];
  const initials = post.userName.split(" ").map(n => n[0]).join("").slice(0, 2);

  return (
    <View style={[styles.sticky, { backgroundColor: bg }]}>
      <View style={styles.stickyPin}>
        <View style={[styles.pinHead, { backgroundColor: breakInfo.color }]} />
      </View>

      <View style={styles.stickyHeader}>
        <View style={[styles.roleBadge, {
          backgroundColor: post.role === "offering" ? Colors.grassGreen + "30" : Colors.ocean + "20"
        }]}>
          <Ionicons
            name={post.role === "offering" ? "key-outline" : "search-outline"}
            size={11}
            color={post.role === "offering" ? Colors.grassGreen : Colors.ocean}
          />
          <Text style={[styles.roleText, {
            color: post.role === "offering" ? Colors.grassGreen : Colors.ocean
          }]}>
            {post.role === "offering" ? "Offering" : "Seeking"}
          </Text>
        </View>
        <View style={[styles.breakBadge, { backgroundColor: breakInfo.color + "30" }]}>
          <Ionicons name={breakInfo.icon} size={11} color={breakInfo.color} />
          <Text style={[styles.breakBadgeText, { color: breakInfo.color }]}>{breakInfo.label}</Text>
        </View>
      </View>

      <Text style={styles.stickyPrice}>${post.pricePerWeek}<Text style={styles.stickyPriceSub}>/week</Text></Text>

      <Text style={styles.stickyDesc} numberOfLines={4}>{post.description}</Text>

      <View style={styles.stickyFooter}>
        <View style={[styles.stickyAvatar, { backgroundColor: post.avatarColor }]}>
          <Text style={styles.stickyAvatarText}>{initials}</Text>
        </View>
        <View style={styles.stickyMeta}>
          <Text style={styles.stickyName}>{post.userName}</Text>
          <Text style={styles.stickyTime}>{timeAgo(post.timestamp)}</Text>
        </View>
      </View>
    </View>
  );
}

function PostBreakModal({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { currentUser, addBreakPost } = useApp();
  const [role, setRole] = useState<"seeking" | "offering">("seeking");
  const [breakType, setBreakType] = useState<BreakType>("thanksgiving");
  const [price, setPrice] = useState("");
  const [zone, setZone] = useState<Zone>("campustown");
  const [description, setDescription] = useState("");

  const handlePost = async () => {
    if (!price.trim() || !description.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const post: BreakPost = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
      userId: currentUser?.id || "guest",
      userName: currentUser?.name || "Illini Student",
      userEmail: currentUser?.email || "student@illinois.edu",
      breakType,
      role,
      pricePerWeek: Number(price),
      zone,
      description: description.trim(),
      avatarColor: currentUser?.avatarColor || Colors.ocean,
      timestamp: Date.now(),
    };
    await addBreakPost(post);
    onClose();
  };

  return (
    <Modal animationType="slide" transparent visible onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalWrap}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Post to Break Board</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={22} color={Colors.charcoal} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.modalContent}>
                <Text style={styles.modalLabel}>I am...</Text>
                <View style={styles.roleRow}>
                  {(["seeking", "offering"] as const).map(r => (
                    <TouchableOpacity key={r} style={[styles.roleBtn, role === r && styles.roleBtnActive]}
                      onPress={() => { setRole(r); Haptics.selectionAsync(); }}>
                      <Ionicons name={r === "offering" ? "key-outline" : "search-outline"} size={16}
                        color={role === r ? Colors.white : Colors.textMuted} />
                      <Text style={[styles.roleBtnText, role === r && styles.roleBtnTextActive]}>
                        {r === "offering" ? "Offering Housing" : "Seeking Housing"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.modalLabel}>Break Period</Text>
                <View style={styles.chipRow}>
                  {(Object.keys(BREAK_CONFIG) as BreakType[]).map(b => (
                    <TouchableOpacity key={b} style={[styles.chip, breakType === b && styles.chipActive]}
                      onPress={() => { setBreakType(b); Haptics.selectionAsync(); }}>
                      <Text style={[styles.chipText, breakType === b && styles.chipTextActive]}>
                        {BREAK_CONFIG[b].label}
                      </Text>
                      <Text style={[styles.chipDates, breakType === b && { color: Colors.white + "CC" }]}>
                        {BREAK_CONFIG[b].dates}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.modalLabel}>Price per Week ($)</Text>
                <View style={styles.priceInputRow}>
                  <Text style={styles.priceDollar}>$</Text>
                  <TextInput style={styles.priceInput} value={price} onChangeText={setPrice}
                    placeholder="150" placeholderTextColor={Colors.textLight}
                    keyboardType="numeric" />
                  <Text style={styles.perWeek}>/week</Text>
                </View>

                <Text style={styles.modalLabel}>Zone</Text>
                <View style={styles.chipRow}>
                  {ZONE_OPTIONS.map(z => (
                    <TouchableOpacity key={z.key} style={[styles.chip, zone === z.key && styles.chipActive]}
                      onPress={() => { setZone(z.key); Haptics.selectionAsync(); }}>
                      <Text style={[styles.chipText, zone === z.key && styles.chipTextActive]}>{z.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.modalLabel}>Details</Text>
                <TextInput style={styles.textArea} value={description} onChangeText={setDescription}
                  placeholder="Tell students about your situation, space, or what you're looking for..."
                  placeholderTextColor={Colors.textLight} multiline numberOfLines={3} textAlignVertical="top" />

                <TouchableOpacity style={[styles.postBtn, (!price || !description) && styles.postBtnDisabled]}
                  onPress={handlePost} disabled={!price || !description}>
                  <Ionicons name="add-circle-outline" size={18} color={Colors.white} />
                  <Text style={styles.postBtnText}>Post to Board</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export default function BreaksScreen() {
  const insets = useSafeAreaInsets();
  const { breakPosts } = useApp();
  const [activeBreak, setActiveBreak] = useState<BreakType | "all">("all");
  const [showPostModal, setShowPostModal] = useState(false);
  const isDesktopBr = Platform.OS === "web" && Dimensions.get("window").width >= 1024;
  const contentMaxWidthBr = isDesktopBr ? 720 : Dimensions.get("window").width;
  const topPadding = Platform.OS === "web" ? (isDesktopBr ? 24 : 67) : insets.top;

  const filtered = activeBreak === "all"
    ? breakPosts
    : breakPosts.filter(p => p.breakType === activeBreak);

  return (
    <View style={[styles.container, { backgroundColor: Colors.sandLight }, isDesktopBr && { maxWidth: contentMaxWidthBr, alignSelf: "center" as const, width: "100%" }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.ocean} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Break Stay Board</Text>
          <Text style={styles.headerSub}>Short-term housing for breaks</Text>
        </View>
        <TouchableOpacity style={styles.pinBtn}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowPostModal(true); }}>
          <Ionicons name="add" size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.breakFilters}>
        {([
          { key: "all" as const, label: "All Breaks" },
          ...Object.entries(BREAK_CONFIG).map(([k, v]) => ({ key: k as BreakType, label: v.label }))
        ]).map(({ key, label }) => (
          <TouchableOpacity key={key}
            style={[styles.filterChip, activeBreak === key && styles.filterChipActive]}
            onPress={() => { setActiveBreak(key); Haptics.selectionAsync(); }}>
            <Text style={[styles.filterChipText, activeBreak === key && styles.filterChipTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.boardContent, {
        paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 30
      }]} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <View style={styles.emptyBoard}>
            <Ionicons name="albums-outline" size={44} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>Board is empty</Text>
            <Text style={styles.emptySub}>Pin the first note!</Text>
            <TouchableOpacity style={styles.pinFirstBtn} onPress={() => setShowPostModal(true)}>
              <Text style={styles.pinFirstBtnText}>Pin a Note</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.grid}>
            {filtered.map((post, i) => (
              <StickyNote key={post.id} post={post} index={i} />
            ))}
          </View>
        )}
      </ScrollView>

      {showPostModal && <PostBreakModal onClose={() => setShowPostModal(false)} />}
    </View>
  );
}

const CARD_WIDTH = (Platform.OS === "web" ? 320 : undefined);

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  pinBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.grassGreen,
    alignItems: "center", justifyContent: "center",
  },
  breakFilters: {
    flexDirection: "row", paddingHorizontal: 12, gap: 6, paddingBottom: 8, flexWrap: "wrap",
  },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: Colors.cardBg, borderWidth: 1.5, borderColor: Colors.borderSoft,
  },
  filterChipActive: { backgroundColor: Colors.ocean, borderColor: Colors.ocean },
  filterChipText: { fontFamily: "Nunito_600SemiBold", fontSize: 12, color: Colors.textMuted },
  filterChipTextActive: { color: Colors.white },
  scroll: { flex: 1 },
  boardContent: { padding: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  sticky: {
    width: "47.5%", borderRadius: 4, padding: 14, gap: 8,
    shadowColor: "#8B7355", shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 0.18, shadowRadius: 4, elevation: 3, position: "relative",
  },
  stickyPin: { position: "absolute", top: -4, left: "50%", alignItems: "center" },
  pinHead: { width: 10, height: 10, borderRadius: 5 },
  stickyHeader: { flexDirection: "row", gap: 4, flexWrap: "wrap" },
  roleBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  roleText: { fontFamily: "Nunito_600SemiBold", fontSize: 10 },
  breakBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  breakBadgeText: { fontFamily: "Nunito_600SemiBold", fontSize: 10 },
  stickyPrice: { fontFamily: "Nunito_800ExtraBold", fontSize: 20, color: Colors.charcoal },
  stickyPriceSub: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted },
  stickyDesc: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.charcoal, lineHeight: 17 },
  stickyFooter: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 4 },
  stickyAvatar: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  stickyAvatarText: { fontFamily: "Nunito_700Bold", fontSize: 9, color: Colors.white },
  stickyName: { fontFamily: "Nunito_700Bold", fontSize: 11, color: Colors.charcoal },
  stickyMeta: {},
  stickyTime: { fontFamily: "Nunito_400Regular", fontSize: 10, color: Colors.textMuted },
  emptyBoard: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTitle: { fontFamily: "Nunito_700Bold", fontSize: 20, color: Colors.charcoal },
  emptySub: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textMuted },
  pinFirstBtn: { backgroundColor: Colors.grassGreen, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, marginTop: 8 },
  pinFirstBtnText: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.white },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalWrap: { justifyContent: "flex-end" },
  modalContainer: {
    backgroundColor: Colors.sand, borderTopLeftRadius: 22, borderTopRightRadius: 22,
    maxHeight: "92%",
  },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.borderSoft,
  },
  modalTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 18, color: Colors.charcoal },
  modalContent: { padding: 16, gap: 14, paddingBottom: 24 },
  modalLabel: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.charcoal },
  roleRow: { flexDirection: "row", gap: 10 },
  roleBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: Colors.cardBg, borderRadius: 12, borderWidth: 1.5,
    borderColor: Colors.borderSoft, paddingVertical: 12,
  },
  roleBtnActive: { backgroundColor: Colors.ocean, borderColor: Colors.ocean },
  roleBtnText: { fontFamily: "Nunito_700Bold", fontSize: 13, color: Colors.textMuted },
  roleBtnTextActive: { color: Colors.white },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16,
    backgroundColor: Colors.cardBg, borderWidth: 1.5, borderColor: Colors.borderSoft,
  },
  chipActive: { backgroundColor: Colors.ocean, borderColor: Colors.ocean },
  chipText: { fontFamily: "Nunito_600SemiBold", fontSize: 12, color: Colors.textMuted },
  chipTextActive: { color: Colors.white },
  chipDates: { fontFamily: "Nunito_400Regular", fontSize: 10, color: Colors.textLight },
  priceInputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  priceDollar: { fontFamily: "Nunito_800ExtraBold", fontSize: 22, color: Colors.ocean },
  priceInput: {
    flex: 1, backgroundColor: Colors.cardBg, borderRadius: 12, borderWidth: 1.5,
    borderColor: Colors.borderSoft, paddingHorizontal: 14, paddingVertical: 10,
    fontFamily: "Nunito_800ExtraBold", fontSize: 20, color: Colors.ocean,
  },
  perWeek: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textMuted },
  textArea: {
    backgroundColor: Colors.cardBg, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.borderSoft,
    paddingHorizontal: 14, paddingVertical: 12, fontFamily: "Nunito_400Regular",
    fontSize: 14, color: Colors.charcoal, height: 90, textAlignVertical: "top",
  },
  postBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.grassGreen, borderRadius: 14, paddingVertical: 14,
  },
  postBtnDisabled: { opacity: 0.5 },
  postBtnText: { fontFamily: "Nunito_800ExtraBold", fontSize: 15, color: Colors.white },
});
