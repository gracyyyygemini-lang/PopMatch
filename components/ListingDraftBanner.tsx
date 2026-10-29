import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import { font } from "@/constants/typography";
import { ListingDraft, loadListingDraft, saveListingDraft, listingWizardHref } from "@/lib/listingDraft";

/**
 * Shown on Home while a Host or Sublessor has an unpublished listing draft.
 * Dismissing hides it until they next edit the draft.
 */
export function ListingDraftBanner() {
  const { currentUser } = useApp();
  const [draft, setDraft] = useState<ListingDraft | null>(null);

  // Re-read on focus: the wizard saves and clears the draft from another screen.
  useFocusEffect(useCallback(() => {
    let active = true;
    loadListingDraft(currentUser?.email).then(d => { if (active) setDraft(d); });
    return () => { active = false; };
  }, [currentUser?.email]));

  if (!draft || draft.bannerDismissed) return null;

  const dismiss = () => {
    Haptics.selectionAsync();
    const next = { ...draft, bannerDismissed: true };
    setDraft(next);
    saveListingDraft(currentUser?.email, next);
  };

  return (
    <View style={styles.banner}>
      <Ionicons name="home-outline" size={18} color={Colors.ocean} />
      <View style={styles.content}>
        <Text style={styles.title}>{"Your listing isn't live yet"}</Text>
        <TouchableOpacity onPress={() => router.push(listingWizardHref(draft.mode))} accessibilityRole="link">
          <Text style={styles.link}>Finish your listing</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={dismiss} style={styles.closeBtn} accessibilityLabel="Dismiss">
        <Ionicons name="close" size={18} color={Colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#E8ECF3",
    borderLeftWidth: 3, borderLeftColor: Colors.ocean,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12,
  },
  content: { flex: 1 },
  title: { ...font.bold, fontSize: 13, color: Colors.charcoal },
  link: { ...font.bold, fontSize: 13, color: Colors.ocean, textDecorationLine: "underline", marginTop: 2 },
  closeBtn: { padding: 4 },
});
