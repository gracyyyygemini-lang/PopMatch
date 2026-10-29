import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { font } from "@/constants/typography";
import { useApp, type MutualFriend } from "@/context/AppContext";
import { useResponsive } from "@/hooks/useResponsive";
import { Group, GroupHeading, Row, ScreenTitle } from "@/components/ui/Grouped";
import CustomAvatar from "@/components/CustomAvatar";
import { fetchBlocked } from "@/lib/blocks";
import { confirmAction, showError } from "@/lib/alert";
import { apiErrorMessage } from "@/lib/messages";

/** Students you've blocked, with a way to unblock each. */
export default function BlockedScreen() {
  const insets = useSafeAreaInsets();
  const { unblockUser } = useApp();
  const { isDesktop, contentMaxWidth } = useResponsive();
  const topPadding = Platform.OS === "web" ? (isDesktop ? 24 : 32) : insets.top + 8;
  const [blocked, setBlocked] = useState<MutualFriend[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    fetchBlocked().then(setBlocked).catch(e => setError(apiErrorMessage(e)));
  }, []);
  useEffect(load, [load]);

  const handleUnblock = async (person: MutualFriend) => {
    const first = person.name.split(" ")[0];
    const ok = await confirmAction(`Unblock ${first}?`, `You'll be able to see each other and message again.`, "Unblock");
    if (!ok) return;
    try {
      await unblockUser(person.id);
      setBlocked(prev => prev?.filter(p => p.id !== person.id) ?? null);
    } catch (e) {
      showError("Couldn't unblock", apiErrorMessage(e));
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, {
        paddingTop: topPadding, paddingBottom: insets.bottom + 40,
        maxWidth: Math.min(contentMaxWidth, 680), paddingHorizontal: isDesktop ? 32 : 16,
      }]}>
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/profile"))}
          style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={22} color={Colors.illiniBlue} />
          <Text style={styles.backText}>Profile</Text>
        </TouchableOpacity>
        <ScreenTitle title="Blocked students" subtitle="You and they can't see or message each other" />

        {error ? (
          <Group>
            <Row icon="cloud-offline" tile={Colors.earth} title="Couldn't load this list" subtitle={error}
              subtitleLines={2} onPress={load} />
          </Group>
        ) : blocked === null ? (
          <ActivityIndicator style={{ marginTop: 32 }} color={Colors.illiniBlue} />
        ) : blocked.length === 0 ? (
          <Text style={styles.empty}>{"You haven't blocked anyone."}</Text>
        ) : (
          <>
            <GroupHeading>{`${blocked.length} blocked`}</GroupHeading>
            <Group>
              {blocked.map(p => (
                <Row key={p.id} title={p.name} subtitle="Tap to unblock"
                  leading={<CustomAvatar name={p.name} avatarColor={p.avatarColor} size={38} />}
                  onPress={() => handleUnblock(p)} />
              ))}
            </Group>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { alignSelf: "center", width: "100%" },
  back: { flexDirection: "row", alignItems: "center", gap: 2, marginBottom: 8, alignSelf: "flex-start" },
  backText: { ...font.medium, fontSize: 16, color: Colors.illiniBlue },
  empty: { ...font.regular, fontSize: 15, color: Colors.textSecondaryOnBg, marginTop: 24, textAlign: "center" },
});
