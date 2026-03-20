import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { supabase } from "../lib/supabase";
import { useRouter } from "expo-router";

// Required for mobile OAuth to close the browser tab after login
WebBrowser.maybeCompleteAuthSession();

export default function Onboarding() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleMicrosoftLogin = async () => {
    setLoading(true);
    try {
      // 1. Create the redirect URL based on the current environment
      const redirectUrl = Linking.createURL("/(tabs)");

      // 2. Start the Microsoft OAuth flow via Supabase
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "azure",
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            prompt: "select_account",
            domain_hint: "illinois.edu", // Enforces UIUC login prompt
          },
        },
      });

      if (error) throw error;

      if (data?.url) {
        if (Platform.OS === "web") {
          // THE FIX: Use href for web browsers/Replit preview
          window.location.href = data.url;
        } else {
          // Use the secure system browser for iOS/Android
          const res = await WebBrowser.openAuthSessionAsync(
            data.url,
            redirectUrl,
          );

          if (res.type === "success") {
            const { url } = res;
            await supabase.auth.getSessionFromUrl({ url });
            router.replace("/(tabs)");
          } else {
            setLoading(false);
          }
        }
      }
    } catch (error: any) {
      Alert.alert("Login Error", error.message);
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.header}>Welcome to PopMatch</Text>
        <Text style={styles.subtitle}>UIUC's Student Housing Matchmaker</Text>

        <TouchableOpacity
          onPress={handleMicrosoftLogin}
          disabled={loading}
          style={[styles.loginButton, loading && { opacity: 0.7 }]}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <View style={styles.buttonContent}>
              <Text style={styles.buttonText}>Sign in with Illinois Email</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.footerText}>
          Exclusively for verified @illinois.edu students
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#FBFBF9", // PopMatch Warm Cream
  },
  content: {
    alignItems: "center",
    width: "100%",
  },
  header: {
    fontSize: 32,
    fontWeight: "800",
    color: "#2C555C", // Dark Teal
    marginBottom: 8,
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif-condensed",
  },
  subtitle: {
    fontSize: 16,
    color: "#8A9FA3",
    marginBottom: 48,
    textAlign: "center",
  },
  loginButton: {
    backgroundColor: "#FF8C69", // Coral
    width: "100%",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF8C69",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  footerText: {
    marginTop: 24,
    fontSize: 12,
    color: "#6B8A8F",
    textAlign: "center",
    opacity: 0.8,
  },
});
