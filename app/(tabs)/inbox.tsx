import React from "react";
import { View, Text, StyleSheet, Platform, FlatList, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useApp, Conversation } from "@/context/AppContext";

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

function ConversationRow({ convo }: { convo: Conversation }) {
  const initial = (convo.otherUserName || "?")[0].toUpperCase();

  return (
    <TouchableOpacity
      style={styles.convoRow}
      activeOpacity={0.7}
      onPress={() => router.push(`/chat?conversationId=${convo.id}`)}
    >
      <View style={[styles.avatar, { backgroundColor: convo.otherUserAvatar || Colors.ocean }]}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>
      <View style={styles.convoContent}>
        <View style={styles.convoHeader}>
          <Text style={styles.convoName} numberOfLines={1}>{convo.otherUserName || "User"}</Text>
          <Text style={styles.convoTime}>{formatTime(convo.lastMessageAt)}</Text>
        </View>
        <View style={styles.convoMeta}>
          <Ionicons name="home-outline" size={11} color={Colors.textLight} />
          <Text style={styles.convoBuilding} numberOfLines={1}>
            {convo.listingBuilding} · ${convo.listingPrice}/mo
          </Text>
        </View>
        {convo.lastMessage ? (
          <Text style={styles.convoPreview} numberOfLines={1}>{convo.lastMessage}</Text>
        ) : (
          <Text style={[styles.convoPreview, { fontStyle: "italic" }]}>No messages yet</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function InboxScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const { conversations } = useApp();

  const sorted = [...conversations].sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));

  return (
    <View style={[styles.container, { paddingTop: topPadding + 12 }]}>
      <Text style={styles.headerTitle}>Inbox</Text>
      {sorted.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={52} color={Colors.textLight} />
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptySub}>
            Message someone about a listing to start a conversation.
          </Text>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <ConversationRow convo={item} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 90 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.sand,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 28,
    color: Colors.charcoal,
    marginBottom: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 100,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: "Nunito_700Bold",
    fontSize: 18,
    color: Colors.charcoal,
    marginTop: 8,
  },
  emptySub: {
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: "center",
    maxWidth: 260,
    lineHeight: 20,
  },
  convoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: Colors.cardBg,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderSoft,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 18,
    color: Colors.white,
  },
  convoContent: {
    flex: 1,
    gap: 3,
  },
  convoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  convoName: {
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
    color: Colors.charcoal,
    flex: 1,
  },
  convoTime: {
    fontFamily: "Nunito_400Regular",
    fontSize: 11,
    color: Colors.textLight,
    marginLeft: 8,
  },
  convoMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  convoBuilding: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 12,
    color: Colors.textMuted,
    flex: 1,
  },
  convoPreview: {
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    color: Colors.textLight,
  },
});
