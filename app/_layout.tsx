import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Platform, View, useWindowDimensions } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFonts } from "expo-font";
import { Ionicons } from "@expo/vector-icons";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ProfileSyncBanner } from "@/components/ProfileSyncBanner";
import { SessionGuard } from "@/components/SessionGuard";
import { queryClient } from "@/lib/query-client";
import { AppProvider } from "@/context/AppContext";
import Colors from "@/constants/colors";

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="onboarding"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="matchmaker"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="marketplace"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="post-sublease"
        options={{ headerShown: false, presentation: "modal" }}
      />
      <Stack.Screen
        name="link-listing"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="chat"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="matches"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="my-listings"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="admin"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="blocked"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

function WebContainer({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  return (
    <View
      style={{
        flex: 1,
        width: "100%",
        alignItems: "center",
        backgroundColor: Colors.bg,
      }}
    >
      <View
        style={{
          flex: 1,
          width: "100%",
          maxWidth: isDesktop ? undefined : 500,
          backgroundColor: Colors.bg,
          overflow: "hidden",
        }}
      >
        {children}
      </View>
    </View>
  );
}

export default function RootLayout() {
  // Text uses the system font, but the icon font still has to load. Waiting
  // for it here (as the app used to for Nunito) means no icon ever starts
  // loading mid-render, where a busy first paint can blow expo-font's 6 s
  // timeout and throw.
  const [iconsLoaded, iconsError] = useFonts(Ionicons.font);

  useEffect(() => {
    if (iconsLoaded || iconsError) SplashScreen.hideAsync();
  }, [iconsLoaded, iconsError]);

  if (!iconsLoaded && !iconsError) return null;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AppProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            {Platform.OS === "web" ? (
              <WebContainer>
                <KeyboardProvider>
                  <SessionGuard />
                  <ProfileSyncBanner />
                  <RootLayoutNav />
                </KeyboardProvider>
              </WebContainer>
            ) : (
              <View style={{ flex: 1 }}>
                <KeyboardProvider>
                  <SessionGuard />
                  <ProfileSyncBanner />
                  <RootLayoutNav />
                </KeyboardProvider>
              </View>
            )}
          </GestureHandlerRootView>
        </AppProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
