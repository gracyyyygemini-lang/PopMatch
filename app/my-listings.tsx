import React from "react";
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { font } from "@/constants/typography";
import { useApp } from "@/context/AppContext";
import { useResponsive } from "@/hooks/useResponsive";
import { Group, GroupHeading, Row, ScreenTitle } from "@/components/ui/Grouped";

/**
 * Your own sublets and crash posts, from the feeds already loaded in context.
 * Managing them (mark leased / filled) stays on the marketplace and Crash &
 * Cash, where your posts are listed first.
 */
export default function MyListingsScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser, subleases, crashPosts } = useApp();
  const { isDesktop, contentMaxWidth } = useResponsive();
  const mySublets = subleases.filter(s => s.userId === currentUser?.id);
  const myCrash = crashPosts.filter(p => p.userId === currentUser?.id && p.status === "active");
  const topPadding = Platform.OS === "web" ? (isDesktop ? 24 : 32) : insets.top + 8;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, {
        paddingTop: topPadding, paddingBottom: insets.bottom + 40,
        maxWidth: Math.min(contentMaxWidth, 680), paddingHorizontal: isDesktop ? 32 : 16,
      }]}>
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))}
          style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={22} color={Colors.illiniBlue} />
          <Text style={styles.backText}>Home</Text>
        </TouchableOpacity>
        <ScreenTitle title="My listings" subtitle="What you've posted" />

        <GroupHeading>Sublets</GroupHeading>
        <Group>
          {mySublets.map(s => (
            <Row key={s.id} icon="home" tile={Colors.illiniBlue} title={s.buildingName}
              subtitle={`$${s.pricePerMonth}/month${s.address ? ` · ${s.address}` : ""}`}
              onPress={() => router.push("/marketplace")} />
          ))}
          <Row icon="add" tile={Colors.illiniOrange} title="Post a sublet"
            subtitle={mySublets.length ? "List another place" : "You haven't listed a place yet"}
            onPress={() => router.push("/post-sublease")} />
        </Group>

        <GroupHeading>Crash & Cash</GroupHeading>
        <Group>
          {myCrash.map(p => (
            <Row key={p.id} icon="flash" tile={Colors.patina} title={p.story || "Crash post"}
              subtitle={`${p.dates} · ${p.vibe === "sos" ? "Needing a spot" : "Offering a spot"}`}
              onPress={() => router.push("/crash-cash")} />
          ))}
          <Row icon="add" tile={Colors.illiniOrange} title="Post on Crash & Cash"
            subtitle={myCrash.length ? "Post another" : "Offer a couch or ask for one"}
            onPress={() => router.push("/crash-cash")} />
        </Group>

        <Text style={styles.footnote}>
          Mark a sublet leased or a crash post filled from its card in Browse sublets or Crash & Cash.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { alignSelf: "center", width: "100%" },
  back: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", marginLeft: -6, marginBottom: 8, paddingVertical: 4 },
  backText: { ...font.regular, fontSize: 17, color: Colors.illiniBlue },
  footnote: { ...font.regular, fontSize: 13, color: Colors.textSecondaryOnBg, marginTop: 12, paddingHorizontal: 4 },
});
