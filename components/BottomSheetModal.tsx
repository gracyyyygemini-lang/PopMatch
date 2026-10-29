import React from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, Platform,
  KeyboardAvoidingView, useWindowDimensions,
} from "react-native";
import Colors from "@/constants/colors";
import { font } from "@/constants/typography";

export default function BottomSheetModal({
  visible,
  onClose,
  title,
  children,
  maxHeight,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Fraction of the window height the sheet may take (default 0.75). */
  maxHeight?: number;
}) {
  // In points, not "75%": a percentage resolves against the sheet's parent,
  // which is only as tall as the sheet, so the sheet always lost a quarter of
  // its content.
  const { height: windowHeight } = useWindowDimensions();
  const cap = windowHeight * (maxHeight ?? 0.75);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity
        style={bsStyles.overlay}
        activeOpacity={1}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close sheet"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ justifyContent: "flex-end" }}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[bsStyles.sheet, { maxHeight: cap }]}
          >
            <View style={bsStyles.handle} />
            <Text style={bsStyles.title} accessibilityRole="header">{title}</Text>
            {children}
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
}

const bsStyles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 36,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.borderSoft,
    alignSelf: "center", marginBottom: 16,
  },
  title: {
    ...font.bold, fontSize: 18, color: Colors.charcoal, marginBottom: 16,
  },
});
