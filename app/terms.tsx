import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import Colors from "@/constants/colors";
import { font } from "@/constants/typography";
import { TERMS_IS_DRAFT, TERMS_VERSION, termsSections } from "@/constants/terms";
import { useApp } from "@/context/AppContext";
import { useResponsive } from "@/hooks/useResponsive";
import { ScreenTitle } from "@/components/ui/Grouped";
import { SUPPORT_EMAIL } from "@/lib/reports";
import { showError } from "@/lib/alert";

/**
 * The Terms of Use. With ?accept=1 it's the gate for a signed-in student who
 * hasn't agreed to the current version (see app/(tabs)/_layout.tsx): no way
 * back, just "Agree and continue".
 */
export default function TermsScreen() {
  const insets = useSafeAreaInsets();
  const { accept } = useLocalSearchParams<{ accept?: string }>();
  const accepting = accept === "1";
  const { currentUser, setCurrentUser } = useApp();
  const { isDesktop, contentMaxWidth } = useResponsive();
  const topPadding = Platform.OS === "web" ? (isDesktop ? 24 : 32) : insets.top + 8;
  const [saving, setSaving] = useState(false);

  const agree = async () => {
    if (!currentUser || saving) return;
    setSaving(true);
    try {
      // Saved on this device at once; the server copy follows (and is retried).
      await setCurrentUser({ ...currentUser, termsVersion: TERMS_VERSION });
      router.replace("/(tabs)");
    } catch (error) {
      showError("Couldn't save that", error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, {
        paddingTop: topPadding, paddingBottom: insets.bottom + (accepting ? 120 : 40),
        maxWidth: Math.min(contentMaxWidth, 680), paddingHorizontal: isDesktop ? 32 : 16,
      }]}>
        {!accepting && (
          <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/profile"))}
            style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={22} color={Colors.illiniBlue} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        )}
        <ScreenTitle title="Terms of Use" subtitle={accepting ? "Please read and agree to keep using PopMatch" : `Version ${TERMS_VERSION}`} />
        {TERMS_IS_DRAFT && (
          <View style={styles.draft} accessibilityRole="text">
            <Text style={styles.draftText}>DRAFT. Not yet reviewed, and not legal advice.</Text>
          </View>
        )}
        {termsSections(SUPPORT_EMAIL).map(section => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle} accessibilityRole="header">{section.title}</Text>
            {section.paragraphs.map((p, i) => <Text key={i} style={styles.paragraph}>{p}</Text>)}
          </View>
        ))}
      </ScrollView>

      {accepting && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity style={styles.agreeBtn} onPress={agree} disabled={saving} accessibilityRole="button">
            {saving ? <ActivityIndicator color={Colors.onOrange} /> : <Text style={styles.agreeText}>Agree and continue</Text>}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { alignSelf: "center", width: "100%" },
  back: { flexDirection: "row", alignItems: "center", gap: 2, marginBottom: 8, alignSelf: "flex-start", minHeight: 44 },
  backText: { ...font.medium, fontSize: 16, color: Colors.illiniBlue },
  draft: { backgroundColor: Colors.orangeTint, borderRadius: 10, padding: 10, marginTop: 8 },
  draftText: { ...font.bold, fontSize: 13, color: Colors.earth },
  section: { backgroundColor: Colors.card, borderRadius: 14, padding: 16, marginTop: 12, gap: 8 },
  sectionTitle: { ...font.bold, fontSize: 16, color: Colors.textPrimary },
  paragraph: { ...font.regular, fontSize: 15, lineHeight: 22, color: Colors.textPrimary },
  footer: {
    position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: Colors.bg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.hairline,
  },
  agreeBtn: { backgroundColor: Colors.illiniOrange, borderRadius: 14, minHeight: 52, alignItems: "center", justifyContent: "center" },
  agreeText: { ...font.bold, fontSize: 16, color: Colors.onOrange },
});
