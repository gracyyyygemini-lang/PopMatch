import React, { useState, useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Platform, KeyboardAvoidingView, Image, Modal, Alert
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import Colors from "@/constants/colors";
import {
  useApp, SubleasePost, Zone, LifestyleTag, CleaningFrequency,
  ShoePolicy, AmenityKey, AMENITY_DEFS, ListingPhoto
} from "@/context/AppContext";

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

const CLEANING_OPTIONS: { key: CleaningFrequency; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "daily", label: "Daily", icon: "sparkles" },
  { key: "weekly", label: "Weekly", icon: "calendar-outline" },
  { key: "monthly", label: "Monthly", icon: "time-outline" },
];

const SHOE_OPTIONS: { key: ShoePolicy; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "shoes_off", label: "Shoes Off", icon: "home-outline" },
  { key: "front_door", label: "At Front Door", icon: "log-in-outline" },
  { key: "no_policy", label: "No Policy", icon: "remove-circle-outline" },
];

const AMENITY_CATEGORIES = [
  { key: "foundational" as const, label: "Foundational", color: Colors.ocean },
  { key: "collegiate" as const, label: "Collegiate", color: Colors.grassGreen },
  { key: "financial" as const, label: "Financial", color: Colors.gold },
  { key: "building" as const, label: "Building", color: Colors.ponyo },
];

type PhotoSlot = "bedroom" | "bathroom" | "kitchen" | "communal";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const YEARS = [2025, 2026, 2027];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];

function DateTimePicker({ label, value, onChange }: {
  label: string;
  value: { month: number; day: number; year: number; hour: number; minute: number };
  onChange: (v: { month: number; day: number; year: number; hour: number; minute: number }) => void;
}) {
  const [open, setOpen] = useState(false);

  const displayText = `${MONTHS[value.month]} ${value.day}, ${value.year} at ${String(value.hour).padStart(2, "0")}:${String(value.minute).padStart(2, "0")}`;

  return (
    <>
      <TouchableOpacity style={dtStyles.trigger} onPress={() => setOpen(true)}>
        <Ionicons name="calendar" size={16} color={Colors.ocean} />
        <View style={dtStyles.triggerTextWrap}>
          <Text style={dtStyles.triggerLabel}>{label}</Text>
          <Text style={dtStyles.triggerValue}>{displayText}</Text>
        </View>
        <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide">
        <View style={dtStyles.overlay}>
          <View style={dtStyles.sheet}>
            <View style={dtStyles.sheetHeader}>
              <Text style={dtStyles.sheetTitle}>{label}</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Ionicons name="checkmark-circle" size={28} color={Colors.ocean} />
              </TouchableOpacity>
            </View>

            <View style={dtStyles.row}>
              <View style={dtStyles.col}>
                <Text style={dtStyles.colLabel}>Month</Text>
                <ScrollView style={dtStyles.scroll} showsVerticalScrollIndicator={false}>
                  {MONTHS.map((m, i) => (
                    <TouchableOpacity key={m}
                      style={[dtStyles.option, value.month === i && dtStyles.optionActive]}
                      onPress={() => { onChange({ ...value, month: i }); Haptics.selectionAsync(); }}>
                      <Text style={[dtStyles.optionText, value.month === i && dtStyles.optionTextActive]}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={dtStyles.col}>
                <Text style={dtStyles.colLabel}>Day</Text>
                <ScrollView style={dtStyles.scroll} showsVerticalScrollIndicator={false}>
                  {DAYS.map(d => (
                    <TouchableOpacity key={d}
                      style={[dtStyles.option, value.day === d && dtStyles.optionActive]}
                      onPress={() => { onChange({ ...value, day: d }); Haptics.selectionAsync(); }}>
                      <Text style={[dtStyles.optionText, value.day === d && dtStyles.optionTextActive]}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={dtStyles.col}>
                <Text style={dtStyles.colLabel}>Year</Text>
                <ScrollView style={dtStyles.scroll} showsVerticalScrollIndicator={false}>
                  {YEARS.map(y => (
                    <TouchableOpacity key={y}
                      style={[dtStyles.option, value.year === y && dtStyles.optionActive]}
                      onPress={() => { onChange({ ...value, year: y }); Haptics.selectionAsync(); }}>
                      <Text style={[dtStyles.optionText, value.year === y && dtStyles.optionTextActive]}>{y}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={dtStyles.col}>
                <Text style={dtStyles.colLabel}>Hour</Text>
                <ScrollView style={dtStyles.scroll} showsVerticalScrollIndicator={false}>
                  {HOURS.map(h => (
                    <TouchableOpacity key={h}
                      style={[dtStyles.option, value.hour === h && dtStyles.optionActive]}
                      onPress={() => { onChange({ ...value, hour: h }); Haptics.selectionAsync(); }}>
                      <Text style={[dtStyles.optionText, value.hour === h && dtStyles.optionTextActive]}>
                        {String(h).padStart(2, "0")}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={dtStyles.col}>
                <Text style={dtStyles.colLabel}>Min</Text>
                <ScrollView style={dtStyles.scroll} showsVerticalScrollIndicator={false}>
                  {MINUTES.map(m => (
                    <TouchableOpacity key={m}
                      style={[dtStyles.option, value.minute === m && dtStyles.optionActive]}
                      onPress={() => { onChange({ ...value, minute: m }); Haptics.selectionAsync(); }}>
                      <Text style={[dtStyles.optionText, value.minute === m && dtStyles.optionTextActive]}>
                        :{String(m).padStart(2, "0")}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const dtStyles = StyleSheet.create({
  trigger: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: Colors.cardBg, borderRadius: 12, borderWidth: 1.5,
    borderColor: Colors.borderSoft, padding: 14,
  },
  triggerTextWrap: { flex: 1 },
  triggerLabel: { fontFamily: "Nunito_600SemiBold", fontSize: 11, color: Colors.textMuted },
  triggerValue: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.charcoal },
  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.sand, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 40, maxHeight: "60%",
  },
  sheetHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16,
  },
  sheetTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 18, color: Colors.charcoal },
  row: { flexDirection: "row", gap: 8, flex: 1 },
  col: { flex: 1, gap: 4 },
  colLabel: { fontFamily: "Nunito_700Bold", fontSize: 11, color: Colors.textMuted, textAlign: "center" },
  scroll: { maxHeight: 220 },
  option: {
    paddingVertical: 8, paddingHorizontal: 4, borderRadius: 8, alignItems: "center",
  },
  optionActive: { backgroundColor: Colors.ocean },
  optionText: { fontFamily: "Nunito_600SemiBold", fontSize: 13, color: Colors.charcoal },
  optionTextActive: { color: Colors.white },
});

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

  const [hasPrivateKitchen, setHasPrivateKitchen] = useState<boolean | null>(null);
  const [photos, setPhotos] = useState<Record<PhotoSlot, string | null>>({
    bedroom: null, bathroom: null, kitchen: null, communal: null,
  });

  const now = new Date();
  const [moveIn, setMoveIn] = useState({ month: 7, day: 15, year: 2026, hour: 14, minute: 0 });
  const [moveOut, setMoveOut] = useState({ month: 4, day: 30, year: 2027, hour: 12, minute: 0 });

  const [cleaningFrequency, setCleaningFrequency] = useState<CleaningFrequency | null>(null);
  const [shoePolicy, setShoePolicy] = useState<ShoePolicy | null>(null);
  const [amenities, setAmenities] = useState<AmenityKey[]>([]);

  const requiredSlots: PhotoSlot[] = useMemo(() => {
    if (hasPrivateKitchen === null) return [];
    return hasPrivateKitchen
      ? ["bedroom", "bathroom", "kitchen"]
      : ["bedroom", "bathroom", "communal"];
  }, [hasPrivateKitchen]);

  const allPhotosUploaded = requiredSlots.length > 0 && requiredSlots.every(s => photos[s]);

  const toggleTag = (tag: LifestyleTag) => {
    setLifestyleTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
    Haptics.selectionAsync();
  };

  const toggleAmenity = (key: AmenityKey) => {
    setAmenities(prev =>
      prev.includes(key) ? prev.filter(a => a !== key) : [...prev, key]
    );
    Haptics.selectionAsync();
  };

  const pickPhoto = async (slot: PhotoSlot) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please grant photo library access to upload images.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) {
      setPhotos(prev => ({ ...prev, [slot]: result.assets[0].uri }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!buildingName.trim()) e.buildingName = "Building name is required";
    if (!price.trim() || isNaN(Number(price)) || Number(price) <= 0) e.price = "Enter a valid rent amount";
    if (!cleaningFrequency) e.cleaning = "Cleaning frequency is required";
    if (!shoePolicy) e.shoes = "Shoe policy is required";
    if (hasPrivateKitchen === null) e.kitchen = "Please answer the kitchen question";
    if (!allPhotosUploaded) e.photos = "All required photos must be uploaded";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const canSubmit = buildingName.trim().length > 0
    && price.trim().length > 0
    && !isNaN(Number(price))
    && Number(price) > 0
    && cleaningFrequency !== null
    && shoePolicy !== null
    && hasPrivateKitchen !== null
    && allPhotosUploaded;

  const formatDate = (d: { month: number; day: number; year: number; hour: number; minute: number }) =>
    `${MONTHS[d.month]} ${d.day}, ${d.year} ${String(d.hour).padStart(2, "0")}:${String(d.minute).padStart(2, "0")}`;

  const handleSubmit = async () => {
    if (!validate() || !currentUser) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const listingId = Date.now().toString() + Math.random().toString(36).substr(2, 6);

    const listingPhotos: ListingPhoto[] = requiredSlots
      .filter(s => photos[s])
      .map(s => ({ uri: photos[s]!, slot: s }));

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
      photos: listingPhotos,
      moveInDate: formatDate(moveIn),
      moveOutDate: formatDate(moveOut),
      cleaningFrequency: cleaningFrequency!,
      shoePolicy: shoePolicy!,
      amenities,
      hasPrivateKitchen: hasPrivateKitchen!,
    };

    await addSublease(post);
    await setCurrentUser({ ...currentUser, linkedListingId: listingId });
    router.replace("/matchmaker");
  };

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const slotLabels: Record<PhotoSlot, string> = {
    bedroom: "Bedroom", bathroom: "Bathroom", kitchen: "Kitchen", communal: "Communal Area"
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: Colors.sand }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={20} color={Colors.ocean} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Master Listing Creator</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, {
        paddingBottom: insets.bottom + 80
      }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        <View style={styles.infoBox}>
          <Ionicons name="sparkles" size={18} color={Colors.ocean} />
          <Text style={styles.infoText}>
            Create a detailed listing so the Matchmaker can find your ideal roommate.
          </Text>
        </View>

        {/* Building & Address */}
        <View style={styles.field}>
          <Text style={styles.sectionTitle}>Location</Text>
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

        {/* Rent & Rooms */}
        <View style={styles.field}>
          <Text style={styles.sectionTitle}>Rent & Capacity</Text>
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

        {/* Exact Handoff Dates */}
        <View style={styles.field}>
          <Text style={styles.sectionTitle}>Exact Handoff Dates</Text>
          <Text style={styles.fieldHint}>Set the exact move-in and move-out time</Text>
          <DateTimePicker label="Move-In Date & Time" value={moveIn} onChange={setMoveIn} />
          <DateTimePicker label="Move-Out Date & Time" value={moveOut} onChange={setMoveOut} />
        </View>

        {/* Smart Image Logic */}
        <View style={styles.field}>
          <Text style={styles.sectionTitle}>Photos *</Text>

          <View style={styles.kitchenQuestion}>
            <Text style={styles.kitchenQuestionText}>Private kitchen included?</Text>
            <View style={styles.kitchenBtnRow}>
              <TouchableOpacity
                style={[styles.kitchenBtn, hasPrivateKitchen === true && styles.kitchenBtnActive]}
                onPress={() => { setHasPrivateKitchen(true); Haptics.selectionAsync(); }}>
                <Ionicons name="checkmark" size={14}
                  color={hasPrivateKitchen === true ? Colors.white : Colors.textMuted} />
                <Text style={[styles.kitchenBtnText,
                  hasPrivateKitchen === true && styles.kitchenBtnTextActive]}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.kitchenBtn, hasPrivateKitchen === false && styles.kitchenBtnActive]}
                onPress={() => { setHasPrivateKitchen(false); Haptics.selectionAsync(); }}>
                <Ionicons name="close" size={14}
                  color={hasPrivateKitchen === false ? Colors.white : Colors.textMuted} />
                <Text style={[styles.kitchenBtnText,
                  hasPrivateKitchen === false && styles.kitchenBtnTextActive]}>No</Text>
              </TouchableOpacity>
            </View>
            {errors.kitchen ? <Text style={styles.errorText}>{errors.kitchen}</Text> : null}
          </View>

          {hasPrivateKitchen !== null && (
            <View style={styles.photoGrid}>
              {requiredSlots.map(slot => (
                <TouchableOpacity key={slot} style={styles.photoSlot} onPress={() => pickPhoto(slot)}>
                  {photos[slot] ? (
                    <Image source={{ uri: photos[slot]! }} style={styles.photoImage} />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Ionicons name="camera-outline" size={24} color={Colors.textMuted} />
                      <Text style={styles.photoSlotLabel}>{slotLabels[slot]}</Text>
                    </View>
                  )}
                  {photos[slot] && (
                    <View style={styles.photoCheck}>
                      <Ionicons name="checkmark-circle" size={20} color={Colors.grassGreen} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
          {errors.photos ? <Text style={styles.errorText}>{errors.photos}</Text> : null}
        </View>

        {/* Living Standards */}
        <View style={styles.field}>
          <Text style={styles.sectionTitle}>Living Standards *</Text>

          <Text style={styles.label}>Cleaning Frequency</Text>
          <View style={styles.standardRow}>
            {CLEANING_OPTIONS.map(opt => (
              <TouchableOpacity key={opt.key}
                style={[styles.standardBtn, cleaningFrequency === opt.key && styles.standardBtnActive]}
                onPress={() => { setCleaningFrequency(opt.key); Haptics.selectionAsync(); setErrors(e => ({...e, cleaning: ""})); }}>
                <Ionicons name={opt.icon} size={18}
                  color={cleaningFrequency === opt.key ? Colors.white : Colors.textMuted} />
                <Text style={[styles.standardBtnText,
                  cleaningFrequency === opt.key && styles.standardBtnTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {errors.cleaning ? <Text style={styles.errorText}>{errors.cleaning}</Text> : null}

          <Text style={[styles.label, { marginTop: 12 }]}>Shoe Policy</Text>
          <View style={styles.standardRow}>
            {SHOE_OPTIONS.map(opt => (
              <TouchableOpacity key={opt.key}
                style={[styles.standardBtn, shoePolicy === opt.key && styles.standardBtnActive]}
                onPress={() => { setShoePolicy(opt.key); Haptics.selectionAsync(); setErrors(e => ({...e, shoes: ""})); }}>
                <Ionicons name={opt.icon} size={18}
                  color={shoePolicy === opt.key ? Colors.white : Colors.textMuted} />
                <Text style={[styles.standardBtnText,
                  shoePolicy === opt.key && styles.standardBtnTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {errors.shoes ? <Text style={styles.errorText}>{errors.shoes}</Text> : null}
        </View>

        {/* 16-Point Amenities */}
        <View style={styles.field}>
          <Text style={styles.sectionTitle}>Amenities</Text>
          <Text style={styles.fieldHint}>Select all that apply</Text>
          {AMENITY_CATEGORIES.map(cat => {
            const catAmenities = AMENITY_DEFS.filter(a => a.category === cat.key);
            return (
              <View key={cat.key} style={styles.amenityCatBlock}>
                <View style={[styles.amenityCatHeader, { borderLeftColor: cat.color }]}>
                  <Text style={[styles.amenityCatLabel, { color: cat.color }]}>{cat.label}</Text>
                </View>
                <View style={styles.amenityGrid}>
                  {catAmenities.map(a => (
                    <TouchableOpacity key={a.key}
                      style={[styles.amenityBtn, amenities.includes(a.key) && { backgroundColor: cat.color, borderColor: cat.color }]}
                      onPress={() => toggleAmenity(a.key)}>
                      <Ionicons name={a.icon as any} size={16}
                        color={amenities.includes(a.key) ? Colors.white : Colors.textMuted} />
                      <Text style={[styles.amenityBtnText,
                        amenities.includes(a.key) && { color: Colors.white }]}
                        numberOfLines={1}>{a.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            );
          })}
        </View>

        {/* Lifestyle Tags */}
        <View style={styles.field}>
          <Text style={styles.sectionTitle}>Lifestyle Tags</Text>
          <Text style={styles.fieldHint}>Describe your ideal roommate vibe</Text>
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

        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription}
            placeholder="Describe the unit, amenities, what you're looking for in a roommate..."
            placeholderTextColor={Colors.textLight} multiline numberOfLines={3} textAlignVertical="top" />
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 12 }]}>
        <TouchableOpacity
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}>
          <Ionicons name="checkmark" size={20} color={Colors.white} />
          <Text style={styles.submitBtnText}>Post & Enter Matchmaker</Text>
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
  sectionTitle: {
    fontFamily: "Nunito_800ExtraBold", fontSize: 16, color: Colors.ocean, marginBottom: 4,
  },
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

  kitchenQuestion: {
    backgroundColor: Colors.cardBg, borderRadius: 14, borderWidth: 1.5,
    borderColor: Colors.borderSoft, padding: 14, gap: 10,
  },
  kitchenQuestionText: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.charcoal },
  kitchenBtnRow: { flexDirection: "row", gap: 10 },
  kitchenBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.sandDark,
    borderWidth: 1.5, borderColor: Colors.borderSoft,
  },
  kitchenBtnActive: { backgroundColor: Colors.ocean, borderColor: Colors.ocean },
  kitchenBtnText: { fontFamily: "Nunito_700Bold", fontSize: 13, color: Colors.textMuted },
  kitchenBtnTextActive: { color: Colors.white },

  photoGrid: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  photoSlot: {
    width: "31%" as any, aspectRatio: 4 / 3, borderRadius: 12, overflow: "hidden",
    borderWidth: 1.5, borderColor: Colors.borderSoft, borderStyle: "dashed",
  },
  photoImage: { width: "100%", height: "100%", borderRadius: 10 },
  photoPlaceholder: {
    flex: 1, alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.cardBg, gap: 4,
  },
  photoSlotLabel: { fontFamily: "Nunito_600SemiBold", fontSize: 10, color: Colors.textMuted },
  photoCheck: { position: "absolute", top: 4, right: 4 },

  standardRow: { flexDirection: "row", gap: 8 },
  standardBtn: {
    flex: 1, alignItems: "center", gap: 4, paddingVertical: 12, borderRadius: 12,
    backgroundColor: Colors.cardBg, borderWidth: 1.5, borderColor: Colors.borderSoft,
  },
  standardBtnActive: { backgroundColor: Colors.ocean, borderColor: Colors.ocean },
  standardBtnText: { fontFamily: "Nunito_700Bold", fontSize: 12, color: Colors.textMuted },
  standardBtnTextActive: { color: Colors.white },

  amenityCatBlock: { gap: 6, marginTop: 4 },
  amenityCatHeader: { borderLeftWidth: 3, paddingLeft: 8 },
  amenityCatLabel: { fontFamily: "Nunito_700Bold", fontSize: 13 },
  amenityGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  amenityBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10,
    backgroundColor: Colors.cardBg, borderWidth: 1.5, borderColor: Colors.borderSoft,
  },
  amenityBtnText: { fontFamily: "Nunito_600SemiBold", fontSize: 11, color: Colors.textMuted },

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
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { fontFamily: "Nunito_800ExtraBold", fontSize: 16, color: Colors.white },
});
