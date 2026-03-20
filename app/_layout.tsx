import { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { AppProvider, useAppContext } from "../context/AppContext";
import { View, ActivityIndicator, StyleSheet, Platform } from "react-native";

function RootLayoutNav() {
  const { session, isLoading } = useAppContext();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // 1. Don't do anything while Supabase is still "waking up"
    if (isLoading) return;

    // 2. THE LOOP BREAKER: If we see an auth token in the URL, PAUSE.
    // This gives Supabase time to catch the session before we redirect.
    if (
      Platform.OS === "web" &&
      window.location.hash.includes("access_token")
    ) {
      return;
    }

    const inAuthGroup = segments[0] === "onboarding";

    if (!session && !inAuthGroup) {
      router.replace("/onboarding");
    } else if (session && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [session, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF8C69" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AppProvider>
      <RootLayoutNav />
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FBFBF9",
  },
});
