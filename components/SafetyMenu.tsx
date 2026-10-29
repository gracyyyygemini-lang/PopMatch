import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import BottomSheetModal from "@/components/BottomSheetModal";
import { Group, Row } from "@/components/ui/Grouped";
import { useApp } from "@/context/AppContext";
import { confirmAction, showError } from "@/lib/alert";
import { apiErrorMessage } from "@/lib/messages";

/**
 * The "⋯" sheet for another student: block them. Opened from the swipe deck
 * and the chat header. `onBlocked` runs after the block is saved, e.g. to
 * leave a chat that no longer exists for either of you.
 */
export default function SafetyMenu({ visible, onClose, person, onBlocked }: {
  visible: boolean;
  onClose: () => void;
  person: { id: string; name: string } | null;
  onBlocked?: () => void;
}) {
  const { blockUser } = useApp();
  const [busy, setBusy] = useState(false);
  const first = person?.name.split(" ")[0] || "them";

  const handleBlock = async () => {
    if (!person || busy) return;
    const ok = await confirmAction(
      `Block ${first}?`,
      `You won't see each other anywhere on PopMatch, and neither of you can message the other. ${first} isn't told. You can unblock them from your Profile.`,
      "Block",
    );
    if (!ok) return;
    setBusy(true);
    try {
      await blockUser(person.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
      onBlocked?.();
    } catch (error) {
      showError("Couldn't block", apiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheetModal visible={visible} onClose={onClose} title={person?.name ?? ""}>
      <View style={styles.body}>
        <Group>
          <Row icon="hand-left" tile={Colors.error} title={busy ? "Blocking…" : `Block ${first}`}
            subtitle="Hide each other everywhere and stop messages" subtitleLines={2}
            destructive onPress={handleBlock} chevron={false} />
        </Group>
      </View>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  body: { paddingBottom: 8 },
});
