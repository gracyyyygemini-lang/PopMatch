import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import { font } from "@/constants/typography";

/**
 * Shown on the marketplace and Crash & Cash feeds while listings can't be
 * loaded, so a stale cached feed never passes for a live one. Clears itself
 * once a refresh succeeds (AppContext retries in the background).
 */
export function PostsSyncBanner() {
  const { postsError, refreshPosts } = useApp();
  const [retrying, setRetrying] = useState(false);
  if (!postsError) return null;

  const retry = async () => {
    if (retrying) return;
    Haptics.selectionAsync();
    setRetrying(true);
    try {
      await refreshPosts();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <View style={styles.banner}>
      <Ionicons name="cloud-offline-outline" size={18} color={Colors.alertRed} />
      <View style={styles.content}>
        <Text style={styles.title}>{"Can't load the latest posts"}</Text>
        <Text style={styles.body}>{"Showing what's saved on this device. Retrying automatically."}</Text>
        {__DEV__ && <Text style={styles.detail} numberOfLines={3}>{postsError}</Text>}
      </View>
      <TouchableOpacity onPress={retry} style={styles.retryBtn} disabled={retrying}>
        <Text style={styles.retryText}>{retrying ? "Retrying…" : "Retry"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: "#FDECEA",
    borderBottomWidth: 2, borderBottomColor: Colors.alertRed,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  content: { flex: 1 },
  title: { ...font.bold, fontSize: 13, color: Colors.alertRed },
  body: { ...font.regular, fontSize: 12, color: Colors.charcoal, lineHeight: 17, marginTop: 2 },
  detail: { ...font.regular, fontSize: 11, color: Colors.textMuted, lineHeight: 15, marginTop: 4 },
  retryBtn: {
    backgroundColor: Colors.alertRed, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, alignSelf: "center",
  },
  retryText: { ...font.bold, fontSize: 12, color: Colors.white },
});
