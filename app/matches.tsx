import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Platform, ActivityIndicator, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import Colors from "@/constants/colors";
import { font } from "@/constants/typography";
import { useApp, PublicProfile } from "@/context/AppContext";
import { fetchMutualMatches, MutualMatch } from "@/lib/likes";
import { showError } from "@/lib/alert";
import { useResponsive } from "@/hooks/useResponsive";
import CustomAvatar from "@/components/CustomAvatar";
import { Group, Row, ScreenTitle } from "@/components/ui/Grouped";

function since(ms: number): string {
  const days = Math.floor((Date.now() - ms) / 86400000);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Students who liked you back. Read straight from GET /api/likes/mutual (the
 * same call the swipe deck uses to detect a match) and joined to the users
 * list for names; tapping one opens the chat.
 */
export default function MatchesScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser, users, startMatchConversation } = useApp();
  const { isDesktop, contentMaxWidth } = useResponsive();
  const [matches, setMatches] = useState<MutualMatch[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!currentUser) return;
    setError(null);
    fetchMutualMatches(currentUser.email)
      .then(setMatches)
      .catch(err => {
        console.error("[matches] couldn't load:", err);
        setError(err instanceof Error ? err.message : String(err));
      });
  }, [currentUser?.email]);
  useFocusEffect(load);

  const people = (matches ?? [])
    .map(m => ({ match: m, user: users.find(u => u.id === m.userId) }))
    .filter((p): p is { match: MutualMatch; user: PublicProfile } => !!p.user);

  const open = async (user: PublicProfile) => {
    setOpening(user.id);
    try {
      const id = await startMatchConversation(user);
      router.push(`/chat?conversationId=${id}&source=coseeker`);
    } catch (err) {
      showError("Couldn't open the chat", err instanceof Error ? err.message : String(err));
    } finally {
      setOpening(null);
    }
  };

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
        <ScreenTitle title="Matches" subtitle="Students who liked you back" />

        {error ? (
          <View style={styles.state}>
            <Text style={styles.stateTitle}>{"Couldn't load your matches"}</Text>
            <Text style={styles.stateText}>{error}</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={load}>
              <Text style={styles.primaryBtnText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : matches === null ? (
          <View style={styles.state}><ActivityIndicator color={Colors.illiniBlue} /></View>
        ) : people.length === 0 ? (
          <View style={styles.state}>
            <Text style={styles.stateTitle}>No matches yet</Text>
            <Text style={styles.stateText}>When someone you liked likes you back, they show up here.</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push("/matchmaker")}>
              <Text style={styles.primaryBtnText}>Find a roommate</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Group style={{ marginTop: 16 }}>
            {people.map(({ match, user }) => (
              <Row key={user.id}
                leading={<CustomAvatar name={user.name} avatarColor={user.avatarColor} profileImage={user.profileImage} size={38} />}
                title={user.name}
                subtitle={[user.major, `matched ${since(match.matchedAt)}`].filter(Boolean).join(" · ")}
                detail={opening === user.id ? <ActivityIndicator color={Colors.illiniBlue} /> : null}
                onPress={() => open(user)} />
            ))}
          </Group>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { alignSelf: "center", width: "100%" },
  back: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", marginLeft: -6, marginBottom: 8, paddingVertical: 4 },
  backText: { ...font.regular, fontSize: 17, color: Colors.illiniBlue },
  state: { alignItems: "center", paddingTop: 60, gap: 10, paddingHorizontal: 24 },
  stateTitle: { ...font.bold, fontSize: 18, color: Colors.textPrimary },
  stateText: { ...font.regular, fontSize: 14, color: Colors.textSecondaryOnBg, textAlign: "center" },
  primaryBtn: { backgroundColor: Colors.illiniOrange, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, marginTop: 8 },
  primaryBtnText: { ...font.bold, fontSize: 15, color: Colors.onOrange },
});
