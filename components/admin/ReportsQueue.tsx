import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { font } from "@/constants/typography";
import { Chip } from "@/components/ui/Grouped";
import { apiRequest } from "@/lib/query-client";
import { apiErrorMessage } from "@/lib/messages";
import { confirmAction, showError } from "@/lib/alert";
import { REPORT_REASONS } from "@/lib/reports";

/** GET /api/admin/reports, one row. */
interface AdminReport {
  id: number;
  targetType: "profile" | "listing" | "crash_post" | "conversation";
  targetId: string;
  targetUserName: string;
  targetBanned: boolean;
  openReportsOnTarget: number;
  reporterEmail: string;
  reason: string;
  details: string;
  snapshot: any;
  status: "open" | "actioned" | "dismissed";
  alertSent: boolean;
  createdAt: number;
  resolvedBy?: string;
  resolutionNote?: string;
}

type Decision = "dismiss" | "remove" | "ban" | "remove_and_ban";

const TYPE_LABELS: Record<AdminReport["targetType"], string> = {
  profile: "Profile", listing: "Listing", crash_post: "Crash & Cash post", conversation: "Conversation",
};
const REMOVE_LABELS: Record<AdminReport["targetType"], string> = {
  profile: "Clear profile", listing: "Delete listing", crash_post: "Delete post", conversation: "Delete conversation",
};
const reasonLabel = (id: string) => REPORT_REASONS.find(r => r.id === id)?.label ?? id;

function hoursSince(ms: number) {
  return Math.floor((Date.now() - ms) / 3_600_000);
}

/** The reported thing as it was when reported. */
function Snapshot({ report }: { report: AdminReport }) {
  const s = report.snapshot ?? {};
  if (report.targetType === "conversation") {
    const messages: any[] = s.messages ?? [];
    return (
      <View style={st.snapshot}>
        <Text style={st.snapLabel}>Last {messages.length} messages</Text>
        {messages.map(m => (
          <Text key={m.id} style={st.snapText}>
            <Text style={st.snapStrong}>{m.senderName || "?"}: </Text>{m.content}
          </Text>
        ))}
      </View>
    );
  }
  const image: string | undefined = report.targetType === "profile" ? s.profileImage
    : report.targetType === "listing" ? s.images?.[0] : s.imageUrl;
  const lines = report.targetType === "profile"
    ? [s.name, s.major, s.bio, s.vibeProfile?.prompt && `${s.vibeProfile.prompt} ${s.vibeProfile.promptAnswer ?? ""}`]
    : report.targetType === "listing"
      ? [s.buildingName, s.pricePerMonth != null && `$${s.pricePerMonth}/mo · ${s.address ?? ""}`, s.description, s.images?.length ? `${s.images.length} photo(s)` : null]
      : [s.story, s.dates && `${s.dates} · ${s.currencyLabel ?? ""}`, s.approxLocation];
  return (
    <View style={[st.snapshot, image ? st.snapshotRow : null]}>
      {image ? <Image source={{ uri: image }} style={st.snapImage} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={st.snapLabel}>As reported</Text>
        {lines.filter(Boolean).map((l, i) => (
          <Text key={i} style={[st.snapText, i === 0 && st.snapStrong]} numberOfLines={i === 0 ? 2 : 4}>{l}</Text>
        ))}
      </View>
    </View>
  );
}

function ReportCard({ report, onResolved }: { report: AdminReport; onResolved: () => void }) {
  const [busy, setBusy] = useState<Decision | null>(null);
  const age = hoursSince(report.createdAt);
  const urgent = report.status === "open" && age >= 18;

  const resolve = async (decision: Decision) => {
    const titles: Record<Decision, string> = {
      dismiss: "Dismiss this report?",
      remove: `${REMOVE_LABELS[report.targetType]}?`,
      ban: `Ban ${report.targetUserName}?`,
      remove_and_ban: `${REMOVE_LABELS[report.targetType]} and ban ${report.targetUserName}?`,
    };
    const bodies: Record<Decision, string> = {
      dismiss: "Nothing is removed. Use this when the content doesn't break the rules.",
      remove: "This can't be undone.",
      ban: "They're locked out of PopMatch at once, everything they posted is hidden, and the same email can't sign up again.",
      remove_and_ban: "The content is deleted (this can't be undone), they're locked out at once, and everything they posted is hidden.",
    };
    if (!(await confirmAction(titles[decision], bodies[decision], decision === "dismiss" ? "Dismiss" : "Confirm"))) return;
    setBusy(decision);
    try {
      const res = await apiRequest("POST", `/api/admin/reports/${report.id}/resolve`, { decision });
      const result = await res.json();
      if (result.warnings?.length) showError("Done, with a problem", result.warnings.join("\n\n"));
      onResolved();
    } catch (error) {
      showError("Couldn't resolve the report", apiErrorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={[st.card, urgent && st.cardUrgent]}>
      <View style={st.cardHeader}>
        <Text style={st.cardTitle}>{TYPE_LABELS[report.targetType]} · {report.targetUserName}</Text>
        <Text style={[st.age, urgent && st.ageUrgent]}>
          {report.status === "open" ? (age < 1 ? "just now" : `open ${age}h`) : report.status}
        </Text>
      </View>
      <Text style={st.reason}>{reasonLabel(report.reason)}{report.openReportsOnTarget > 1 ? ` · ${report.openReportsOnTarget} open reports on this` : ""}</Text>
      {report.details ? <Text style={st.details}>{`"${report.details}"`}</Text> : null}
      <Text style={st.meta}>
        Reported by {report.reporterEmail}
        {report.targetBanned ? " · owner is banned" : ""}
        {!report.alertSent ? " · alert email not sent" : ""}
      </Text>
      <Snapshot report={report} />
      {report.status === "open" ? (
        <View style={st.actions}>
          {(["dismiss", "remove", "remove_and_ban"] as Decision[]).map(d => (
            <TouchableOpacity
              key={d}
              style={[st.action, d === "remove" && st.actionRemove, d === "remove_and_ban" && st.actionBan]}
              onPress={() => resolve(d)}
              disabled={!!busy}
              accessibilityRole="button"
            >
              {busy === d ? <ActivityIndicator size="small" color={d === "dismiss" ? Colors.illiniBlue : Colors.white} /> : (
                <Text style={[st.actionText, d !== "dismiss" && st.actionTextLight]}>
                  {d === "dismiss" ? "Dismiss" : d === "remove" ? REMOVE_LABELS[report.targetType] : "Remove + ban"}
                </Text>
              )}
            </TouchableOpacity>
          ))}
          {!report.targetBanned && (
            <TouchableOpacity style={st.banOnly} onPress={() => resolve("ban")} disabled={!!busy} accessibilityRole="button">
              <Text style={st.banOnlyText}>Ban only</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : report.resolutionNote ? (
        <Text style={st.meta}>{report.resolvedBy}: {report.resolutionNote}</Text>
      ) : null}
    </View>
  );
}

/** The admin's report queue (guideline 1.2: act within 24 hours). */
export default function ReportsQueue() {
  const [filter, setFilter] = useState<"open" | "all">("open");
  const [reports, setReports] = useState<AdminReport[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await apiRequest("GET", `/api/admin/reports?status=${filter}`);
      setReports(await res.json());
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  }, [filter]);
  useEffect(() => { setReports(null); load(); }, [load]);

  const open = reports?.filter(r => r.status === "open").length ?? 0;

  return (
    <View>
      <View style={st.headRow}>
        <Text style={st.sectionTitle}>Reports{filter === "open" && reports ? ` (${open} open)` : ""}</Text>
        <TouchableOpacity onPress={load} accessibilityRole="button" accessibilityLabel="Reload reports" style={st.reload}>
          <Ionicons name="refresh" size={18} color={Colors.illiniBlue} />
        </TouchableOpacity>
      </View>
      <View style={st.filters}>
        <Chip label="Open" active={filter === "open"} onPress={() => setFilter("open")} />
        <Chip label="All" active={filter === "all"} onPress={() => setFilter("all")} />
      </View>
      {error ? (
        <Text style={st.error}>{error}</Text>
      ) : reports === null ? (
        <ActivityIndicator style={{ marginVertical: 16 }} color={Colors.illiniBlue} />
      ) : reports.length === 0 ? (
        <View style={st.empty}><Text style={st.emptyText}>{filter === "open" ? "No open reports." : "No reports yet."}</Text></View>
      ) : (
        reports.map(r => <ReportCard key={r.id} report={r} onResolved={load} />)
      )}
    </View>
  );
}

const st = StyleSheet.create({
  headRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  sectionTitle: { ...font.bold, fontSize: 18, color: Colors.textPrimary },
  reload: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  filters: { flexDirection: "row", gap: 8, marginBottom: 12 },
  error: { ...font.medium, fontSize: 14, color: Colors.error, marginBottom: 12 },
  empty: { backgroundColor: Colors.card, borderRadius: 14, padding: 16, marginBottom: 12 },
  emptyText: { ...font.regular, fontSize: 14, color: Colors.textSecondary },
  card: { backgroundColor: Colors.card, borderRadius: 14, padding: 14, marginBottom: 12, gap: 6 },
  cardUrgent: { borderWidth: 2, borderColor: Colors.error },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { ...font.semibold, fontSize: 16, color: Colors.textPrimary, flex: 1 },
  age: { ...font.medium, fontSize: 13, color: Colors.textSecondary },
  ageUrgent: { color: Colors.error },
  reason: { ...font.semibold, fontSize: 14, color: Colors.earth },
  details: { ...font.regular, fontSize: 14, color: Colors.textPrimary },
  meta: { ...font.regular, fontSize: 13, color: Colors.textSecondary },
  snapshot: { backgroundColor: Colors.bg, borderRadius: 10, padding: 10, gap: 3, marginTop: 4 },
  snapshotRow: { flexDirection: "row", gap: 10 },
  snapImage: { width: 64, height: 64, borderRadius: 8, backgroundColor: Colors.fillMuted },
  snapLabel: { ...font.semibold, fontSize: 12, color: Colors.textSecondaryOnBg, marginBottom: 2 },
  snapText: { ...font.regular, fontSize: 13, color: Colors.textPrimary },
  snapStrong: { ...font.semibold },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8, alignItems: "center" },
  action: {
    minHeight: 44, paddingHorizontal: 14, borderRadius: 12, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.hairline, backgroundColor: Colors.card,
  },
  actionRemove: { backgroundColor: Colors.earth, borderColor: Colors.earth },
  actionBan: { backgroundColor: Colors.error, borderColor: Colors.error },
  actionText: { ...font.semibold, fontSize: 14, color: Colors.illiniBlue },
  actionTextLight: { color: Colors.white },
  banOnly: { minHeight: 44, justifyContent: "center", paddingHorizontal: 6 },
  banOnlyText: { ...font.semibold, fontSize: 14, color: Colors.error },
});
