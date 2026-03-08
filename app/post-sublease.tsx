import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Platform, KeyboardAvoidingView, Image, Alert, useWindowDimensions
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import Colors from "@/constants/colors";
import {
  useApp, SubleasePost, LeaseType, Landlord, Zone, BreakType,
  KitchenType, BathroomType, CleaningFrequency, ShoePolicy, Amenities, DEFAULT_AMENITIES
} from "@/context/AppContext";

const LEASE_OPTIONS: { key: LeaseType; label: string; desc: string }[] = [
  { key: "full_year", label: "Full Year", desc: "Aug – Jul (12 months)" },
  { key: "fall_sublease", label: "Fall Sublease", desc: "Aug – Dec" },
  { key: "spring_sublease", label: "Spring Sublease", desc: "Jan – May" },
  { key: "summer_sublease", label: "Summer Sublease", desc: "May – Aug" },
];

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

const AMENITY_SECTIONS: { title: string; items: { key: keyof Amenities; label: string; icon: keyof typeof Ionicons.glyphMap }[] }[] = [
  {
    title: "Foundational",
    items: [
      { key: "isFurnished", label: "Furnished", icon: "bed-outline" },
      { key: "hasLaundry", label: "Laundry", icon: "water-outline" },
      { key: "hasWifi", label: "WiFi", icon: "wifi-outline" },
      { key: "hasAC", label: "A/C", icon: "snow-outline" },
    ],
  },
  {
    title: "Collegiate",
    items: [
      { key: "hasStudyLounge", label: "Study Lounge", icon: "library-outline" },
      { key: "hasPrinting", label: "Printing", icon: "print-outline" },
      { key: "hasBikeStorage", label: "Bike Storage", icon: "bicycle-outline" },
      { key: "hasSecurity", label: "Security", icon: "shield-outline" },
    ],
  },
  {
    title: "Financial",
    items: [
      { key: "utilsIncluded", label: "Utils Included", icon: "flash-outline" },
      { key: "noDeposit", label: "No Deposit", icon: "cash-outline" },
      { key: "parkingIncluded", label: "Parking", icon: "car-outline" },
    ],
  },
  {
    title: "Building",
    items: [
      { key: "hasGym", label: "Gym", icon: "barbell-outline" },
      { key: "hasPool", label: "Pool", icon: "water-outline" },
      { key: "hasElevator", label: "Elevator", icon: "swap-vertical-outline" },
      { key: "hasRooftop", label: "Rooftop", icon: "sunny-outline" },
      { key: "hasLockers", label: "Lockers", icon: "lock-closed-outline" },
    ],
  },
];

const AVATAR_COLORS = ["#1A7AAF", "#CC5500", "#5A8A5A", "#9B59B6", "#E07B00", "#E0BC00"];

const TOTAL_STEPS = 4;

export default function PostSubleaseScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser, addSublease } = useApp();
  const params = useLocalSearchParams<{ mode?: string }>();
  const isHostMode = params.mode === "host";
  const [step, setStep] = useState(0);

  const [buildingName, setBuildingName] = useState("");
  const [address, setAddress] = useState("");
  const [leaseType, setLeaseType] = useState<LeaseType>("fall_sublease");
  const [price, setPrice] = useState("");
  const [landlord, setLandlord] = useState<Landlord>("other");
  const [zone, setZone] = useState<Zone>("campustown");
  const [availableDuringBreaks, setAvailableDuringBreaks] = useState(false);
  const [selectedBreaks, setSelectedBreaks] = useState<BreakType[]>([]);
  const [description, setDescription] = useState("");

  const [kitchenType, setKitchenType] = useState<KitchenType>("private");
  const [bathroomType, setBathroomType] = useState<BathroomType>("private");
  const [unitType, setUnitType] = useState("");
  const [isPrivateBedroom, setIsPrivateBedroom] = useState(true);
  const [isPrivateBathroom, setIsPrivateBathroom] = useState(true);
  const [images, setImages] = useState<(string | null)[]>([null, null, null]);
  const [floorPlanImage, setFloorPlanImage] = useState<string | null>(null);
  const [roomsAvailable, setRoomsAvailable] = useState("1");
  const [currentResidentBio, setCurrentResidentBio] = useState("");

  const [amenities, setAmenities] = useState<Amenities>({ ...DEFAULT_AMENITIES });

  const [cleaningFrequency, setCleaningFrequency] = useState<CleaningFrequency>("weekly");
  const [shoePolicy, setShoePolicy] = useState<ShoePolicy>("no_policy");
  const [moveInDate, setMoveInDate] = useState<Date | null>(null);
  const [moveOutDate, setMoveOutDate] = useState<Date | null>(null);
  const [showMoveInPicker, setShowMoveInPicker] = useState(false);
  const [showMoveOutPicker, setShowMoveOutPicker] = useState(false);

  const warning = LANDLORD_WARNINGS[landlord];

  const toggleBreak = (b: BreakType) => {
    setSelectedBreaks(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]);
    Haptics.selectionAsync();
  };

  const toggleAmenity = (key: keyof Amenities) => {
    setAmenities(prev => ({ ...prev, [key]: !prev[key] }));
    Haptics.selectionAsync();
  };

  const imageLabels = [
    "Bedroom",
    isPrivateBathroom ? "Private Bathroom" : "Shared Bathroom",
    kitchenType === "private" ? "Private Kitchen" : "Communal Kitchen/Area",
  ];

  const pickImage = async (index: number) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      const newImages = [...images];
      newImages[index] = result.assets[0].uri;
      setImages(newImages);
    }
  };

  const pickFloorPlan = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setFloorPlanImage(result.assets[0].uri);
    }
  };

  const generateDateOptions = (type: "moveIn" | "moveOut") => {
    const dates: Date[] = [];
    const start = new Date();
    start.setDate(start.getDate() + (type === "moveIn" ? 1 : 30));
    for (let i = 0; i < 24; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i * 7);
      d.setHours(type === "moveIn" ? 14 : 12, 0, 0, 0);
      dates.push(d);
    }
    return dates;
  };

  const allImagesUploaded = images.every(img => img !== null);

  const canSubmit = buildingName.trim() && price.trim() && !isNaN(Number(price)) && Number(price) > 0
    && allImagesUploaded && moveInDate !== null && moveOutDate !== null;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const post: SubleasePost = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
      userId: currentUser?.id || "guest",
      userName: currentUser?.name || "Anonymous",
      userEmail: currentUser?.email || "student@illinois.edu",
      buildingName: buildingName.trim(),
      address: address.trim(),
      leaseType,
      pricePerMonth: Number(price),
      landlord,
      zone,
      availableDuringBreaks,
      breakTypes: selectedBreaks,
      description: description.trim(),
      avatarColor: currentUser?.avatarColor || AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      timestamp: Date.now(),
      kitchenType,
      bathroomType,
      unitType: unitType.trim() || undefined,
      isPrivateBedroom,
      isPrivateBathroom,
      floorPlanUrl: floorPlanImage || undefined,
      roomsAvailable: isHostMode && roomsAvailable ? Number(roomsAvailable) : undefined,
      currentResidentBio: isHostMode && currentResidentBio.trim() ? currentResidentBio.trim() : undefined,
      listingType: isHostMode ? "roommate" : "sublease",
      moveInDate: moveInDate!.toISOString(),
      moveOutDate: moveOutDate!.toISOString(),
      amenities,
      cleaningFrequency,
      shoePolicy,
      images: images.filter(Boolean) as string[],
    };

    await addSublease(post);
    if (isHostMode) {
      router.replace("/(tabs)/profile");
    } else {
      router.canGoBack() ? router.back() : router.replace("/(tabs)");
    }
  };

  const { width: winWidth } = useWindowDimensions();
  const isDesktopPs = Platform.OS === "web" && winWidth >= 1024;
  const contentMaxWidthPs = isDesktopPs ? 720 : winWidth;
  const topPadding = Platform.OS === "web" ? (isDesktopPs ? 24 : 67) : insets.top;

  const goNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(s => Math.min(s + 1, TOTAL_STEPS - 1));
  };
  const goBack = () => {
    if (step === 0) { router.canGoBack() ? router.back() : router.replace("/(tabs)"); return; }
    setStep(s => s - 1);
  };

  const stepValid = (s: number) => {
    if (s === 0) return !!(buildingName.trim() && price.trim() && !isNaN(Number(price)) && Number(price) > 0);
    if (s === 1) {
      if (!allImagesUploaded) return false;
      if (isHostMode && !unitType.trim()) return false;
      return true;
    }
    if (s === 2) return true;
    if (s === 3) return moveInDate !== null && moveOutDate !== null;
    return true;
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: Colors.sand }, isDesktopPs && { maxWidth: contentMaxWidthPs, alignSelf: "center" as const, width: "100%" }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <Ionicons name={step === 0 ? "close" : "arrow-back"} size={20} color={Colors.ocean} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{isHostMode ? "Post My Apartment" : "Post My Sublease"}</Text>
          <Text style={styles.headerSub}>Step {step + 1} of {TOTAL_STEPS}</Text>
        </View>
        <View style={styles.stepDots}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <View key={i} style={[styles.stepDot, i <= step && styles.stepDotActive]} />
          ))}
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, {
        paddingBottom: insets.bottom + 80
      }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {step === 0 && (
          <>
            <View style={styles.field}>
              <Text style={styles.label}>Building Name *</Text>
              <TextInput style={styles.input}
                value={buildingName} onChangeText={setBuildingName}
                placeholder="e.g. Hub Champaign, 707, Fairview"
                placeholderTextColor={Colors.textLight} />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Street Address</Text>
              <TextInput style={styles.input} value={address} onChangeText={setAddress}
                placeholder="e.g. 210 E Green St, Champaign"
                placeholderTextColor={Colors.textLight} />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Monthly Price ($/mo) *</Text>
              <View style={styles.priceRow}>
                <Text style={styles.priceDollar}>$</Text>
                <TextInput style={styles.priceInput}
                  value={price} onChangeText={setPrice}
                  placeholder="0" placeholderTextColor={Colors.textLight}
                  keyboardType="numeric" />
                <Text style={styles.priceMonth}>/mo</Text>
              </View>
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

            {isHostMode && (
              <>
                <View style={styles.field}>
                  <Text style={styles.label}>Spots Available *</Text>
                  <View style={styles.chipRow}>
                    {["1", "2", "3", "4"].map(n => (
                      <TouchableOpacity key={n} style={[styles.chip, roomsAvailable === n && styles.chipActive]}
                        onPress={() => { setRoomsAvailable(n); Haptics.selectionAsync(); }}>
                        <Text style={[styles.chipText, roomsAvailable === n && styles.chipTextActive]}>{n}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Who Already Lives There?</Text>
                  <TextInput style={[styles.input, styles.textArea]} value={currentResidentBio} onChangeText={setCurrentResidentBio}
                    placeholder="e.g. 2 junior CS majors, clean and quiet. We cook together on weekends."
                    placeholderTextColor={Colors.textLight} multiline numberOfLines={3} textAlignVertical="top" />
                  <Text style={styles.fieldHint}>Help joiners know who they'd be living with</Text>
                </View>
              </>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>Description</Text>
              <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription}
                placeholder={isHostMode
                  ? "Describe the room, common spaces, house rules..."
                  : "Describe the unit, amenities, furniture situation..."}
                placeholderTextColor={Colors.textLight} multiline numberOfLines={3} textAlignVertical="top" />
            </View>
          </>
        )}

        {step === 1 && (
          <>
            <Text style={styles.sectionTitle}>Unit Details & Photos</Text>
            <Text style={styles.sectionSub}>Describe your unit layout, privacy options, then upload photos.</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Unit Type</Text>
              <TextInput style={styles.input}
                value={unitType} onChangeText={setUnitType}
                placeholder="e.g. 2B2B, 3B3B, Studio, 1B1B"
                placeholderTextColor={Colors.textLight}
                autoCapitalize="characters" />
              <Text style={styles.fieldHint}>Format: [Bedrooms]B[Bathrooms]B or Studio</Text>
            </View>

            <View style={styles.field}>
              <TouchableOpacity style={styles.toggleRow}
                onPress={() => { setIsPrivateBedroom(!isPrivateBedroom); Haptics.selectionAsync(); }}>
                <View>
                  <Text style={styles.toggleTitle}>Private Bedroom?</Text>
                  <Text style={styles.toggleDesc}>The bedroom is not shared with another person</Text>
                </View>
                <View style={[styles.toggle, isPrivateBedroom && styles.toggleOn]}>
                  <Text style={[styles.toggleText, isPrivateBedroom && styles.toggleTextOn]}>
                    {isPrivateBedroom ? "Yes" : "No"}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.field}>
              <TouchableOpacity style={styles.toggleRow}
                onPress={() => { setIsPrivateBathroom(!isPrivateBathroom); setBathroomType(isPrivateBathroom ? "shared" : "private"); Haptics.selectionAsync(); }}>
                <View>
                  <Text style={styles.toggleTitle}>Private Bathroom?</Text>
                  <Text style={styles.toggleDesc}>Your unit has its own private bathroom</Text>
                </View>
                <View style={[styles.toggle, isPrivateBathroom && styles.toggleOn]}>
                  <Text style={[styles.toggleText, isPrivateBathroom && styles.toggleTextOn]}>
                    {isPrivateBathroom ? "Yes" : "No"}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Kitchen Type *</Text>
              <View style={styles.chipRow}>
                {(["private", "communal"] as KitchenType[]).map(k => (
                  <TouchableOpacity key={k} style={[styles.chip, kitchenType === k && styles.chipActive]}
                    onPress={() => { setKitchenType(k); Haptics.selectionAsync(); }}>
                    <Ionicons name={k === "private" ? "restaurant-outline" : "people-outline"} size={14}
                      color={kitchenType === k ? Colors.white : Colors.textMuted} />
                    <Text style={[styles.chipText, kitchenType === k && styles.chipTextActive]}>
                      {k === "private" ? "Private Kitchen" : "Communal Kitchen"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Upload Photos * (3 required)</Text>
              <View style={styles.photoGrid}>
                {imageLabels.map((label, idx) => (
                  <TouchableOpacity key={label} style={styles.photoSlot} onPress={() => pickImage(idx)}>
                    {images[idx] ? (
                      <Image source={{ uri: images[idx]! }} style={styles.photoImage} />
                    ) : (
                      <View style={styles.photoEmpty}>
                        <Ionicons name="camera-outline" size={28} color={Colors.textLight} />
                        <Text style={styles.photoLabel}>{label}</Text>
                      </View>
                    )}
                    {images[idx] && (
                      <View style={styles.photoLabelOverlay}>
                        <Text style={styles.photoLabelOverlayText}>{label}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              {!allImagesUploaded && (
                <Text style={styles.photoHint}>Tap each slot to upload. All 3 photos are required.</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Floor Plan (Optional)</Text>
              <TouchableOpacity style={styles.floorPlanSlot} onPress={pickFloorPlan}>
                {floorPlanImage ? (
                  <Image source={{ uri: floorPlanImage }} style={styles.floorPlanImage} />
                ) : (
                  <View style={styles.floorPlanEmpty}>
                    <Ionicons name="map-outline" size={28} color={Colors.textLight} />
                    <Text style={styles.photoLabel}>Floor Plan</Text>
                  </View>
                )}
                {floorPlanImage && (
                  <View style={styles.photoLabelOverlay}>
                    <Text style={styles.photoLabelOverlayText}>Floor Plan</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.sectionTitle}>Amenities</Text>
            <Text style={styles.sectionSub}>Toggle each amenity for your listing.</Text>

            {AMENITY_SECTIONS.map(section => (
              <View key={section.title} style={styles.amenitySection}>
                <Text style={styles.amenitySectionTitle}>{section.title}</Text>
                <View style={styles.amenityGrid}>
                  {section.items.map(item => {
                    const active = amenities[item.key];
                    return (
                      <TouchableOpacity key={item.key}
                        style={[styles.amenityToggle, active && styles.amenityToggleActive]}
                        onPress={() => toggleAmenity(item.key)}>
                        <Ionicons name={item.icon} size={18} color={active ? Colors.white : Colors.textMuted} />
                        <Text style={[styles.amenityToggleText, active && styles.amenityToggleTextActive]}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </>
        )}

        {step === 3 && (
          <>
            <Text style={styles.sectionTitle}>Cleanliness & Handoff</Text>
            <Text style={styles.sectionSub}>Set cleaning habits and exact move-in/out times.</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Cleaning Frequency</Text>
              <View style={styles.chipRow}>
                {(["daily", "weekly", "monthly"] as CleaningFrequency[]).map(f => (
                  <TouchableOpacity key={f} style={[styles.chip, cleaningFrequency === f && styles.chipActive]}
                    onPress={() => { setCleaningFrequency(f); Haptics.selectionAsync(); }}>
                    <Text style={[styles.chipText, cleaningFrequency === f && styles.chipTextActive]}>
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Shoe Policy</Text>
              <View style={styles.chipRow}>
                {([
                  { key: "shoes_off" as ShoePolicy, label: "Shoes Off" },
                  { key: "front_door" as ShoePolicy, label: "Front Door" },
                  { key: "no_policy" as ShoePolicy, label: "No Policy" },
                ]).map(p => (
                  <TouchableOpacity key={p.key} style={[styles.chip, shoePolicy === p.key && styles.chipActive]}
                    onPress={() => { setShoePolicy(p.key); Haptics.selectionAsync(); }}>
                    <Text style={[styles.chipText, shoePolicy === p.key && styles.chipTextActive]}>{p.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Move-In Date *</Text>
              <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowMoveInPicker(!showMoveInPicker)}>
                <Ionicons name="calendar-outline" size={18} color={moveInDate ? Colors.ocean : Colors.textLight} />
                <Text style={[styles.datePickerText, !moveInDate && { color: Colors.textLight }]}>
                  {moveInDate ? moveInDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "Select move-in date"}
                </Text>
                <Ionicons name={showMoveInPicker ? "chevron-up" : "chevron-down"} size={16} color={Colors.textMuted} />
              </TouchableOpacity>
              {showMoveInPicker && (
                <View style={styles.dateGrid}>
                  {generateDateOptions("moveIn").map(d => {
                    const isSelected = moveInDate?.toDateString() === d.toDateString();
                    return (
                      <TouchableOpacity key={d.toISOString()} style={[styles.dateOption, isSelected && styles.dateOptionActive]}
                        onPress={() => { setMoveInDate(d); setShowMoveInPicker(false); Haptics.selectionAsync(); }}>
                        <Text style={[styles.dateOptionMonth, isSelected && { color: Colors.white }]}>
                          {d.toLocaleDateString("en-US", { month: "short" })}
                        </Text>
                        <Text style={[styles.dateOptionDay, isSelected && { color: Colors.white }]}>
                          {d.getDate()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
              <Text style={styles.fieldHint}>Date for key handoff</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Move-Out Date *</Text>
              <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowMoveOutPicker(!showMoveOutPicker)}>
                <Ionicons name="calendar-outline" size={18} color={moveOutDate ? Colors.ocean : Colors.textLight} />
                <Text style={[styles.datePickerText, !moveOutDate && { color: Colors.textLight }]}>
                  {moveOutDate ? moveOutDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "Select move-out date"}
                </Text>
                <Ionicons name={showMoveOutPicker ? "chevron-up" : "chevron-down"} size={16} color={Colors.textMuted} />
              </TouchableOpacity>
              {showMoveOutPicker && (
                <View style={styles.dateGrid}>
                  {generateDateOptions("moveOut").map(d => {
                    const isSelected = moveOutDate?.toDateString() === d.toDateString();
                    return (
                      <TouchableOpacity key={d.toISOString()} style={[styles.dateOption, isSelected && styles.dateOptionActive]}
                        onPress={() => { setMoveOutDate(d); setShowMoveOutPicker(false); Haptics.selectionAsync(); }}>
                        <Text style={[styles.dateOptionMonth, isSelected && { color: Colors.white }]}>
                          {d.toLocaleDateString("en-US", { month: "short" })}
                        </Text>
                        <Text style={[styles.dateOptionDay, isSelected && { color: Colors.white }]}>
                          {d.getDate()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
              <Text style={styles.fieldHint}>Date for key return</Text>
            </View>
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 12 }]}>
        {step < TOTAL_STEPS - 1 ? (
          <TouchableOpacity
            style={[styles.nextBtn, !stepValid(step) && { opacity: 0.5 }]}
            onPress={goNext}
            disabled={!stepValid(step)}
          >
            <Text style={styles.nextBtnText}>Next</Text>
            <Ionicons name="arrow-forward" size={18} color={Colors.white} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.submitBtn, !canSubmit && { opacity: 0.5 }]}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            <Ionicons name="checkmark" size={20} color={Colors.white} />
            <Text style={styles.submitBtnText}>{isHostMode ? "Post Apartment" : "Post Sublease"}</Text>
          </TouchableOpacity>
        )}
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
  headerCenter: { flex: 1, marginLeft: 12 },
  headerTitle: { fontFamily: "Nunito_700Bold", fontSize: 17, color: Colors.ocean },
  headerSub: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted },
  stepDots: { flexDirection: "row", gap: 5 },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.borderSoft },
  stepDotActive: { backgroundColor: Colors.ocean },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },
  sectionTitle: { fontFamily: "Nunito_800ExtraBold", fontSize: 22, color: Colors.ocean },
  sectionSub: { fontFamily: "Nunito_400Regular", fontSize: 13, color: Colors.textMuted, marginTop: -8 },
  field: { gap: 8 },
  label: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.charcoal },
  fieldHint: { fontFamily: "Nunito_400Regular", fontSize: 11, color: Colors.textLight },
  input: {
    backgroundColor: Colors.cardBg, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.borderSoft,
    paddingHorizontal: 14, paddingVertical: 12, fontFamily: "Nunito_400Regular",
    fontSize: 15, color: Colors.charcoal,
  },
  textArea: { height: 90, paddingTop: 12 },
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
    flexDirection: "row", alignItems: "center", gap: 5,
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
  photoGrid: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  photoSlot: {
    width: "31%", aspectRatio: 3 / 4, borderRadius: 14, overflow: "hidden",
    backgroundColor: Colors.cardBg, borderWidth: 1.5, borderColor: Colors.borderSoft,
  },
  photoEmpty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6 },
  photoLabel: { fontFamily: "Nunito_600SemiBold", fontSize: 11, color: Colors.textLight, textAlign: "center" },
  photoImage: { width: "100%", height: "100%", resizeMode: "cover" },
  photoLabelOverlay: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "rgba(0,0,0,0.55)", paddingVertical: 4, alignItems: "center",
  },
  photoLabelOverlayText: { fontFamily: "Nunito_700Bold", fontSize: 10, color: Colors.white },
  photoHint: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textLight, marginTop: 4 },
  floorPlanSlot: {
    width: "100%", aspectRatio: 16 / 9, borderRadius: 14, overflow: "hidden",
    backgroundColor: Colors.cardBg, borderWidth: 1.5, borderColor: Colors.borderSoft,
    borderStyle: "dashed" as const,
  },
  floorPlanEmpty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6 },
  floorPlanImage: { width: "100%", height: "100%", resizeMode: "cover" as const },
  amenitySection: { gap: 8, marginBottom: 8 },
  amenitySectionTitle: {
    fontFamily: "Nunito_700Bold", fontSize: 13, color: Colors.textMuted,
    textTransform: "uppercase", letterSpacing: 0.8,
  },
  amenityGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  amenityToggle: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12,
    backgroundColor: Colors.cardBg, borderWidth: 1.5, borderColor: Colors.borderSoft,
  },
  amenityToggleActive: { backgroundColor: Colors.ocean, borderColor: Colors.ocean },
  amenityToggleText: { fontFamily: "Nunito_600SemiBold", fontSize: 12, color: Colors.textMuted },
  amenityToggleTextActive: { color: Colors.white },
  datePickerBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: Colors.cardBg, borderRadius: 12, borderWidth: 1.5,
    borderColor: Colors.borderSoft, paddingHorizontal: 14, paddingVertical: 13,
  },
  datePickerText: {
    flex: 1, fontFamily: "Nunito_600SemiBold", fontSize: 15, color: Colors.ocean,
  },
  dateGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4,
    backgroundColor: Colors.cardBg, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: Colors.borderSoft,
  },
  dateOption: {
    width: 52, height: 52, borderRadius: 12, alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.sand, borderWidth: 1, borderColor: Colors.borderSoft,
  },
  dateOptionActive: { backgroundColor: Colors.ocean, borderColor: Colors.ocean },
  dateOptionMonth: { fontFamily: "Nunito_600SemiBold", fontSize: 10, color: Colors.textMuted },
  dateOptionDay: { fontFamily: "Nunito_800ExtraBold", fontSize: 16, color: Colors.charcoal },
  footer: {
    paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: Colors.sand, borderTopWidth: 1, borderTopColor: Colors.borderSoft,
  },
  nextBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.ocean, borderRadius: 14, paddingVertical: 14,
  },
  nextBtnText: { fontFamily: "Nunito_800ExtraBold", fontSize: 16, color: Colors.white },
  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.orange, borderRadius: 14, paddingVertical: 14,
  },
  submitBtnText: { fontFamily: "Nunito_800ExtraBold", fontSize: 16, color: Colors.white },
});
