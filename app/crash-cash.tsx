import React, { useState, useRef } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable, TouchableOpacity, Platform,
  Modal, Image, TextInput, KeyboardAvoidingView, ScrollView,
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
const SOS_RED = "#E74C3C";
const OFFERING_GREEN = "#D0F0E0";

const ZONE_SHORT: Record<string, string> = {
  campustown: "Campustown",
  north: "North Campus",
  south: "South Campus",
  urbana: "Urbana",
  downtown: "Downtown",
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

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function FullScreenImage({ uri, visible, onClose }: { uri: string; visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  if (!visible) return null;
  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={fsStyles.overlay}>
        <TouchableOpacity
          style={[fsStyles.closeBtn, { top: (Platform.OS === "web" ? 67 : insets.top) + 12 }]}
          onPress={onClose}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="close" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Image source={{ uri }} style={fsStyles.image} resizeMode="contain" />
      </View>
    </Modal>
  );
}

const fsStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "center", alignItems: "center" },
  closeBtn: {
    position: "absolute", left: 16, zIndex: 10,
    width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  image: { width: "100%", height: "80%" },
});

function CrashCard({ post, onDm }: { post: CrashPost; onDm: () => void }) {
  const [imageOpen, setImageOpen] = useState(false);
  const isSos = post.vibe === "sos";

  return (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        <View style={[styles.vibePill, isSos ? styles.vibeRed : styles.vibeGreen]}>
          <Text style={styles.vibeText}>
            {isSos ? "🚨 SOS / Stranded" : "🛋️ Offering a Crashpad"}
          </Text>
        </View>
        <Text style={styles.timestamp}>{timeAgo(post.timestamp)}</Text>
      </View>

      <Text style={styles.story}>{post.story}</Text>

      {post.imageUrl && (
        <>
          <Pressable onPress={() => setImageOpen(true)}>
            {({ pressed }) => (
              <Image
                source={{ uri: post.imageUrl }}
                style={[styles.thumbnail, pressed && { opacity: 0.8 }]}
                resizeMode="cover"
              />
            )}
          </Pressable>
          <FullScreenImage uri={post.imageUrl} visible={imageOpen} onClose={() => setImageOpen(false)} />
        </>
      )}

      <View style={styles.essentialsBox}>
        <View style={styles.essentialItem}>
          <Text style={styles.essentialIcon}>🗓️</Text>
          <Text style={styles.essentialText}>{post.dates}</Text>
        </View>
        <View style={styles.essentialItem}>
          <Text style={styles.essentialIcon}>📍</Text>
          <Text style={styles.essentialText}>{ZONE_SHORT[post.zone] || post.zone}</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Text style={styles.currencyLabel}>{post.currencyLabel}</Text>
        <Pressable onPress={onDm}>
          {({ pressed }) => (
            <View style={[styles.dmButton, pressed && { backgroundColor: Colors.ocean, transform: [{ scale: 0.97 }] }]}>
              <Text style={[styles.dmButtonText, pressed && { color: Colors.white }]}>
                Slide into DMs ⚡️
              </Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function NewPostSheet({
  visible,
  onClose,
  onSubmit,
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
  const { crashPosts, addCrashPost, currentUser, startConversation } = useApp();
  const { isDesktop, contentMaxWidth } = useResponsive();
  const topPadding = Platform.OS === "web" ? (isDesktop ? 24 : 67) : insets.top;
  const [showNewPost, setShowNewPost] = useState(false);

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

  const sorted = [...crashPosts].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <View style={[styles.container, { backgroundColor: SCREEN_BG }]}>
      <View style={[styles.header, { paddingTop: topPadding + 8 }, isDesktop && { maxWidth: contentMaxWidth, alignSelf: "center" as const, width: "100%" }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)")}>
          <Ionicons name="arrow-back" size={20} color={Colors.ocean} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Crash & Cash</Text>
          <Text style={styles.headerSub}>Rent your couch for the weekend. Get paid in cash, boba, or cover for Red Lion.</Text>
        </View>
      </View>

      <FlatList
        data={sorted}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <CrashCard
            post={item}
            onDm={() => handleDm(item)}
          />
        )}
        contentContainerStyle={[styles.listContent, {
          maxWidth: isDesktop ? 640 : contentMaxWidth,
          alignSelf: "center" as const,
          width: "100%",
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 80,
        }]}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
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
            <Ionicons name="pencil" size={22} color={Colors.white} />
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
    paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", alignItems: "flex-start", gap: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.white,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#8FAFB2", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
    marginTop: 2,
  },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 24, color: DARK_TEAL },
  headerSub: { fontFamily: "Nunito_400Regular", fontSize: 12, color: SUBTITLE_GREY, lineHeight: 17, marginTop: 2 },
  listContent: { paddingHorizontal: 16, paddingTop: 8 },
  card: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 16, gap: 12,
    shadowColor: "#8FAFB2", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 2,
  },
  cardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  vibePill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  vibeRed: { backgroundColor: SOS_RED + "18" },
  vibeGreen: { backgroundColor: OFFERING_GREEN },
  vibeText: { fontFamily: "Nunito_700Bold", fontSize: 12, color: DARK_TEAL },
  timestamp: { fontFamily: "Nunito_400Regular", fontSize: 12, color: SUBTITLE_GREY },
  story: { fontFamily: "Nunito_400Regular", fontSize: 15, color: DARK_TEAL, lineHeight: 22 },
  thumbnail: { width: 120, height: 120, borderRadius: 12, backgroundColor: "#F0F0F0" },
  essentialsBox: {
    backgroundColor: ESSENTIALS_BG, borderRadius: 12, padding: 10, flexDirection: "row", gap: 16,
  },
  essentialItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  essentialIcon: { fontSize: 14 },
  essentialText: { fontFamily: "Nunito_600SemiBold", fontSize: 13, color: DARK_TEAL },
  actionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  currencyLabel: { fontFamily: "Nunito_800ExtraBold", fontSize: 16, color: DARK_TEAL },
  dmButton: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14,
    backgroundColor: Colors.ocean + "12", borderWidth: 1.5, borderColor: Colors.ocean + "30",
  },
  dmButtonText: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.ocean },
  fab: {
    position: "absolute", right: 20,
  },
  fabInner: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: CORAL_FAB,
    alignItems: "center", justifyContent: "center",
    shadowColor: CORAL_FAB, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  emptyState: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontFamily: "Nunito_700Bold", fontSize: 20, color: DARK_TEAL },
  emptySub: { fontFamily: "Nunito_400Regular", fontSize: 13, color: SUBTITLE_GREY, textAlign: "center" },
});
