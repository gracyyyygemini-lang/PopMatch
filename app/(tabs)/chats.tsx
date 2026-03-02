import React, { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, RefreshControl, ActivityIndicator
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import Colors from "@/constants/colors";
import { useApp, MOCK_USERS } from "@/context/AppContext";
import { getApiUrl } from "@/lib/query-client";

interface Conversation {
  id: string;
  type: string;
  listing_id: string;
  listing_title: string;
  last_message_at: string;
  participants: string[];
  last_message: string | null;
  last_sender: string | null;
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60000) return "now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return `${Math.floor(diff / 86400000)}d`;
}

export default function ChatsScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser } = useApp();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const fetchConversations = useCallback(async () => {
    if (!currentUser?.email) return;
    try {
      const url = new URL("/api/conversations", getApiUrl());
      url.searchParams.set("userEmail", currentUser.email);
      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [currentUser?.email]);

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, [fetchConversations])
  );

  const getOtherEmail = (conv: Conversation) =>
    conv.participants.find(e => e !== currentUser?.email) ?? "";

  const getOtherUser = (email: string) => {
    const mock = MOCK_USERS.find(u => u.email === email);
    return mock ? { name: mock.name, avatarColor: mock.avatarColor } : { name: email.split("@")[0], avatarColor: Colors.ocean };
  };

  const handleOpen = (conv: Conversation) => {
    const otherEmail = getOtherEmail(conv);
    const other = getOtherUser(otherEmail);
    router.push({
      pathname: "/chat/[id]",
      params: {
        id: conv.id,
        otherEmail,
        otherName: other.name,
        listingTitle: conv.listing_title || "",
      },
    });
  };

  const renderItem = ({ item }: { item: Conversation }) => {
    const otherEmail = getOtherEmail(item);
    const other = getOtherUser(otherEmail);
    const initials = other.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
    const preview = item.last_message
      ? (item.last_sender === currentUser?.email ? `You: ${item.last_message}` : item.last_message)
      : (item.listing_title ? `About: ${item.listing_title}` : "Say hello!");

    return (
      <TouchableOpacity style={ch.row} onPress={() => handleOpen(item)} activeOpacity={0.75}>
        <View style={[ch.avatar, { backgroundColor: other.avatarColor }]}>
          <Text style={ch.avatarText}>{initials}</Text>
        </View>
        <View style={ch.rowInfo}>
          <View style={ch.rowTop}>
            <Text style={ch.rowName} numberOfLines={1}>{other.name}</Text>
            <Text style={ch.rowTime}>{timeAgo(item.last_message_at)}</Text>
          </View>
          {item.listing_title ? (
            <View style={ch.listingTag}>
              <Ionicons name="home-outline" size={10} color={Colors.ocean} />
              <Text style={ch.listingTagText} numberOfLines={1}>{item.listing_title}</Text>
            </View>
          ) : null}
          <Text style={ch.preview} numberOfLines={1}>{preview}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={Colors.borderSoft} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[ch.container, { backgroundColor: Colors.sand }]}>
      <View style={[ch.header, { paddingTop: topPadding + 12 }]}>
        <Text style={ch.title}>Chats</Text>
      </View>

      {loading ? (
        <View style={ch.centered}>
          <ActivityIndicator color={Colors.ocean} />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={c => c.id}
          renderItem={renderItem}
          contentContainerStyle={[ch.list, {
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 90
          }]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!conversations.length}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchConversations(); }}
              tintColor={Colors.ocean}
            />
          }
          ListEmptyComponent={
            <View style={ch.empty}>
              <Ionicons name="chatbubbles-outline" size={52} color={Colors.textLight} />
              <Text style={ch.emptyTitle}>No chats yet</Text>
              <Text style={ch.emptySub}>
                Connect with someone in the Matchmaker, or message a subleaser to get started.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const ch = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20, paddingBottom: 12,
    backgroundColor: Colors.cardBg,
    borderBottomWidth: 1, borderBottomColor: Colors.borderSoft,
  },
  title: { fontFamily: "Nunito_800ExtraBold", fontSize: 28, color: Colors.ocean },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingTop: 4 },
  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: Colors.cardBg,
    borderBottomWidth: 1, borderBottomColor: Colors.borderSoft,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontFamily: "Nunito_700Bold", fontSize: 16, color: Colors.white },
  rowInfo: { flex: 1, gap: 2 },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowName: { fontFamily: "Nunito_700Bold", fontSize: 15, color: Colors.charcoal, flex: 1 },
  rowTime: { fontFamily: "Nunito_400Regular", fontSize: 11, color: Colors.textLight },
  listingTag: {
    flexDirection: "row", alignItems: "center", gap: 3, alignSelf: "flex-start",
  },
  listingTagText: { fontFamily: "Nunito_600SemiBold", fontSize: 10, color: Colors.ocean },
  preview: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textMuted },
  empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: 40, gap: 10 },
  emptyTitle: { fontFamily: "Nunito_700Bold", fontSize: 20, color: Colors.charcoal },
  emptySub: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textMuted, textAlign: "center", lineHeight: 20 },
});
