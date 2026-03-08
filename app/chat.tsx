import React, { useState, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  Platform, KeyboardAvoidingView
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useApp, ChatMessage } from "@/context/AppContext";
import { useResponsive } from "@/hooks/useResponsive";

function formatTimestamp(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function MessageBubble({ msg, isOwn }: { msg: ChatMessage; isOwn: boolean }) {
  return (
    <View style={[styles.bubbleRow, isOwn && styles.bubbleRowOwn]}>
      <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
        <Text style={[styles.bubbleText, isOwn && styles.bubbleTextOwn]}>{msg.content}</Text>
        <Text style={[styles.bubbleTime, isOwn && styles.bubbleTimeOwn]}>{formatTimestamp(msg.createdAt)}</Text>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ conversationId: string }>();
  const { conversations, currentUser, getMessages, sendMessage } = useApp();
  const [text, setText] = useState("");
  const flatListRef = useRef<FlatList>(null);

  const convo = conversations.find(c => c.id === params.conversationId);
  const messages = getMessages(params.conversationId || "");
  const invertedMessages = [...messages].reverse();

  const { isDesktop, contentMaxWidth } = useResponsive();
  const topPadding = Platform.OS === "web" ? (isDesktop ? 24 : 67) : insets.top;

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
          <Ionicons name="arrow-back" size={20} color={Colors.ocean} />
        </TouchableOpacity>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Conversation not found</Text>
        </View>
      </View>
    );
  }

  const initial = (convo.otherUserName || "?")[0].toUpperCase();

  return (
    <KeyboardAvoidingView
      style={[styles.container, isDesktop && { maxWidth: contentMaxWidth, alignSelf: "center" as const, width: "100%" }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { paddingTop: topPadding + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.ocean} />
        </TouchableOpacity>
        <View style={[styles.headerAvatar, { backgroundColor: convo.otherUserAvatar || Colors.ocean }]}>
          <Text style={styles.headerAvatarText}>{initial}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>{convo.otherUserName}</Text>
          <Text style={styles.headerEmail} numberOfLines={1}>{convo.otherUserEmail}</Text>
        </View>
      </View>

      <View style={styles.listingPreview}>
        <Ionicons name="home-outline" size={16} color={Colors.ocean} />
        <Text style={styles.listingPreviewText} numberOfLines={1}>
          {convo.listingUnitType
            ? `${convo.listingUnitType} — $${convo.listingPrice}/mo`
            : convo.listingBuilding}
        </Text>
        {!convo.listingUnitType && (
          <Text style={styles.listingPreviewPrice}>${convo.listingPrice}/mo</Text>
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={invertedMessages}
        inverted={messages.length > 0}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <MessageBubble msg={item} isOwn={item.senderId === currentUser?.id} />
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
    backgroundColor: Colors.sand,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: Colors.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSoft,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.sand,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 15,
    color: Colors.white,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
    color: Colors.charcoal,
  },
  headerEmail: {
    fontFamily: "Nunito_400Regular",
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
    backgroundColor: Colors.ocean + "0D",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.ocean + "20",
  },
  listingPreviewText: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 13,
    color: Colors.ocean,
    flex: 1,
  },
  listingPreviewPrice: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 14,
    color: Colors.ocean,
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
    fontFamily: "Nunito_600SemiBold",
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
    backgroundColor: Colors.ocean,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: Colors.cardBg,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.borderSoft,
  },
  bubbleText: {
    fontFamily: "Nunito_400Regular",
    fontSize: 15,
    color: Colors.charcoal,
    lineHeight: 21,
  },
  bubbleTextOwn: {
    color: Colors.white,
  },
  bubbleTime: {
    fontFamily: "Nunito_400Regular",
    fontSize: 10,
    color: Colors.textLight,
    alignSelf: "flex-end",
  },
  bubbleTimeOwn: {
    color: "rgba(255,255,255,0.65)",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: Colors.cardBg,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSoft,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.sand,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontFamily: "Nunito_400Regular",
    fontSize: 15,
    color: Colors.charcoal,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: Colors.borderSoft,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.ocean,
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
    fontFamily: "Nunito_600SemiBold",
    fontSize: 16,
    color: Colors.textMuted,
  },
});
