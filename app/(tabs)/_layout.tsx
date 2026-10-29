import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Redirect, Tabs } from "expo-router";
import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import Colors from "@/constants/colors";
import { useResponsive } from "@/hooks/useResponsive";
import WebSidebar from "@/components/WebSidebar";
import { useApp } from "@/context/AppContext";
import { TERMS_VERSION } from "@/constants/terms";
import { font } from "@/constants/typography";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="inbox">
        <Icon sf={{ default: "bubble.left.and.bubble.right", selected: "bubble.left.and.bubble.right.fill" }} />
        <Label>Inbox</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

/** Floating rounded bar, inset from the screen edges (phones and narrow web). */
const FLOATING_BAR = {
  position: "absolute" as const,
  left: 16,
  right: 16,
  bottom: 16,
  height: 68,
  borderRadius: 22,
  borderTopWidth: 0,
  backgroundColor: Colors.card,
  paddingTop: 6,
  paddingBottom: 6,
  elevation: 8,
  shadowColor: "#13294B",
  shadowOpacity: 0.12,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
};

function ClassicTabLayout({ hideTabBar }: { hideTabBar?: boolean }) {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Blue active, Storm inactive: 14.5:1 and 4.8:1 on the white bar.
        tabBarActiveTintColor: Colors.illiniBlue,
        tabBarInactiveTintColor: Colors.storm,
        tabBarStyle: hideTabBar
          ? { display: "none" }
          : { ...FLOATING_BAR, bottom: 16 + insets.bottom },
        tabBarItemStyle: { borderRadius: 16 },
        tabBarLabelStyle: {
          ...font.semibold,
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: "Inbox",
          tabBarIcon: ({ color }) => <Ionicons name="chatbubbles-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  const { isDesktop } = useResponsive();
  const { currentUser } = useApp();

  // Everyone agrees to the current Terms before using the app, including
  // students who joined before there were any (App Store guideline 1.2).
  if (currentUser && currentUser.termsVersion !== TERMS_VERSION) {
    return <Redirect href="/terms?accept=1" />;
  }

  if (!isDesktop && isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }

  if (isDesktop) {
    return (
      <View style={desktopStyles.container}>
        <WebSidebar />
        <View style={desktopStyles.content}>
          <ClassicTabLayout hideTabBar />
        </View>
      </View>
    );
  }

  return <ClassicTabLayout />;
}

const desktopStyles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
  },
  content: {
    flex: 1,
  },
});
