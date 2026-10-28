import React, { useState, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  Platform, KeyboardAvoidingView, ScrollView, Animated
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useApp, ChatMessage } from "@/context/AppContext";
import { useResponsive } from "@/hooks/useResponsive";
import CustomAvatar from "@/components/CustomAvatar";
import { usePolling } from "@/hooks/usePolling";
import { font } from "@/constants/typography";

const DARK_TEAL = "#13294B";
const CHAT_POLL_MS = 3000;
const WARM_CREAM = "#F2F3F5";
const SENT_CORAL = "#FF5F05";
const RECEIVED_SEAFOAM = Colors.blueTint;

const CRASH_CASH_CHIPS: { label: string; bg: string; border: string }[] = [
  { label: "Still available? 👀", bg: "#FFE6D6", border: "#C6C7C6" },
  { label: "When can I pull up? ⌚", bg: "#E6F2EA", border: "#C6C7C6" },
  { label: "Venmo or Cash? 💸", bg: "#E8ECF3", border: "#C6C7C6" },
  { label: "Guest parking? 🚗", bg: "#FFE6D6", border: "#C6C7C6" },
];

const COSEEKER_CHIPS: { label: string; bg: string; border: string }[] = [
  { label: "Hey! Love your profile ✨", bg: "#E6F2EA", border: "#C6C7C6" },
  { label: "What is your major?", bg: "#FFE6D6", border: "#C6C7C6" },
  { label: "Are you a night owl? 🦇", bg: "#E8ECF3", border: "#C6C7C6" },
  { label: "Wanna grab coffee and chat? ☕", bg: "#FFE6D6", border: "#C6C7C6" },
];

const SUBLEASE_CHIPS: { label: string; bg: string; border: string }[] = [
  { label: "Is this still available? 🔑", bg: "#E8ECF3", border: "#8E9090" },
  { label: "Are utilities included? 💡", bg: "#E8ECF3", border: "#C6C7C6" },
  { label: "Can I schedule a tour? 📅", bg: "#FFE6D6", border: "#C6C7C6" },
  { label: "Is it furnished? 🛋️", bg: "#E6F2EA", border: "#C6C7C6" },
];

function IcebreakerChip({ item, onPress }: { item: typeof CRASH_CASH_CHIPS[0]; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.88, useNativeDriver: true, speed: 50, bounciness: 0 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 14 }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handlePress}
        style={[icStyles.chip, { backgroundColor: item.bg, borderColor: item.border }]}
      >
        <Text style={icStyles.chipText}>{item.label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const icStyles = StyleSheet.create({
  row: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    alignItems: "center",
    backgroundColor: WARM_CREAM,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  chipText: {
    ...font.semibold,
    fontSize: 13,
    color: DARK_TEAL,
  },
});

function formatTimestamp(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function MessageBubble({ msg, isOwn, onRetry }: { msg: ChatMessage; isOwn: boolean; onRetry: () => void }) {
  const failed = msg.status === "failed";
  return (
    <View style={[styles.bubbleRow, isOwn && styles.bubbleRowOwn]}>
      <TouchableOpacity
        activeOpacity={failed ? 0.7 : 1}
        disabled={!failed}
        onPress={onRetry}
        style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther, msg.status && styles.bubbleUnsent]}
      >
        <Text style={[styles.bubbleText, isOwn && styles.bubbleTextOwn]}>{msg.content}</Text>
        {failed ? (
          <Text style={styles.failedText}>Not sent · tap to retry</Text>
        ) : (
          <Text style={[styles.bubbleTime, isOwn && styles.bubbleTimeOwn]}>
            {msg.status === "sending" ? "Sending…" : formatTimestamp(msg.createdAt)}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ conversationId: string; source?: string }>();
  const {
    conversations, currentUser, getMessages, sendMessage, retryMessage,
    refreshMessages, refreshConversations, messagingError,
  } = useApp();
  const [text, setText] = useState("");
  const source = params.source || "sublease";
  const activeChips = source === "crash_cash" ? CRASH_CASH_CHIPS
    : source === "coseeker" ? COSEEKER_CHIPS
    : SUBLEASE_CHIPS;
  const flatListRef = useRef<FlatList>(null);

  const convo = conversations.find(c => c.id === params.conversationId);
  const messages = getMessages(params.conversationId || "");

  // The other person's replies only arrive by polling.
  usePolling(() => refreshMessages(params.conversationId || ""), CHAT_POLL_MS, !!params.conversationId);
  // Opened from a link before the inbox has loaded: fetch the list before giving up on it.
  const [convoListLoaded, setConvoListLoaded] = useState(false);
  usePolling(
    () => refreshConversations().finally(() => setConvoListLoaded(true)),
    CHAT_POLL_MS,
    !convo,
  );
  const invertedMessages = [...messages].reverse();

  const { isDesktop, contentMaxWidth } = useResponsive();
  const topPadding = Platform.OS === "web" ? (isDesktop ? 24 : 32) : insets.top;

  const handleSend = useCallback(() => {
    if (!text.trim() || !params.conversationId) return;
    sendMessage(params.conversationId, text.trim());
    setText("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [text, params.conversationId, sendMessage]);

  if (!convo) {
    return (
      <View style={[styles.container, { paddingTop: topPadding + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={DARK_TEAL} />
        </TouchableOpacity>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{convoListLoaded ? "Conversation not found" : "Loading…"}</Text>
        </View>
      </View>
    );
  }

  const contextLabel = source === "crash_cash" ? "🚨 Crash & Cash"
    : source === "coseeker" ? "✨ Co-seeker Match"
    : convo.listingBuilding ? `🔑 ${convo.listingBuilding}` : "🔑 Sublease";

  return (
    <KeyboardAvoidingView
      style={[styles.container, isDesktop && { maxWidth: contentMaxWidth, alignSelf: "center" as const, width: "100%" }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { paddingTop: topPadding + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={DARK_TEAL} />
        </TouchableOpacity>
        <CustomAvatar
          name={convo.otherUserName || "?"}
          avatarColor={convo.otherUserAvatar || Colors.ocean}
          profileImage={convo.otherUserProfileImage}
          size={38}
        />
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>{convo.otherUserName}</Text>
          <Text style={styles.headerContext} numberOfLines={1}>{contextLabel}</Text>
        </View>
      </View>

      {messagingError && (
        <View style={styles.errorBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color={Colors.alertRed} />
          <Text style={styles.errorText}>
            {"Messages aren't syncing right now. Unsent ones stay here and keep retrying."}
            {__DEV__ ? `\n${messagingError}` : ""}
          </Text>
        </View>
      )}

      {source === "sublease" && convo.listingPrice > 0 && (
        <View style={styles.listingPreview}>
          <Ionicons name="home-outline" size={16} color={DARK_TEAL} />
          <Text style={styles.listingPreviewText} numberOfLines={1}>
            {convo.listingUnitType
              ? `${convo.listingUnitType} — $${convo.listingPrice}/mo`
              : convo.listingBuilding}
          </Text>
          {!convo.listingUnitType && (
            <Text style={styles.listingPreviewPrice}>${convo.listingPrice}/mo</Text>
          )}
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={invertedMessages}
        inverted={messages.length > 0}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <MessageBubble
            msg={item}
            isOwn={!!item.status || item.senderId === currentUser?.id}
            onRetry={() => retryMessage(item.id)}
          />
        )}
        contentContainerStyle={[styles.messageList, messages.length === 0 && styles.messageListEmpty]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyMessages}>
            <Ionicons name="chatbubble-ellipses-outline" size={36} color={Colors.textLight} />
            <Text style={styles.emptyMessagesText}>Start the conversation</Text>
          </View>
        }
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={icStyles.row}
        style={{ flexGrow: 0, borderTopWidth: 1, borderTopColor: "#E6E7E8", backgroundColor: WARM_CREAM }}
      >
        {activeChips.map((ic, idx) => (
          <IcebreakerChip
            key={idx}
            item={ic}
            onPress={() => {
              if (params.conversationId) {
                sendMessage(params.conversationId, ic.label);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            }}
          />
        ))}
      </ScrollView>

      <View style={[styles.inputBar, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 8 }]}>
        <TextInput
          style={styles.textInput}
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          placeholderTextColor={Colors.textLight}
          multiline
          maxLength={1000}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !text.trim() && { opacity: 0.4 }]}
          onPress={handleSend}
          disabled={!text.trim()}
        >
          <Ionicons name="send" size={18} color={Colors.white} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WARM_CREAM,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: WARM_CREAM,
    borderBottomWidth: 1,
    borderBottomColor: "#E6E7E8",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#E8ECF3",
    alignItems: "center",
    justifyContent: "center",
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    ...font.bold,
    fontSize: 16,
    color: DARK_TEAL,
  },
  headerContext: {
    ...font.semibold,
    fontSize: 12,
    color: Colors.textMuted,
  },
  listingPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: "#E8ECF3",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  listingPreviewText: {
    ...font.semibold,
    fontSize: 13,
    color: DARK_TEAL,
    flex: 1,
  },
  listingPreviewPrice: {
    ...font.heavy,
    fontSize: 14,
    color: DARK_TEAL,
  },
  messageList: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  messageListEmpty: {
    flex: 1,
    justifyContent: "center",
  },
  emptyMessages: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 40,
  },
  emptyMessagesText: {
    ...font.semibold,
    fontSize: 14,
    color: Colors.textLight,
  },
  bubbleRow: {
    flexDirection: "row",
    marginBottom: 8,
    justifyContent: "flex-start",
  },
  bubbleRowOwn: {
    justifyContent: "flex-end",
  },
  bubble: {
    maxWidth: "78%",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  bubbleOwn: {
    backgroundColor: SENT_CORAL,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: RECEIVED_SEAFOAM,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    ...font.regular,
    fontSize: 15,
    color: DARK_TEAL,
    lineHeight: 21,
  },
  bubbleTextOwn: {
    color: Colors.onOrange,   // navy on orange, 4.76:1; white would be 3.05:1
  },
  bubbleTime: {
    ...font.regular,
    fontSize: 10,
    color: Colors.textSecondaryOnBg,
    alignSelf: "flex-end",
  },
  bubbleTimeOwn: {
    color: Colors.onOrange,
  },
  bubbleUnsent: {
    opacity: 0.75,
  },
  failedText: {
    ...font.bold,
    fontSize: 11,
    color: Colors.white,
    alignSelf: "flex-end",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FDECEA",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  errorText: {
    flex: 1,
    ...font.semibold,
    fontSize: 12,
    color: Colors.alertRed,
    lineHeight: 17,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: WARM_CREAM,
    borderTopWidth: 1,
    borderTopColor: "#E6E7E8",
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    ...font.regular,
    fontSize: 15,
    color: DARK_TEAL,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: DARK_TEAL + "30",
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DARK_TEAL,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    ...font.semibold,
    fontSize: 16,
    color: Colors.textMuted,
  },
});
