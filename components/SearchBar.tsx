import React from "react";
import { View, TextInput, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

/** Rounded search field in the same style as the zone chips below it. */
export default function SearchBar({ value, onChangeText, placeholder }: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.field}>
        <Ionicons name="search" size={16} color={Colors.textMuted} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textLight}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          maxLength={100}
          accessibilityLabel={placeholder}
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={() => onChangeText("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={Colors.textLight} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 6 },
  field: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
    backgroundColor: Colors.cardBg, borderWidth: 1.5, borderColor: Colors.borderSoft,
  },
  input: {
    flex: 1, fontFamily: "Nunito_600SemiBold", fontSize: 14, color: Colors.charcoal,
    paddingVertical: 0,
    // The rounded field already frames the text; the browser's square focus
    // ring drawn inside it looked broken. Chrome draws its ring for
    // outline-style: auto whatever the width, so the style has to be none —
    // a value react-native-web passes to CSS but React Native's types omit.
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : {}),
  },
});
