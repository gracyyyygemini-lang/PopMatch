import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, Alert
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { LANGUAGES, LangCode } from "@/lib/translations";
import { useApp } from "@/context/AppContext";

const LANG_COLORS: Partial<Record<LangCode, string>> = {
  en:  Colors.ocean,
  zh:  "#C0392B",
  yue: "#8E44AD",
  hi:  "#E67E22",
  te:  "#2ECC71",
  ta:  "#16A085",
  es:  "#E74C3C",
  ko:  "#2980B9",
  tl:  "#27AE60",
  ar:  "#1ABC9C",
  fr:  "#2C3E50",
  de:  "#D35400",
  ja:  "#C0392B",
};

export default function LanguageSelectScreen() {
  const insets = useSafeAreaInsets();
  const { setLanguage } = useApp();
  const [selected, setSelected] = useState<LangCode>("en");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleContinue = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await setLanguage(selected);
    router.replace("/onboarding");
  };

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.headerSection}>
        <View style={styles.logoRow}>
          <Ionicons name="home" size={28} color={Colors.ocean} />
          <Text style={styles.logoText}>PopMatch</Text>
        </View>
        <Text style={styles.title}>Choose your language</Text>
        <Text style={styles.subtitle}>
          Select the language you're most comfortable with
        </Text>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={[styles.listContent, { paddingBottom: bottomPad + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {LANGUAGES.map((lang) => {
          const isActive = selected === lang.code;
          const accentColor = LANG_COLORS[lang.code] ?? Colors.ocean;
          return (
            <TouchableOpacity
              key={lang.code}
              testID={`lang-${lang.code}`}
              style={[
                styles.langCard,
                isActive && { borderColor: accentColor, backgroundColor: accentColor + "08" },
              ]}
              activeOpacity={0.7}
              onPress={() => {
                Haptics.selectionAsync();
                setSelected(lang.code);
              }}
            >
              <View style={styles.langText}>
                <Text style={[styles.langEnglish, isActive && { color: accentColor }]}>
                  {lang.englishName}
                </Text>
                <Text style={[styles.langNative, isActive && { color: accentColor + "CC" }]}>
                  {lang.nativeName}
                </Text>
              </View>
              <View style={[
                styles.radio,
                isActive && { borderColor: accentColor, backgroundColor: accentColor },
              ]}>
                {isActive && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: bottomPad + 16 }]}>
        <TouchableOpacity
          style={styles.continueBtn}
          activeOpacity={0.85}
          onPress={handleContinue}
          testID="lang-continue"
        >
          <Text style={styles.continueBtnText}>Continue</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.sand,
  },
  headerSection: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  logoText: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 22,
    color: Colors.ocean,
    letterSpacing: -0.5,
  },
  title: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 30,
    color: Colors.charcoal,
    lineHeight: 36,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "Nunito_400Regular",
    fontSize: 16,
    color: Colors.textMuted,
    lineHeight: 22,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    gap: 10,
    paddingTop: 4,
  },
  langCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.cardBg,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: Colors.borderSoft,
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 12,
    shadowColor: Colors.charcoal,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  langText: {
    flex: 1,
    gap: 3,
  },
  langEnglish: {
    fontFamily: "Nunito_700Bold",
    fontSize: 18,
    color: Colors.charcoal,
    lineHeight: 22,
  },
  langNative: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 15,
    color: Colors.textMuted,
    lineHeight: 20,
  },
  radio: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: Colors.borderSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: Colors.sand,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSoft,
  },
  continueBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.ocean,
    borderRadius: 18,
    paddingVertical: 18,
  },
  continueBtnText: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 18,
    color: "#fff",
    letterSpacing: 0.3,
  },
});
