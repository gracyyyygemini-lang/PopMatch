import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "@/constants/colors";

const DARK_TEAL = "#2C555C";

export function ScamBanner() {
  // 1. Local state to track dismissal
  const [scamBannerDismissed, setScamBannerDismissed] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(0));

  // 2. Load the preference from the phone's storage on mount
  useEffect(() => {
    async function checkDismissal() {
      const val = await AsyncStorage.getItem("popmatch_scam_banner_hidden");
      if (val !== "true") {
        setScamBannerDismissed(false);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }
    }
    checkDismissal();
  }, []);

  // 3. Function to hide and save the preference
  const handleDismiss = async () => {
    await AsyncStorage.setItem("popmatch_scam_banner_hidden", "true");
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setScamBannerDismissed(true);
    });
  };

  if (scamBannerDismissed) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.iconCircle}>
        <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Stay Safe at UIUC</Text>
        <Text style={styles.body}>
          Never send deposits via Zelle or Venmo before touring a 
          verified @illinois.edu student's apartment in person.
        </Text>
      </View>

      <Pressable 
        onPress={handleDismiss} 
        style={({ pressed }) => [
          styles.closeButton,
          pressed && { opacity: 0.7 }
        ]}
      >
        <Ionicons name="close" size={20} color={DARK_TEAL} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#FFF4E5", // Light warning orange
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FFE0B2",
    marginBottom: 8,
    alignItems: "flex-start",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FF8C69", // Coral
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  content: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    fontFamily: "Nunito_700Bold",
    fontSize: 14,
    color: DARK_TEAL,
    marginBottom: 2,
  },
  body: {
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    color: "#6B8A8F",
    lineHeight: 18,
  },
  closeButton: {
    padding: 4,
  },
});
