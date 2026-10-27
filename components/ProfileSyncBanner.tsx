import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";

/**
 * Shown on every screen while the profile exists only on this device. A failed
 * save used to be a console.warn, so a broken API URL went unnoticed; this
 * makes it impossible to miss. Not dismissible — it clears once the save lands.
 */
export function ProfileSyncBanner() {
  const { profileSyncError, retryProfileSync } = useApp();
  const insets = useSafeAreaInsets();
  const [retrying, setRetrying] = useState(false);
  if (!profileSyncError) return null;

  const retry = async () => {
    if (retrying) return;
    Haptics.selectionAsync();
    setRetrying(true);
    try {
      await retryProfileSync();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <View style={[styles.banner, { paddingTop: (Platform.OS === "web" ? 0 : insets.top) + 10 }]}>
      <Ionicons name="cloud-offline-outline" size={18} color={Colors.alertRed} />
      <View style={styles.content}>
        <Text style={styles.title}>Your profile isn't saved yet</Text>
        <Text style={styles.body}>
          Other students can't see you until it reaches the server. Retrying automatically.
        </Text>
        {__DEV__ && <Text style={styles.detail} numberOfLines={3}>{profileSyncError}</Text>}
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
    paddingHorizontal: 14, paddingBottom: 10,
  },
  content: { flex: 1 },
  title: { fontFamily: "Nunito_700Bold", fontSize: 13, color: Colors.alertRed },
  body: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.charcoal, lineHeight: 17, marginTop: 2 },
  detail: { fontFamily: "Nunito_400Regular", fontSize: 11, color: Colors.textMuted, lineHeight: 15, marginTop: 4 },
  retryBtn: {
    backgroundColor: Colors.alertRed, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, alignSelf: "center",
  },
  retryText: { fontFamily: "Nunito_700Bold", fontSize: 12, color: Colors.white },
});
