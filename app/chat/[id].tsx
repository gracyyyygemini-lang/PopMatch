import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  Platform, KeyboardAvoidingView, ActivityIndicator
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import { getApiUrl } from "@/lib/query-client";

interface Message {
  id: number;
  conversationId: string;
  senderEmail: string;
  content: string;
  createdAt: string;
}

export default function ChatScreen() {
  const { id, otherEmail, otherName, listingTitle } = useLocalSearchParams<{
    id: string;
    otherEmail: string;
    otherName: string;
    listingTitle?: string;
  }>();
  const insets = useSafeAreaInsets();
  const { currentUser } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const myEmail = currentUser?.email ?? "";

  const initials = (name: string) =>
    name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  const fetchMessages = useCallback(async () => {
    if (!id) return;
    try {
      const url = new URL(`/api/conversations/${id}/messages`, getApiUrl()).toString();
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch {}
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchMessages();
    pollRef.current = setInterval(fetchMessages, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchMessages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !id || !myEmail || sending) return;
    setInput("");
    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const url = new URL(`/api/conversations/${id}/messages`, getApiUrl()).toString();
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderEmail: myEmail, content: text }),
      });
      await fetchMessages();
    } catch {}
    setSending(false);
  };

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const avatarColor = Colors.ocean;

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.senderEmail === myEmail;
    const isSystem = item.senderEmail === "system";

    if (isSystem) {
      return (
        <View style={cs.systemRow}>
          <View style={cs.systemBubble}>
            <Ionicons name="heart" size={12} color={Colors.grassGreen} />
            <Text style={cs.systemText}>{item.content}</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={[cs.msgRow, isMe ? cs.msgRowMe : cs.msgRowThem]}>
        {!isMe && (
          <View style={[cs.msgAvatar, { backgroundColor: avatarColor }]}>
            <Text style={cs.msgAvatarText}>{initials(otherName || otherEmail || "?")}</Text>
          </View>
        )}
        <View style={[cs.bubble, isMe ? cs.bubbleMe : cs.bubbleThem]}>
          <Text style={[cs.bubbleText, isMe ? cs.bubbleTextMe : cs.bubbleTextThem]}>
            {item.content}
          </Text>
          <Text style={[cs.bubbleTime, isMe ? cs.bubbleTimeMe : cs.bubbleTimeThem]}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[cs.container]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={[cs.header, { paddingTop: topPadding + 10 }]}>
        <TouchableOpacity style={cs.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.ocean} />
        </TouchableOpacity>
        <View style={[cs.headerAvatar, { backgroundColor: avatarColor }]}>
          <Text style={cs.headerAvatarText}>{initials(otherName || otherEmail || "?")}</Text>
        </View>
        <View style={cs.headerInfo}>
          <Text style={cs.headerName}>{otherName || otherEmail}</Text>
          {listingTitle ? (
            <View style={cs.listingChip}>
              <Ionicons name="home-outline" size={10} color={Colors.ocean} />
              <Text style={cs.listingChipText} numberOfLines={1}>{listingTitle}</Text>
            </View>
          ) : (
            <Text style={cs.headerSub}>{otherEmail}</Text>
          )}
        </View>
      </View>

      {listingTitle ? (
        <View style={cs.listingBanner}>
          <Ionicons name="home" size={14} color={Colors.ocean} />
          <Text style={cs.listingBannerText}>Discussing: {listingTitle}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={cs.centered}>
          <ActivityIndicator color={Colors.ocean} />
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={m => m.id.toString()}
          renderItem={renderMessage}
          inverted
          contentContainerStyle={{ padding: 16, gap: 8, flexGrow: 1, justifyContent: "flex-end" }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={!!messages.length}
          ListEmptyComponent={
            <View style={cs.emptyState}>
              <Ionicons name="chatbubble-outline" size={36} color={Colors.textLight} />
              <Text style={cs.emptyText}>No messages yet</Text>
              <Text style={cs.emptySub}>Say hello!</Text>
            </View>
          }
        />
      )}

      <View style={[cs.inputBar, {
        paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 8,
      }]}>
        <TextInput
          style={cs.input}
          value={input}
          onChangeText={setInput}
          placeholder="Type a message..."
          placeholderTextColor={Colors.textLight}
          multiline
          maxLength={500}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[cs.sendBtn, (!input.trim() || sending) && cs.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!input.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Ionicons name="send" size={18} color={Colors.white} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const cs = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.sand },
  header: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: Colors.cardBg,
    borderBottomWidth: 1, borderBottomColor: Colors.borderSoft,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.sand,
    alignItems: "center", justifyContent: "center",
  },
  headerAvatar: {
    width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center",
  },
  headerAvatarText: { fontFamily: "Nunito_700Bold", fontSize: 13, color: Colors.white },
  headerInfo: { flex: 1 },
  headerName: { fontFamily: "Nunito_700Bold", fontSize: 16, color: Colors.charcoal },
  headerSub: { fontFamily: "Nunito_400Regular", fontSize: 11, color: Colors.textMuted },
  listingChip: {
    flexDirection: "row", alignItems: "center", gap: 3,
  },
  listingChipText: { fontFamily: "Nunito_600SemiBold", fontSize: 11, color: Colors.ocean },
  listingBanner: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: Colors.ocean + "12",
    paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: Colors.ocean + "20",
  },
  listingBannerText: { fontFamily: "Nunito_600SemiBold", fontSize: 12, color: Colors.ocean, flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  msgRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginVertical: 2 },
  msgRowMe: { justifyContent: "flex-end" },
  msgRowThem: { justifyContent: "flex-start" },
  msgAvatar: {
    width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center",
    alignSelf: "flex-end",
  },
  msgAvatarText: { fontFamily: "Nunito_700Bold", fontSize: 10, color: Colors.white },
  bubble: {
    maxWidth: "75%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, gap: 2,
  },
  bubbleMe: {
    backgroundColor: Colors.ocean, borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: Colors.cardBg, borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: Colors.borderSoft,
  },
  bubbleText: { fontFamily: "Nunito_400Regular", fontSize: 14, lineHeight: 20 },
  bubbleTextMe: { color: Colors.white },
  bubbleTextThem: { color: Colors.charcoal },
  bubbleTime: { fontFamily: "Nunito_400Regular", fontSize: 10 },
  bubbleTimeMe: { color: Colors.white + "99", textAlign: "right" },
  bubbleTimeThem: { color: Colors.textLight },
  systemRow: { alignItems: "center", marginVertical: 8 },
  systemBubble: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: Colors.grassGreen + "18",
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
  },
  systemText: { fontFamily: "Nunito_600SemiBold", fontSize: 12, color: Colors.grassGreen },
  inputBar: {
    flexDirection: "row", alignItems: "flex-end", gap: 10,
    paddingHorizontal: 16, paddingTop: 10,
    backgroundColor: Colors.cardBg,
    borderTopWidth: 1, borderTopColor: Colors.borderSoft,
  },
  input: {
    flex: 1, backgroundColor: Colors.sand, borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 10,
    fontFamily: "Nunito_400Regular", fontSize: 14, color: Colors.charcoal,
    maxHeight: 100, borderWidth: 1.5, borderColor: Colors.borderSoft,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: Colors.ocean, alignItems: "center", justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.4 },
  emptyState: { alignItems: "center", gap: 8, paddingTop: 40 },
  emptyText: { fontFamily: "Nunito_700Bold", fontSize: 16, color: Colors.textMuted },
  emptySub: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textLight },
});
