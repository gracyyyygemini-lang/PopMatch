import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Platform, KeyboardAvoidingView
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useApp, SubleasePost, LeaseType, Landlord, Zone, BreakType } from "@/context/AppContext";
import DateTimePicker, { formatDateRange } from "@/components/DateTimePicker";

const LEASE_OPTIONS: { key: LeaseType; label: string; desc: string }[] = [
  { key: "full_year", label: "Full Year", desc: "Aug – Jul (12 months)" },
  { key: "fall_sublease", label: "Fall Sublease", desc: "Aug – Dec" },
  { key: "spring_sublease", label: "Spring Sublease", desc: "Jan – May" },
  { key: "summer_sublease", label: "Summer Sublease", desc: "May – Aug" },
];

const FLOOR_PLANS = [
  "Studio", "1 Bed / 1 Bath", "2 Bed / 1 Bath", "2 Bed / 2 Bath",
  "3 Bed / 2 Bath", "4 Bed / 4 Bath", "Other",
];

const ROOM_LETTERS = ["Room A", "Room B", "Room C", "Room D", "Room E", "None"];

const LANDLORD_OPTIONS: { key: Landlord; label: string; color: string }[] = [
  { key: "jsm", label: "JSM", color: Colors.landlords.jsm },
  { key: "ugroup", label: "UGroup", color: Colors.landlords.ugroup },
  { key: "bailey", label: "Bailey", color: Colors.landlords.bailey },
  { key: "american", label: "American Campus", color: Colors.landlords.american },
  { key: "smile", label: "Smile", color: Colors.landlords.smile },
  { key: "other", label: "Private / Other", color: Colors.landlords.other },
];

const LANDLORD_WARNINGS: Record<Landlord, { level: "info" | "warn" | "danger"; message: string } | null> = {
  jsm: { level: "info", message: "JSM charges a $50 sublease transfer fee and requires proof of Renter's Insurance from your replacement tenant." },
  ugroup: { level: "warn", message: "UGroup charges $125 transfer fee + mandatory 72-hour Move-In Condition Report. Document ALL damage with photos within 72 hours!" },
  bailey: { level: "warn", message: "Walk into the Bailey office TOGETHER with your replacement tenant — never separately. Landlord may try to cut you out." },
  american: { level: "danger", message: "ALERT: American Campus (Latitude, 212, Tower) charges up to $600 in Relet fees. Get everything in writing first." },
  smile: { level: "info", message: "Smile Properties: Verify sublease approval in writing before proceeding. Keep a copy of all agreements." },
  other: null,
};

const ZONE_OPTIONS: { key: Zone; label: string }[] = [
  { key: "campustown", label: "Campustown" },
  { key: "north", label: "North Campus" },
  { key: "south", label: "South Campus" },
  { key: "urbana", label: "Urbana" },
  { key: "downtown", label: "Downtown Champaign" },
];

const BREAK_OPTIONS: { key: BreakType; label: string }[] = [
  { key: "thanksgiving", label: "Thanksgiving" },
  { key: "spring_break", label: "Spring Break" },
  { key: "winter", label: "Winter Break" },
];

const AVATAR_COLORS = [
  "#1A7AAF", "#CC5500", "#5A8A5A", "#9B59B6", "#E07B00", "#E0BC00"
];

export default function PostSubleaseScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser, addSublease } = useApp();

  const [buildingName, setBuildingName] = useState("");
  const [address, setAddress] = useState("");
  const [floorPlan, setFloorPlan] = useState("1 Bed / 1 Bath");
  const [roomLetter, setRoomLetter] = useState("None");
  const [leaseType, setLeaseType] = useState<LeaseType>("fall_sublease");
  const [price, setPrice] = useState("");
  const [landlord, setLandlord] = useState<Landlord>("other");
  const [zone, setZone] = useState<Zone>("campustown");
  const [availableDuringBreaks, setAvailableDuringBreaks] = useState(false);
  const [selectedBreaks, setSelectedBreaks] = useState<BreakType[]>([]);
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [moveInDate, setMoveInDate] = useState<Date | null>(null);
  const [moveOutDate, setMoveOutDate] = useState<Date | null>(null);
  const [showMoveIn, setShowMoveIn] = useState(false);
  const [showMoveOut, setShowMoveOut] = useState(false);

  const warning = LANDLORD_WARNINGS[landlord];

  const toggleBreak = (b: BreakType) => {
    setSelectedBreaks(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]);
    Haptics.selectionAsync();
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!buildingName.trim()) e.buildingName = "Building name is required";
    if (!price.trim() || isNaN(Number(price)) || Number(price) <= 0) e.price = "Enter a valid price";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const publicDesc = roomLetter !== "None" ? `${roomLetter} — ${description.trim()}` : description.trim();

    const post: SubleasePost = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
      userId: currentUser?.id || "guest",
      userName: currentUser?.name || "Anonymous",
      userEmail: currentUser?.email || "student@illinois.edu",
      buildingName: buildingName.trim(),
      address: address.trim(),
      floorPlan,
      leaseType,
      pricePerMonth: Number(price),
      landlord,
      zone,
      availableDuringBreaks,
      breakTypes: selectedBreaks,
      description: publicDesc,
      avatarColor: currentUser?.avatarColor || AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      timestamp: Date.now(),
      moveInAt: moveInDate?.toISOString() ?? null,
      moveOutAt: moveOutDate?.toISOString() ?? null,
    };

    await addSublease(post);
    router.back();
  };

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const dateRangeDisplay = formatDateRange(moveInDate?.toISOString(), moveOutDate?.toISOString());

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: Colors.sand }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={20} color={Colors.ocean} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post My Sublease</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, {
        paddingBottom: insets.bottom + 80
      }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Safety notice */}
        <View style={styles.safetyBox}>
          <Ionicons name="shield-checkmark" size={15} color={Colors.grassGreen} />
          <Text style={styles.safetyText}>
            <Text style={{ fontFamily: "Nunito_700Bold" }}>Privacy protected:</Text> Only building name and floor plan are shown publicly. Share your exact apartment number privately in chat after matching.
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Building Name *</Text>
          <TextInput style={[styles.input, errors.buildingName && styles.inputError]}
            value={buildingName} onChangeText={v => { setBuildingName(v); setErrors(e => ({ ...e, buildingName: "" })); }}
            placeholder="e.g. Hub Champaign, Octave, 707"
            placeholderTextColor={Colors.textLight} />
          {errors.buildingName ? <Text style={styles.errorText}>{errors.buildingName}</Text> : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Street Address</Text>
          <TextInput style={styles.input} value={address} onChangeText={setAddress}
            placeholder="e.g. 210 E Green St (no apartment number)"
            placeholderTextColor={Colors.textLight} />
          <Text style={styles.hintText}>Street only — no apartment or unit numbers</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Floor Plan *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
            {FLOOR_PLANS.map(fp => (
              <TouchableOpacity key={fp} style={[styles.pill, floorPlan === fp && styles.pillActive]}
                onPress={() => { setFloorPlan(fp); Haptics.selectionAsync(); }}>
                <Text style={[styles.pillText, floorPlan === fp && styles.pillTextActive]}>{fp}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={styles.hintText}>Shown publicly as "{buildingName || "Building"} — {floorPlan}"</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Your Room Letter <Text style={styles.optionalLabel}>(optional)</Text></Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
            {ROOM_LETTERS.map(r => (
              <TouchableOpacity key={r} style={[styles.pill, roomLetter === r && styles.pillActive]}
                onPress={() => { setRoomLetter(r); Haptics.selectionAsync(); }}>
                <Text style={[styles.pillText, roomLetter === r && styles.pillTextActive]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={styles.hintText}>Room letter is safe to share — exact apt # stays private in chat</Text>
        </View>

        {/* Move-In / Move-Out Pickers */}
        <View style={styles.field}>
          <Text style={styles.label}>Move-In Date & Time</Text>
          <TouchableOpacity style={styles.datePicker} onPress={() => setShowMoveIn(true)}>
            <Ionicons name="calendar-outline" size={18} color={Colors.ocean} />
            <Text style={[styles.datePickerText, !moveInDate && styles.datePickerPlaceholder]}>
              {moveInDate ? formatDateRange(moveInDate.toISOString(), null) : "Select move-in date & time"}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />
          </TouchableOpacity>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Move-Out Date & Time</Text>
          <TouchableOpacity style={styles.datePicker} onPress={() => setShowMoveOut(true)}>
            <Ionicons name="calendar-outline" size={18} color={Colors.ocean} />
            <Text style={[styles.datePickerText, !moveOutDate && styles.datePickerPlaceholder]}>
              {moveOutDate ? formatDateRange(null, moveOutDate.toISOString()) : "Select move-out date & time"}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />
          </TouchableOpacity>
          {dateRangeDisplay && (
            <View style={styles.datePreview}>
              <Text style={styles.datePreviewText}>🗓️ {dateRangeDisplay}</Text>
            </View>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Lease Type *</Text>
          {LEASE_OPTIONS.map(opt => (
            <TouchableOpacity key={opt.key} style={[styles.optionCard, leaseType === opt.key && styles.optionCardActive]}
              onPress={() => { setLeaseType(opt.key); Haptics.selectionAsync(); }}>
              <View style={styles.optionLeft}>
                <Text style={[styles.optionLabel, leaseType === opt.key && styles.optionLabelActive]}>{opt.label}</Text>
                <Text style={styles.optionDesc}>{opt.desc}</Text>
              </View>
              {leaseType === opt.key && <Ionicons name="checkmark-circle" size={20} color={Colors.ocean} />}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Monthly Price ($/mo) *</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceDollar}>$</Text>
            <TextInput style={[styles.priceInput, errors.price && styles.inputError]}
              value={price} onChangeText={v => { setPrice(v); setErrors(e => ({ ...e, price: "" })); }}
              placeholder="0" placeholderTextColor={Colors.textLight}
              keyboardType="numeric" />
            <Text style={styles.priceMonth}>/mo</Text>
          </View>
          {errors.price ? <Text style={styles.errorText}>{errors.price}</Text> : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Landlord *</Text>
          {LANDLORD_OPTIONS.map(opt => (
            <TouchableOpacity key={opt.key} style={[styles.optionCard, landlord === opt.key && styles.optionCardActive]}
              onPress={() => { setLandlord(opt.key); Haptics.selectionAsync(); }}>
              <View style={[styles.landlordDot, { backgroundColor: opt.color }]} />
              <Text style={[styles.optionLabel, landlord === opt.key && styles.optionLabelActive]}>{opt.label}</Text>
              {landlord === opt.key && <Ionicons name="checkmark-circle" size={20} color={Colors.ocean} />}
            </TouchableOpacity>
          ))}
          {warning && (
            <View style={[styles.warningBox, {
              backgroundColor: warning.level === "danger" ? "#FFF0F0" : warning.level === "warn" ? "#FFF4E6" : "#EFF8FF",
              borderLeftColor: warning.level === "danger" ? Colors.alertRed : warning.level === "warn" ? Colors.alertOrange : Colors.ocean
            }]}>
              <Ionicons
                name={warning.level === "danger" ? "alert-circle" : warning.level === "warn" ? "warning-outline" : "information-circle-outline"}
                size={16}
                color={warning.level === "danger" ? Colors.alertRed : warning.level === "warn" ? Colors.alertOrange : Colors.ocean}
              />
              <Text style={styles.warningText}>{warning.message}</Text>
            </View>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Zone / Area *</Text>
          <View style={styles.chipRow}>
            {ZONE_OPTIONS.map(opt => (
              <TouchableOpacity key={opt.key} style={[styles.chip, zone === opt.key && styles.chipActive]}
                onPress={() => { setZone(opt.key); Haptics.selectionAsync(); }}>
                <Text style={[styles.chipText, zone === opt.key && styles.chipTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <TouchableOpacity style={styles.toggleRow}
            onPress={() => { setAvailableDuringBreaks(!availableDuringBreaks); Haptics.selectionAsync(); }}>
            <View>
              <Text style={styles.toggleTitle}>Available During Breaks?</Text>
              <Text style={styles.toggleDesc}>Unit can be used during university breaks</Text>
            </View>
            <View style={[styles.toggle, availableDuringBreaks && styles.toggleOn]}>
              <Text style={[styles.toggleText, availableDuringBreaks && styles.toggleTextOn]}>
                {availableDuringBreaks ? "Yes" : "No"}
              </Text>
            </View>
          </TouchableOpacity>
          {availableDuringBreaks && (
            <View style={styles.breakOptions}>
              <Text style={styles.breakOptionsLabel}>Which breaks?</Text>
              <View style={styles.chipRow}>
                {BREAK_OPTIONS.map(b => (
                  <TouchableOpacity key={b.key}
                    style={[styles.chip, selectedBreaks.includes(b.key) && styles.chipActive]}
                    onPress={() => toggleBreak(b.key)}>
                    <Text style={[styles.chipText, selectedBreaks.includes(b.key) && styles.chipTextActive]}>
                      {b.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription}
            placeholder="Describe the unit, amenities, furniture situation..."
            placeholderTextColor={Colors.textLight} multiline numberOfLines={3} textAlignVertical="top" />
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 12 }]}>
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
          <Ionicons name="checkmark" size={20} color={Colors.white} />
          <Text style={styles.submitBtnText}>Post Sublease</Text>
        </TouchableOpacity>
      </View>

      <DateTimePicker
        visible={showMoveIn}
        value={moveInDate}
        title="Move-In Date & Time"
        minimumDate={new Date()}
        onConfirm={d => { setMoveInDate(d); setShowMoveIn(false); }}
        onCancel={() => setShowMoveIn(false)}
      />
      <DateTimePicker
        visible={showMoveOut}
        value={moveOutDate}
        title="Move-Out Date & Time"
        minimumDate={moveInDate ?? new Date()}
        onConfirm={d => { setMoveOutDate(d); setShowMoveOut(false); }}
        onCancel={() => setShowMoveOut(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 8,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.cardBg,
    alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: Colors.borderSoft,
  },
  headerTitle: { fontFamily: "Nunito_700Bold", fontSize: 17, color: Colors.ocean },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },

  safetyBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: Colors.grassGreen + "15", borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.grassGreen + "40",
    padding: 12,
  },
  safetyText: {
    fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.charcoal, flex: 1, lineHeight: 18,
  },

  field: { gap: 8 },
  label: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.charcoal },
  optionalLabel: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted },
  input: {
    backgroundColor: Colors.cardBg, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.borderSoft,
    paddingHorizontal: 14, paddingVertical: 12, fontFamily: "Nunito_400Regular",
    fontSize: 15, color: Colors.charcoal,
  },
  inputError: { borderColor: Colors.errorRed },
  textArea: { height: 90, paddingTop: 12 },
  errorText: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.errorRed },
  hintText: { fontFamily: "Nunito_400Regular", fontSize: 11, color: Colors.textMuted, marginTop: -4 },

  pillRow: { gap: 8, paddingBottom: 2 },
  pill: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.cardBg, borderWidth: 1.5, borderColor: Colors.borderSoft,
  },
  pillActive: { backgroundColor: Colors.ocean, borderColor: Colors.ocean },
  pillText: { fontFamily: "Nunito_600SemiBold", fontSize: 13, color: Colors.textMuted },
  pillTextActive: { color: Colors.white },

  datePicker: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: Colors.cardBg, borderRadius: 12, borderWidth: 1.5,
    borderColor: Colors.borderSoft, paddingHorizontal: 14, paddingVertical: 13,
  },
  datePickerText: {
    flex: 1, fontFamily: "Nunito_600SemiBold", fontSize: 14, color: Colors.charcoal,
  },
  datePickerPlaceholder: { color: Colors.textLight },
  datePreview: {
    backgroundColor: Colors.ocean + "12", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: Colors.ocean + "30",
  },
  datePreviewText: {
    fontFamily: "Nunito_700Bold", fontSize: 13, color: Colors.charcoal,
  },

  priceRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  priceDollar: { fontFamily: "Nunito_800ExtraBold", fontSize: 22, color: Colors.ocean },
  priceInput: {
    flex: 1, backgroundColor: Colors.cardBg, borderRadius: 12, borderWidth: 1.5,
    borderColor: Colors.borderSoft, paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: "Nunito_800ExtraBold", fontSize: 22, color: Colors.ocean,
  },
  priceMonth: { fontFamily: "Nunito_400Regular", fontSize: 14, color: Colors.textMuted },
  optionCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.cardBg, borderRadius: 12, borderWidth: 1.5,
    borderColor: Colors.borderSoft, padding: 12,
  },
  optionCardActive: { borderColor: Colors.ocean, backgroundColor: Colors.ocean + "10" },
  optionLeft: { flex: 1 },
  optionLabel: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.charcoal },
  optionLabelActive: { color: Colors.ocean },
  optionDesc: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted },
  landlordDot: { width: 12, height: 12, borderRadius: 6 },
  warningBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    borderLeftWidth: 3, borderRadius: 10, padding: 12, marginTop: 4,
  },
  warningText: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.charcoal, flex: 1, lineHeight: 18 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.cardBg, borderWidth: 1.5, borderColor: Colors.borderSoft,
  },
  chipActive: { backgroundColor: Colors.ocean, borderColor: Colors.ocean },
  chipText: { fontFamily: "Nunito_600SemiBold", fontSize: 13, color: Colors.textMuted },
  chipTextActive: { color: Colors.white },
  toggleRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: Colors.cardBg, borderRadius: 12, borderWidth: 1.5,
    borderColor: Colors.borderSoft, padding: 14,
  },
  toggleTitle: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.charcoal },
  toggleDesc: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted },
  toggle: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16,
    backgroundColor: Colors.sandDark, borderWidth: 1.5, borderColor: Colors.borderSoft,
  },
  toggleOn: { backgroundColor: Colors.grassGreen, borderColor: Colors.grassGreen },
  toggleText: { fontFamily: "Nunito_700Bold", fontSize: 13, color: Colors.textMuted },
  toggleTextOn: { color: Colors.white },
  breakOptions: { gap: 8 },
  breakOptionsLabel: { fontFamily: "Nunito_600SemiBold", fontSize: 12, color: Colors.textMuted },
  footer: {
    paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: Colors.sand, borderTopWidth: 1, borderTopColor: Colors.borderSoft,
  },
  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.orange, borderRadius: 14, paddingVertical: 14,
  },
  submitBtnText: { fontFamily: "Nunito_800ExtraBold", fontSize: 16, color: Colors.white },
});
