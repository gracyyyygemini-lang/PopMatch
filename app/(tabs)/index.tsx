import React from "react";
import { View, Text, StyleSheet, ScrollView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { font } from "@/constants/typography";
import { useApp } from "@/context/AppContext";
import { ScamBanner } from "@/components/ScamBanner";
import { useResponsive } from "@/hooks/useResponsive";
import { Group, GroupHeading, Row, ScreenTitle } from "@/components/ui/Grouped";

/** The marketplace's categories; it has no switcher of its own, so they live here. */
const SUBLET_TYPES: { id: string; title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap; tile: string }[] = [
  { id: "roommate_openings", title: "Roommate openings", subtitle: "Join an existing lease and meet housemates", icon: "people", tile: Colors.berry },
  { id: "semester_takeover", title: "Semester & year", subtitle: "Fall, spring or full-year subleases", icon: "calendar", tile: Colors.prairie },
  { id: "summer_only", title: "Summer", subtitle: "Mid-May to early August", icon: "sunny", tile: Colors.earth },
  { id: "short_term", title: "Short-term & gaps", subtitle: "August gaps, breaks and event weekends", icon: "timer", tile: Colors.industrial },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser, conversations, subleases, crashPosts } = useApp();
  const { isDesktop, contentMaxWidth } = useResponsive();
  const topPadding = Platform.OS === "web" ? (isDesktop ? 24 : 32) : insets.top + 8;

  const firstName = currentUser?.name.split(" ")[0] ?? "there";
  const go = (route: string) => {
    Haptics.selectionAsync();
    router.push(route as any);
  };

  const latest = [...conversations].sort((a, b) => (b.lastMessageAt ?? b.createdAt ?? 0) - (a.lastMessageAt ?? a.createdAt ?? 0))[0];
  const messagesSubtitle = latest
    ? latest.lastMessage
      ? `${latest.otherUserName || "Someone"}: ${latest.lastMessage}`
      : `New conversation with ${latest.otherUserName || "someone"}`
    : "No conversations yet";
  const mine = currentUser
    ? subleases.filter(s => s.userId === currentUser.id).length + crashPosts.filter(p => p.userId === currentUser.id).length
    : 0;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, {
          paddingTop: topPadding,
          paddingBottom: insets.bottom + (isDesktop ? 40 : 120),
          maxWidth: Math.min(contentMaxWidth, 680),
          paddingHorizontal: isDesktop ? 32 : 16,
        }]}
        showsVerticalScrollIndicator={false}
      >
        <ScreenTitle title={`Hey, ${firstName}`} subtitle="Housing for UIUC students" />

        <View style={styles.trustNote} accessibilityRole="text">
          <Ionicons name="shield-checkmark" size={15} color={Colors.prairie} />
          <Text style={styles.trustText}>Everyone here signed in with a verified .edu email.</Text>
        </View>

        <ScamBanner />

        <GroupHeading>What do you need?</GroupHeading>
        <Group>
          <Row icon="heart" tile={Colors.illiniOrange} title="Find a roommate"
            subtitle="Swipe through students looking for the same thing" subtitleLines={2} onPress={() => go("/matchmaker")} />
          <Row icon="home" tile={Colors.illiniBlue} title="Browse sublets"
            subtitle="Rooms and apartments near campus" subtitleLines={2} onPress={() => go("/marketplace")} />
          <Row icon="flash" tile={Colors.patina} title="Crash & Cash"
            subtitle="A place to crash over break, or earn by hosting" subtitleLines={2} onPress={() => go("/crash-cash")} />
        </Group>

        <GroupHeading>Browse sublets by type</GroupHeading>
        <Group>
          {SUBLET_TYPES.map(t => (
            <Row key={t.id} icon={t.icon} tile={t.tile} title={t.title} subtitle={t.subtitle} subtitleLines={2}
              onPress={() => go(`/marketplace?category=${t.id}`)} />
          ))}
          <Row icon="map" tile={Colors.industrial} title="Neighborhood map"
            subtitle="Zones around campus and the listings in each" onPress={() => go("/map")} />
        </Group>

        <GroupHeading>Yours</GroupHeading>
        <Group>
          <Row icon="chatbubbles" tile={Colors.industrial} title="Messages" subtitle={messagesSubtitle}
            onPress={() => go("/inbox")} />
          <Row icon="pricetags" tile={Colors.earth} title="My listings"
            subtitle={mine ? `${mine} active post${mine === 1 ? "" : "s"}` : "Post a sublet or a crash spot"}
            onPress={() => go("/my-listings")} />
          <Row icon="people-circle" tile={Colors.berry} title="Matches"
            subtitle="Students who liked you back" onPress={() => go("/matches")} />
        </Group>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { alignSelf: "center", width: "100%" },
  trustNote: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, marginBottom: 12 },
  trustText: { ...font.medium, fontSize: 13, color: Colors.textSecondaryOnBg, flexShrink: 1 },
});
