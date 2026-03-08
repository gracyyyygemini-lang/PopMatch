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
import { useApp, SubleasePost, Zone, LifestyleTag } from "@/context/AppContext";

const ZONE_OPTIONS: { key: Zone; label: string }[] = [
  { key: "campustown", label: "Campustown" },
  { key: "north", label: "North Campus" },
  { key: "south", label: "South Campus" },
  { key: "urbana", label: "Urbana" },
  { key: "downtown", label: "Downtown Champaign" },
];

const LIFESTYLE_OPTIONS: { key: LifestyleTag; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "quiet", label: "Quiet", icon: "volume-mute-outline" },
  { key: "social", label: "Social", icon: "chatbubbles-outline" },
  { key: "clean", label: "Clean", icon: "sparkles-outline" },
  { key: "studious", label: "Studious", icon: "book-outline" },
  { key: "early_bird", label: "Early Bird", icon: "sunny-outline" },
  { key: "night_owl", label: "Night Owl", icon: "moon-outline" },
  { key: "pet_friendly", label: "Pet Friendly", icon: "paw-outline" },
  { key: "no_smoking", label: "No Smoking", icon: "ban-outline" },
];

const ROOM_OPTIONS = [1, 2, 3, 4, 5];

export default function CreateListingScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser, setCurrentUser, addSublease } = useApp();

  const [buildingName, setBuildingName] = useState("");
  const [address, setAddress] = useState("");
  const [price, setPrice] = useState("");
  const [roomsAvailable, setRoomsAvailable] = useState(1);
  const [zone, setZone] = useState<Zone>(currentUser?.zone || "campustown");
  const [lifestyleTags, setLifestyleTags] = useState<LifestyleTag[]>([]);
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const toggleTag = (tag: LifestyleTag) => {
    setLifestyleTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
    Haptics.selectionAsync();
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!buildingName.trim()) e.buildingName = "Building name is required";
    if (!price.trim() || isNaN(Number(price)) || Number(price) <= 0) e.price = "Enter a valid rent amount";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !currentUser) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const listingId = Date.now().toString() + Math.random().toString(36).substr(2, 6);

    const post: SubleasePost = {
      id: listingId,
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      buildingName: buildingName.trim(),
      address: address.trim(),
      leaseType: currentUser.leaseType || "full_year",
      pricePerMonth: Number(price),
      landlord: currentUser.landlord || "other",
      zone,
      availableDuringBreaks: false,
      breakTypes: [],
      description: description.trim(),
      avatarColor: currentUser.avatarColor,
      timestamp: Date.now(),
      category: "semester_takeover",
      roomsAvailable,
      lifestyleTags,
    };

    await addSublease(post);

    const updatedUser = {
      ...currentUser,
      linkedListingId: listingId,
    };
    await setCurrentUser(updatedUser);

    router.replace("/matchmaker");
  };

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: Colors.sand }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={20} color={Colors.ocean} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Your Listing</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, {
        paddingBottom: insets.bottom + 80
      }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={18} color={Colors.ocean} />
          <Text style={styles.infoText}>
            Create a listing so potential roommates can find you in the Matchmaker.
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Building Name *</Text>
          <TextInput style={[styles.input, errors.buildingName && styles.inputError]}
            value={buildingName}
            onChangeText={v => { setBuildingName(v); setErrors(e => ({ ...e, buildingName: "" })); }}
            placeholder="e.g. Hub Champaign, 707 S Mathews"
            placeholderTextColor={Colors.textLight} />
          {errors.buildingName ? <Text style={styles.errorText}>{errors.buildingName}</Text> : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Street Address</Text>
          <TextInput style={styles.input} value={address} onChangeText={setAddress}
            placeholder="e.g. 210 E Green St, Champaign"
            placeholderTextColor={Colors.textLight} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Monthly Rent *</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceDollar}>$</Text>
            <TextInput style={[styles.priceInput, errors.price && styles.inputError]}
              value={price}
              onChangeText={v => { setPrice(v); setErrors(e => ({ ...e, price: "" })); }}
              placeholder="0" placeholderTextColor={Colors.textLight}
              keyboardType="numeric" />
            <Text style={styles.priceMonth}>/mo</Text>
          </View>
          {errors.price ? <Text style={styles.errorText}>{errors.price}</Text> : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Rooms Available</Text>
          <View style={styles.roomRow}>
            {ROOM_OPTIONS.map(n => (
              <TouchableOpacity key={n}
                style={[styles.roomBtn, roomsAvailable === n && styles.roomBtnActive]}
                onPress={() => { setRoomsAvailable(n); Haptics.selectionAsync(); }}>
                <Text style={[styles.roomBtnText, roomsAvailable === n && styles.roomBtnTextActive]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Zone / Area</Text>
          <View style={styles.chipRow}>
            {ZONE_OPTIONS.map(opt => (
              <TouchableOpacity key={opt.key}
                style={[styles.chip, zone === opt.key && styles.chipActive]}
                onPress={() => { setZone(opt.key); Haptics.selectionAsync(); }}>
                <Text style={[styles.chipText, zone === opt.key && styles.chipTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Lifestyle Tags</Text>
          <Text style={styles.fieldHint}>Select tags that describe your ideal roommate vibe</Text>
          <View style={styles.tagGrid}>
            {LIFESTYLE_OPTIONS.map(opt => (
              <TouchableOpacity key={opt.key}
                style={[styles.lifestyleChip, lifestyleTags.includes(opt.key) && styles.lifestyleChipActive]}
                onPress={() => toggleTag(opt.key)}>
                <Ionicons name={opt.icon} size={16}
                  color={lifestyleTags.includes(opt.key) ? Colors.white : Colors.textMuted} />
                <Text style={[styles.lifestyleChipText,
                  lifestyleTags.includes(opt.key) && styles.lifestyleChipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription}
            placeholder="Describe the unit, amenities, what you're looking for in a roommate..."
            placeholderTextColor={Colors.textLight} multiline numberOfLines={3} textAlignVertical="top" />
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 12 }]}>
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
          <Ionicons name="checkmark" size={20} color={Colors.white} />
          <Text style={styles.submitBtnText}>Create & Enter Matchmaker</Text>
        </TouchableOpacity>
      </View>
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
  infoBox: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: Colors.ocean + "12", borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.ocean + "25",
  },
  infoText: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.charcoal, flex: 1, lineHeight: 19 },
  field: { gap: 8 },
  label: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.charcoal },
  fieldHint: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted },
  input: {
    backgroundColor: Colors.cardBg, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.borderSoft,
    paddingHorizontal: 14, paddingVertical: 12, fontFamily: "Nunito_400Regular",
    fontSize: 15, color: Colors.charcoal,
  },
  inputError: { borderColor: Colors.errorRed },
  textArea: { height: 90, paddingTop: 12 },
  errorText: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.errorRed },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  priceDollar: { fontFamily: "Nunito_800ExtraBold", fontSize: 22, color: Colors.ocean },
  priceInput: {
    flex: 1, backgroundColor: Colors.cardBg, borderRadius: 12, borderWidth: 1.5,
    borderColor: Colors.borderSoft, paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: "Nunito_800ExtraBold", fontSize: 22, color: Colors.ocean,
  },
  priceMonth: { fontFamily: "Nunito_400Regular", fontSize: 14, color: Colors.textMuted },
  roomRow: { flexDirection: "row", gap: 10 },
  roomBtn: {
    width: 48, height: 48, borderRadius: 14, backgroundColor: Colors.cardBg,
    borderWidth: 1.5, borderColor: Colors.borderSoft,
    alignItems: "center", justifyContent: "center",
  },
  roomBtnActive: { backgroundColor: Colors.ocean, borderColor: Colors.ocean },
  roomBtnText: { fontFamily: "Nunito_800ExtraBold", fontSize: 18, color: Colors.textMuted },
  roomBtnTextActive: { color: Colors.white },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.cardBg, borderWidth: 1.5, borderColor: Colors.borderSoft,
  },
  chipActive: { backgroundColor: Colors.ocean, borderColor: Colors.ocean },
  chipText: { fontFamily: "Nunito_600SemiBold", fontSize: 13, color: Colors.textMuted },
  chipTextActive: { color: Colors.white },
  tagGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  lifestyleChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.cardBg, borderWidth: 1.5, borderColor: Colors.borderSoft,
  },
  lifestyleChipActive: { backgroundColor: Colors.teal, borderColor: Colors.teal },
  lifestyleChipText: { fontFamily: "Nunito_600SemiBold", fontSize: 12, color: Colors.textMuted },
  lifestyleChipTextActive: { color: Colors.white },
  footer: {
    paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: Colors.sand, borderTopWidth: 1, borderTopColor: Colors.borderSoft,
  },
  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.ocean, borderRadius: 14, paddingVertical: 14,
  },
  submitBtnText: { fontFamily: "Nunito_800ExtraBold", fontSize: 16, color: Colors.white },
});
