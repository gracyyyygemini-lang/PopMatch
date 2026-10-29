import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { font } from "@/constants/typography";
import BottomSheetModal from "@/components/BottomSheetModal";
import { Chip, Group, Row } from "@/components/ui/Grouped";
import { useApp } from "@/context/AppContext";
import { confirmAction, showError } from "@/lib/alert";
import { apiErrorMessage } from "@/lib/messages";
import { REPORT_REASONS, SUPPORT_EMAIL, sendReport, type ReportReason, type ReportTarget } from "@/lib/reports";

/** "Du, Grace" (how Microsoft sends UIUC names) -> "Grace"; "Grace Du" -> "Grace". */
function firstName(name: string | undefined): string {
  if (!name) return "them";
  const given = name.includes(",") ? name.split(",")[1] : name;
  return given.trim().split(/\s+/)[0] || name.trim();
}

const REPORT_TITLES: Record<ReportTarget, string> = {
  profile: "Report profile",
  listing: "Report listing",
  crash_post: "Report post",
  conversation: "Report conversation",
};

/**
 * The "⋯" sheet for another student and something of theirs: report it, or
 * block them. Opened from the swipe deck, the chat header, a listing and a
 * Crash & Cash post. `onBlocked` runs after a block is saved, e.g. to leave
 * a chat that no longer exists for either of you.
 */
export default function SafetyMenu({ visible, onClose, person, report, onBlocked }: {
  visible: boolean;
  onClose: () => void;
  person: { id: string; name: string } | null;
  /** What "Report" reports; without it the sheet only offers Block. */
  report?: { type: ReportTarget; id: string };
  onBlocked?: () => void;
}) {
  const { blockUser } = useApp();
  const [view, setView] = useState<"menu" | "report" | "sent">("menu");
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const first = firstName(person?.name);

  // Every opening starts at the menu with an empty form.
  useEffect(() => {
    if (visible) { setView("menu"); setReason(null); setDetails(""); }
  }, [visible]);

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

  const handleSendReport = async () => {
    if (!report || !reason || busy) return;
    setBusy(true);
    try {
      await sendReport(report.type, report.id, reason, details);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setView("sent");
    } catch (error) {
      showError("Your report wasn't sent", apiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const title = view === "menu" ? person?.name ?? "" : report ? REPORT_TITLES[report.type] : "";

  return (
    <BottomSheetModal visible={visible} onClose={onClose} title={title}>
      {/* The sheet stops at 75% of the screen; the report form is taller
          than that on a phone, so its content scrolls. */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {view === "menu" && (
          <Group>
            {report ? (
              <Row icon="flag" tile={Colors.earth} title={REPORT_TITLES[report.type]}
                subtitle="Tell us what's wrong. Reports are private." onPress={() => setView("report")} />
            ) : null}
            <Row icon="hand-left" tile={Colors.error} title={busy ? "Blocking…" : `Block ${first}`}
              subtitle="Hide each other everywhere and stop messages" subtitleLines={2}
              destructive onPress={handleBlock} chevron={false} />
          </Group>
        )}

        {view === "report" && (
          <>
            <Text style={styles.label}>{"What's the problem?"}</Text>
            <View style={styles.chips}>
              {REPORT_REASONS.map(r => (
                <Chip key={r.id} label={r.label} active={reason === r.id} onPress={() => setReason(r.id)} />
              ))}
            </View>
            <Text style={styles.label}>Anything else we should know? (optional)</Text>
            <TextInput
              style={styles.input}
              value={details}
              onChangeText={setDetails}
              placeholder="What happened"
              placeholderTextColor={Colors.textSecondary}
              multiline
              maxLength={1000}
              accessibilityLabel="Report details"
            />
            <TouchableOpacity
              style={[styles.submit, (!reason || busy) && styles.submitDisabled]}
              onPress={handleSendReport}
              disabled={!reason || busy}
              accessibilityRole="button"
              accessibilityState={{ disabled: !reason || busy }}
            >
              {busy ? <ActivityIndicator color={Colors.white} /> : (
                <Text style={[styles.submitText, !reason && styles.submitTextDisabled]}>Send report</Text>
              )}
            </TouchableOpacity>
            <Text style={styles.note}>{`${first} won't know who reported them.`}</Text>
          </>
        )}

        {view === "sent" && (
          <>
            <Text style={styles.sentTitle}>Thanks for telling us</Text>
            <Text style={styles.sentText}>
              We review every report within 24 hours, and remove anything that breaks our rules.
              {SUPPORT_EMAIL ? ` If you're in danger or need us sooner, email ${SUPPORT_EMAIL}.` : ""}
            </Text>
            <Group style={{ marginTop: 16 }}>
              <Row icon="hand-left" tile={Colors.error} title={busy ? "Blocking…" : `Block ${first} too`}
                subtitle="Hide each other everywhere and stop messages" subtitleLines={2}
                destructive onPress={handleBlock} chevron={false} />
              <Row icon="checkmark" tile={Colors.prairie} title="Done" onPress={onClose} chevron={false} />
            </Group>
          </>
        )}
      </ScrollView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  // Size to the content, shrinking (and scrolling) only past the sheet's cap.
  scroll: { flexGrow: 0, flexShrink: 1, flexBasis: "auto" },
  body: { paddingBottom: 8 },
  label: { ...font.semibold, fontSize: 14, color: Colors.textPrimary, marginTop: 4, marginBottom: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  input: {
    ...font.regular, fontSize: 15, color: Colors.textPrimary, backgroundColor: Colors.card,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.hairline,
    padding: 12, minHeight: 88, textAlignVertical: "top",
  },
  submit: {
    marginTop: 16, backgroundColor: Colors.illiniBlue, borderRadius: 14,
    paddingVertical: 15, alignItems: "center",
  },
  submitDisabled: { backgroundColor: Colors.fillMuted },
  submitText: { ...font.bold, fontSize: 16, color: Colors.white },
  submitTextDisabled: { color: Colors.textSecondaryOnBg },
  note: { ...font.regular, fontSize: 13, color: Colors.textSecondaryOnBg, textAlign: "center", marginTop: 10 },
  sentTitle: { ...font.bold, fontSize: 20, color: Colors.textPrimary, marginBottom: 6 },
  sentText: { ...font.regular, fontSize: 15, lineHeight: 21, color: Colors.textSecondaryOnBg },
});
