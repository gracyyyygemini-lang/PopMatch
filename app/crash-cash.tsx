import React, { useState } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable, TouchableOpacity, Platform,
  Modal, TextInput, KeyboardAvoidingView, ScrollView, useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useApp, CrashPost, CrashVibe, CrashCurrency, Zone } from "@/context/AppContext";
import { useResponsive } from "@/hooks/useResponsive";

const DARK_TEAL = "#2C555C";
const SUBTITLE_GREY = "#6B8A8F";
const SCREEN_BG = "#FBFBF9";
const CORAL_FAB = "#FF8C69";
const ESSENTIALS_BG = "#F0F5F5";
const SOS_TINT = "#FDECE8";
const OFFER_TINT = "#E8F6F3";
const SOS_RED = "#E74C3C";
const OFFERING_GREEN = "#D0F0E0";
const GRID_GAP = 12;
const GRID_PAD = 16;

const ZONE_SHORT: Record<string, string> = {
  campustown: "Campustown",
  north: "North",
  south: "South",
  urbana: "Urbana",
  downtown: "Downtown",
};

const PLACEHOLDER_IMGS: Record<string, { colors: string[]; icon: keyof typeof Ionicons.glyphMap }> = {
  campustown: { colors: ["#FFE5D9", "#FBBF9E"], icon: "storefront-outline" },
  north: { colors: ["#D6EAF8", "#A9CCE3"], icon: "hardware-chip-outline" },
  south: { colors: ["#D5F5E3", "#A9DFBF"], icon: "football-outline" },
  urbana: { colors: ["#FCF3CF", "#F9E79F"], icon: "leaf-outline" },
  downtown: { colors: ["#E8DAEF", "#D2B4DE"], icon: "business-outline" },
};

const CURRENCY_OPTIONS: { key: CrashCurrency; emoji: string; label: string }[] = [
  { key: "cash", emoji: "💵", label: "Cash" },
  { key: "boba", emoji: "🧋", label: "Boba" },
  { key: "lion_cover", emoji: "🦁", label: "Lion Cover" },
  { key: "food", emoji: "🍕", label: "Food/Drinks" },
  { key: "favor", emoji: "🤝", label: "Return the Favor" },
];

const ZONE_OPTIONS: { key: Zone; label: string }[] = [
  { key: "campustown", label: "Campustown" },
  { key: "north", label: "North Campus" },
  { key: "south", label: "South Campus" },
  { key: "urbana", label: "Urbana" },
  { key: "downtown", label: "Downtown" },
];

type VibeFilter = "all" | "sos" | "offering";

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function GridCard({ post, cardWidth, onDm }: { post: CrashPost; cardWidth: number; onDm: () => void }) {
  const isSos = post.vibe === "sos";
  const tint = isSos ? SOS_TINT : OFFER_TINT;
  const placeholder = PLACEHOLDER_IMGS[post.zone] || PLACEHOLDER_IMGS.campustown;

  return (
    <View style={[gc.card, { width: cardWidth, backgroundColor: tint }]}>
      <View style={gc.heroWrap}>
        <View style={[gc.heroPlaceholder, { backgroundColor: placeholder.colors[0] }]}>
          <Ionicons name={placeholder.icon} size={36} color={placeholder.colors[1]} />
        </View>

        <View style={gc.avatarOverlay}>
          <View style={[gc.avatar, { backgroundColor: post.avatarColor }]}>
            <Text style={gc.avatarText}>{post.userName[0]}</Text>
          </View>
        </View>

        <View style={gc.timeOverlay}>
          <View style={gc.timePill}>
            <Text style={gc.timeText}>{timeAgo(post.timestamp)}</Text>
          </View>
        </View>

        <View style={gc.tagOverlay}>
          <View style={[gc.tagPill, isSos ? gc.tagSos : gc.tagOffer]}>
            <Text style={gc.tagText}>{isSos ? "🚨 NEED" : "🛋️ GOT"}</Text>
          </View>
        </View>
      </View>

      <View style={gc.details}>
        <Text style={gc.story} numberOfLines={2}>{post.story}</Text>

        <View style={gc.essBox}>
          <View style={gc.essItem}>
            <Text style={gc.essIcon}>🗓️</Text>
            <Text style={gc.essText} numberOfLines={1}>{post.dates}</Text>
          </View>
          <View style={gc.essItem}>
            <Text style={gc.essIcon}>📍</Text>
            <Text style={gc.essText} numberOfLines={1}>{ZONE_SHORT[post.zone] || post.zone}</Text>
          </View>
        </View>

        <View style={gc.actionRow}>
          <Text style={gc.currency} numberOfLines={1}>{post.currencyLabel}</Text>
          <Pressable onPress={onDm}>
            {({ pressed }) => (
              <View style={[gc.dmBtn, pressed && { backgroundColor: DARK_TEAL, transform: [{ scale: 0.95 }] }]}>
                <Text style={[gc.dmBtnText, pressed && { color: Colors.white }]}>DM ⚡️</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const gc = StyleSheet.create({
  card: {
    borderRadius: 16, overflow: "hidden",
    shadowColor: "rgba(0,0,0,0.05)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 16,
    elevation: 2,
  },
  heroWrap: { height: 180, position: "relative" },
  heroPlaceholder: {
    flex: 1, alignItems: "center", justifyContent: "center",
  },
  avatarOverlay: { position: "absolute", top: 8, left: 8 },
  avatar: {
    width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: Colors.white,
  },
  avatarText: { fontFamily: "Nunito_800ExtraBold", fontSize: 12, color: Colors.white },
  timeOverlay: { position: "absolute", top: 8, right: 8 },
  timePill: {
    backgroundColor: "rgba(255,255,255,0.75)", backdropFilter: "blur(8px)",
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  timeText: { fontFamily: "Nunito_600SemiBold", fontSize: 10, color: DARK_TEAL },
  tagOverlay: { position: "absolute", bottom: -10, left: 8 },
  tagPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tagSos: { backgroundColor: "#FF6B4E" },
  tagOffer: { backgroundColor: Colors.grassGreen },
  tagText: { fontFamily: "Nunito_800ExtraBold", fontSize: 11, color: Colors.white },
  details: { padding: 8, paddingTop: 16, gap: 6 },
  story: { fontFamily: "Nunito_600SemiBold", fontSize: 13, color: DARK_TEAL, lineHeight: 18 },
  essBox: {
    backgroundColor: Colors.white, borderRadius: 8, padding: 6, gap: 3,
  },
  essItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  essIcon: { fontSize: 11 },
  essText: { fontFamily: "Nunito_400Regular", fontSize: 11, color: DARK_TEAL, flex: 1 },
  actionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 },
  currency: { fontFamily: "Nunito_800ExtraBold", fontSize: 13, color: DARK_TEAL, flex: 1 },
  dmBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
    backgroundColor: DARK_TEAL,
  },
  dmBtnText: { fontFamily: "Nunito_700Bold", fontSize: 12, color: Colors.white },
});

function SegmentedToggle({ value, onChange }: { value: VibeFilter; onChange: (v: VibeFilter) => void }) {
  const opts: { key: VibeFilter; label: string }[] = [
    { key: "sos", label: "🚨 Needing" },
    { key: "offering", label: "🛋️ Offering" },
    { key: "all", label: "All" },
  ];
  return (
    <View style={seg.wrap}>
      {opts.map(o => (
        <Pressable key={o.key} onPress={() => { onChange(o.key); Haptics.selectionAsync(); }} style={{ flex: 1 }}>
          {({ pressed }) => (
            <View style={[seg.item, value === o.key && seg.itemActive, pressed && { opacity: 0.85 }]}>
              <Text style={[seg.text, value === o.key && seg.textActive]}>{o.label}</Text>
            </View>
          )}
        </Pressable>
      ))}
    </View>
  );
}

const seg = StyleSheet.create({
  wrap: {
    flexDirection: "row", backgroundColor: "#EDF2F2", borderRadius: 14, padding: 3,
    marginHorizontal: GRID_PAD, marginBottom: 8,
  },
  item: { paddingVertical: 8, borderRadius: 12, alignItems: "center" },
  itemActive: { backgroundColor: Colors.white, shadowColor: "rgba(0,0,0,0.06)", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2 },
  text: { fontFamily: "Nunito_600SemiBold", fontSize: 13, color: SUBTITLE_GREY },
  textActive: { fontFamily: "Nunito_700Bold", color: DARK_TEAL },
});

function NewPostSheet({
  visible, onClose, onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: { vibe: CrashVibe; story: string; dates: string; zone: Zone; currency: CrashCurrency; currencyLabel: string }) => void;
}) {
  const [vibe, setVibe] = useState<CrashVibe>("sos");
  const [story, setStory] = useState("");
  const [dates, setDates] = useState("");
  const [zone, setZone] = useState<Zone>("campustown");
  const [currency, setCurrency] = useState<CrashCurrency>("cash");
  const [customCurrencyLabel, setCustomCurrencyLabel] = useState("");
  const insets = useSafeAreaInsets();

  const handleSubmit = () => {
    if (!story.trim() || !dates.trim()) return;
    const currOpt = CURRENCY_OPTIONS.find(c => c.key === currency);
    const label = customCurrencyLabel.trim() || `${currOpt?.emoji} ${currOpt?.label}`;
    onSubmit({ vibe, story: story.trim(), dates: dates.trim(), zone, currency, currencyLabel: label });
    setStory("");
    setDates("");
    setCustomCurrencyLabel("");
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={np.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ justifyContent: "flex-end", flex: 1 }}>
          <View style={[np.sheet, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16) }]}>
            <View style={np.handle} />
            <Text style={np.title}>New Crash Post</Text>

            <Text style={np.label}>Vibe</Text>
            <View style={np.vibeRow}>
              <Pressable onPress={() => setVibe("sos")} style={[np.vibeOption, vibe === "sos" && np.vibeActive]}>
                <Text style={np.vibeOptionText}>🚨 SOS</Text>
              </Pressable>
              <Pressable onPress={() => setVibe("offering")} style={[np.vibeOption, vibe === "offering" && np.vibeActiveGreen]}>
                <Text style={np.vibeOptionText}>🛋️ Offering</Text>
              </Pressable>
            </View>

            <Text style={np.label}>Your Story</Text>
            <TextInput
              style={np.textArea}
              placeholder="What's the situation? Keep it real..."
              placeholderTextColor={SUBTITLE_GREY}
              multiline
              value={story}
              onChangeText={setStory}
              maxLength={280}
            />

            <Text style={np.label}>When</Text>
            <TextInput
              style={np.input}
              placeholder="e.g. Tonight only, Nov 22 – Nov 25"
              placeholderTextColor={SUBTITLE_GREY}
              value={dates}
              onChangeText={setDates}
            />

            <Text style={np.label}>Zone</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 42 }} contentContainerStyle={{ gap: 8 }}>
              {ZONE_OPTIONS.map(z => (
                <Pressable key={z.key} onPress={() => setZone(z.key)} style={[np.zoneChip, zone === z.key && np.zoneChipActive]}>
                  <Text style={[np.zoneChipText, zone === z.key && { color: Colors.white }]}>{z.label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={np.label}>Accepted Currency</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 42 }} contentContainerStyle={{ gap: 8 }}>
              {CURRENCY_OPTIONS.map(c => (
                <Pressable key={c.key} onPress={() => setCurrency(c.key)} style={[np.zoneChip, currency === c.key && np.zoneChipActive]}>
                  <Text style={[np.zoneChipText, currency === c.key && { color: Colors.white }]}>{c.emoji} {c.label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <TextInput
              style={[np.input, { marginTop: 8 }]}
              placeholder="Custom price label (e.g. $20, Boba from Kung Fu)"
              placeholderTextColor={SUBTITLE_GREY}
              value={customCurrencyLabel}
              onChangeText={setCustomCurrencyLabel}
            />

            <View style={np.btnRow}>
              <TouchableOpacity style={np.cancelBtn} onPress={onClose}>
                <Text style={np.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[np.submitBtn, (!story.trim() || !dates.trim()) && { opacity: 0.5 }]}
                onPress={handleSubmit}
                disabled={!story.trim() || !dates.trim()}
              >
                <Text style={np.submitBtnText}>Post It 🔥</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const np = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 14, gap: 8,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.borderSoft, alignSelf: "center", marginBottom: 8 },
  title: { fontFamily: "Nunito_800ExtraBold", fontSize: 20, color: DARK_TEAL, marginBottom: 4 },
  label: { fontFamily: "Nunito_700Bold", fontSize: 13, color: SUBTITLE_GREY, marginTop: 4 },
  vibeRow: { flexDirection: "row", gap: 10 },
  vibeOption: {
    flex: 1, paddingVertical: 10, borderRadius: 14, borderWidth: 1.5, borderColor: "#E0E8E9",
    alignItems: "center",
  },
  vibeActive: { backgroundColor: SOS_RED + "15", borderColor: SOS_RED },
  vibeActiveGreen: { backgroundColor: OFFERING_GREEN, borderColor: Colors.grassGreen },
  vibeOptionText: { fontFamily: "Nunito_700Bold", fontSize: 14, color: DARK_TEAL },
  textArea: {
    fontFamily: "Nunito_400Regular", fontSize: 14, color: DARK_TEAL,
    backgroundColor: ESSENTIALS_BG, borderRadius: 14, padding: 12, minHeight: 80,
    textAlignVertical: "top",
  },
  input: {
    fontFamily: "Nunito_400Regular", fontSize: 14, color: DARK_TEAL,
    backgroundColor: ESSENTIALS_BG, borderRadius: 14, padding: 12, height: 44,
  },
  zoneChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: "#E0E8E9", backgroundColor: Colors.white,
  },
  zoneChipActive: { backgroundColor: Colors.ocean, borderColor: Colors.ocean },
  zoneChipText: { fontFamily: "Nunito_600SemiBold", fontSize: 12, color: DARK_TEAL },
  btnRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: "#E0E8E9",
    alignItems: "center",
  },
  cancelBtnText: { fontFamily: "Nunito_700Bold", fontSize: 15, color: SUBTITLE_GREY },
  submitBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 14, backgroundColor: CORAL_FAB,
    alignItems: "center",
  },
  submitBtnText: { fontFamily: "Nunito_800ExtraBold", fontSize: 15, color: Colors.white },
});

export default function CrashCashScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { crashPosts, addCrashPost, currentUser, startConversation } = useApp();
  const { isDesktop, contentMaxWidth } = useResponsive();
  const topPadding = Platform.OS === "web" ? (isDesktop ? 24 : 67) : insets.top;
  const [showNewPost, setShowNewPost] = useState(false);
  const [vibeFilter, setVibeFilter] = useState<VibeFilter>("all");

  const containerWidth = isDesktop ? Math.min(640, screenWidth) : Math.min(screenWidth, contentMaxWidth);
  const cardWidth = (containerWidth - GRID_PAD * 2 - GRID_GAP) / 2;

  const handleDm = (post: CrashPost) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const convoId = startConversation(
      post.userId, post.userName, post.avatarColor, post.userEmail,
      post.id, `Crash: ${post.dates}`, 0
    );
    router.push(`/chat?conversationId=${convoId}`);
  };

  const handleNewPost = (data: {
    vibe: CrashVibe; story: string; dates: string; zone: Zone;
    currency: CrashCurrency; currencyLabel: string;
  }) => {
    if (!currentUser) return;
    const post: CrashPost = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      avatarColor: currentUser.avatarColor,
      ...data,
      timestamp: Date.now(),
    };
    addCrashPost(post);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowNewPost(false);
  };

  const sorted = [...crashPosts]
    .filter(p => vibeFilter === "all" || p.vibe === vibeFilter)
    .sort((a, b) => b.timestamp - a.timestamp);

  return (
    <View style={[styles.container, { backgroundColor: SCREEN_BG }]}>
      <View style={[styles.header, { paddingTop: topPadding + 8 }, isDesktop && { maxWidth: 640, alignSelf: "center" as const, width: "100%" }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)")}>
          <Ionicons name="arrow-back" size={20} color={Colors.ocean} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Crash & Cash</Text>
          <Text style={styles.headerSub}>Rent your couch. Get paid in cash, boba, or Red Lion cover.</Text>
        </View>
      </View>

      <SegmentedToggle value={vibeFilter} onChange={setVibeFilter} />

      <FlatList
        data={sorted}
        keyExtractor={item => item.id}
        numColumns={2}
        columnWrapperStyle={{
          gap: GRID_GAP,
          paddingHorizontal: GRID_PAD,
          maxWidth: isDesktop ? 640 : contentMaxWidth,
          alignSelf: "center" as const,
          width: "100%",
        }}
        renderItem={({ item }) => (
          <GridCard
            post={item}
            cardWidth={cardWidth}
            onDm={() => handleDm(item)}
          />
        )}
        contentContainerStyle={{
          gap: GRID_GAP,
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 80,
          paddingTop: 4,
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🛋️</Text>
            <Text style={styles.emptyTitle}>No crash posts yet</Text>
            <Text style={styles.emptySub}>Be the first to post — tap the coral button below!</Text>
          </View>
        }
      />

      <Pressable
        style={[styles.fab, { bottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 16 }]}
        onPress={() => { setShowNewPost(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
      >
        {({ pressed }) => (
          <View style={[styles.fabInner, pressed && { transform: [{ scale: 0.92 }] }]}>
            <Ionicons name="add" size={26} color={Colors.white} />
          </View>
        )}
      </Pressable>

      <NewPostSheet
        visible={showNewPost}
        onClose={() => setShowNewPost(false)}
        onSubmit={handleNewPost}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: GRID_PAD, paddingBottom: 10, flexDirection: "row", alignItems: "flex-start", gap: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.white,
    alignItems: "center", justifyContent: "center",
    shadowColor: "rgba(0,0,0,0.05)", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2,
    marginTop: 2,
  },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 24, color: DARK_TEAL },
  headerSub: { fontFamily: "Nunito_400Regular", fontSize: 12, color: SUBTITLE_GREY, lineHeight: 17, marginTop: 2 },
  fab: { position: "absolute", right: 20 },
  fabInner: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: CORAL_FAB,
    alignItems: "center", justifyContent: "center",
    shadowColor: "rgba(0,0,0,0.05)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 16, elevation: 6,
  },
  emptyState: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontFamily: "Nunito_700Bold", fontSize: 20, color: DARK_TEAL },
  emptySub: { fontFamily: "Nunito_400Regular", fontSize: 13, color: SUBTITLE_GREY, textAlign: "center" },
});
