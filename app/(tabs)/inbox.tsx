import React from "react";
import { View, Text, StyleSheet, Platform, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useApp, Conversation, ConversationSource } from "@/context/AppContext";
import { useResponsive } from "@/hooks/useResponsive";
import CustomAvatar from "@/components/CustomAvatar";
import { usePolling } from "@/hooks/usePolling";
import { font } from "@/constants/typography";
import { Group, Row, ScreenTitle } from "@/components/ui/Grouped";

const DARK_TEAL = "#13294B";
const INBOX_POLL_MS = 5000;

const BADGE_CONFIG: Record<string, { bg: string; label: string; color: string }> = {
  crash_cash: { bg: "#FFE6D6", label: "🚨 Urgent", color: "#B3261E" },
  coseeker: { bg: "#E6F2EA", label: "✨ Co-seeker", color: DARK_TEAL },
  sublease: { bg: "#E8ECF3", label: "🔑 Sublease", color: DARK_TEAL },
};

function inferSource(convo: Conversation): ConversationSource {
  if (convo.source) return convo.source;
  if (convo.listingId?.startsWith("match_")) return "coseeker";
  if (convo.listingBuilding?.startsWith("Crash")) return "crash_cash";
  return "sublease";
}

function formatTime(ts?: number) {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** One conversation as a grouped-list row: who, what it's about, the last message, when. */
function conversationRow(convo: Conversation) {
  const src = inferSource(convo);
  const badge = BADGE_CONFIG[src];
  const about = src === "sublease" && convo.listingBuilding ? `${badge.label} · ${convo.listingBuilding}` : badge.label;
  const preview = convo.lastMessage || "No messages yet";
  return (
    <Row
      key={convo.id}
      leading={<CustomAvatar name={convo.otherUserName || "?"} avatarColor={convo.otherUserAvatar || Colors.ocean}
        profileImage={convo.otherUserProfileImage} size={44} />}
      title={convo.otherUserName || "User"}
      subtitle={`${about} — ${preview}`}
      subtitleLines={2}
      detail={<Text style={styles.convoTime}>{formatTime(convo.lastMessageAt)}</Text>}
      onPress={() => router.push(`/chat?conversationId=${convo.id}&source=${src}`)}
    />
  );
}

export default function InboxScreen() {
  const insets = useSafeAreaInsets();
  const { isDesktop, contentMaxWidth } = useResponsive();
  const topPadding = Platform.OS === "web" ? (isDesktop ? 24 : 32) : insets.top;
  const { conversations, refreshConversations, messagingError } = useApp();
  usePolling(refreshConversations, INBOX_POLL_MS);

  const sorted = [...conversations].sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));

  return (
    <View style={[styles.container, { paddingTop: topPadding + 12 }]}>
      <View style={{ maxWidth: contentMaxWidth, alignSelf: "center" as const, width: "100%", flex: 1 }}>
        <ScreenTitle title="Inbox" subtitle="Your conversations" />
        {messagingError && (
          <View style={styles.errorBanner}>
            <Ionicons name="cloud-offline-outline" size={16} color={Colors.alertRed} />
            <Text style={styles.errorText}>
              {"Conversations aren't syncing — showing what's saved on this device. Retrying."}
              {__DEV__ ? `\n${messagingError}` : ""}
            </Text>
          </View>
        )}
        {sorted.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={52} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptySub}>
              Message someone about a listing to start a conversation.
            </Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + (isDesktop ? 40 : 120) }}
          >
            <Group>{sorted.map(conversationRow)}</Group>
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    paddingHorizontal: 16,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FDECEA",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    ...font.semibold,
    fontSize: 12,
    color: Colors.alertRed,
    lineHeight: 17,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 100,
    gap: 12,
  },
  emptyTitle: {
    ...font.bold,
    fontSize: 18,
    color: DARK_TEAL,
    marginTop: 8,
  },
  emptySub: {
    ...font.regular,
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: "center",
    maxWidth: 260,
    lineHeight: 20,
  },
  convoTime: {
    ...font.regular,
    fontSize: 11,
    color: Colors.textLight,
    marginLeft: 8,
  },
});
