import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, Animated, Easing
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useApp, UserProfile, LeaseType, GenderPref, Zone, Landlord } from "@/context/AppContext";

const MAJORS = [
  "Computer Science", "Engineering", "Business", "Biology", "Psychology",
  "Finance", "Architecture", "Journalism", "Statistics", "Mathematics",
  "Physics", "Chemistry", "Economics", "Political Science", "Art & Design",
  "Pre-Medicine", "Education", "Communications", "Sociology", "Other"
];

const ZONES: { key: Zone; label: string; icon: keyof typeof Ionicons.glyphMap; desc: string }[] = [
  { key: "campustown", label: "Campustown", icon: "storefront-outline", desc: "Green St buzz & Main Quad" },
  { key: "north", label: "North Campus", icon: "hardware-chip-outline", desc: "Engineering & STEM hub" },
  { key: "south", label: "South Campus", icon: "football-outline", desc: "Ikenberry, ARC, Stadium" },
  { key: "urbana", label: "Urbana", icon: "leaf-outline", desc: "Quiet, trees, budget-friendly" },
  { key: "downtown", label: "Downtown Champaign", icon: "business-outline", desc: "Professional & dining scene" },
];

const LANDLORDS: { key: Landlord; label: string; color: string }[] = [
  { key: "jsm", label: "JSM", color: Colors.landlords.jsm },
  { key: "ugroup", label: "UGroup", color: Colors.landlords.ugroup },
  { key: "bailey", label: "Bailey", color: Colors.landlords.bailey },
  { key: "american", label: "American Campus", color: Colors.landlords.american },
  { key: "smile", label: "Smile", color: Colors.landlords.smile },
  { key: "other", label: "Private / Other", color: Colors.landlords.other },
];

function RatingSelector({ value, onChange, color }: { value: number; onChange: (v: number) => void; color: string }) {
  return (
    <View style={styles.ratingRow}>
      {[1, 2, 3, 4, 5].map(n => (
        <TouchableOpacity key={n} onPress={() => { Haptics.selectionAsync(); onChange(n); }}
          style={[styles.ratingDot, { backgroundColor: n <= value ? color : Colors.foamDark }]}>
          <Text style={[styles.ratingNum, { color: n <= value ? Colors.white : Colors.textMuted }]}>{n}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const WAVE_COUNT = 22;

function PonyoProgress({ step, total }: { step: number; total: number }) {
  const progress = step / (total - 1);
  const fishX = useRef(new Animated.Value(0)).current;
  const bobY = useRef(new Animated.Value(0)).current;
  const [trackWidth, setTrackWidth] = useState(260);

  const FISH_SIZE = 28;
  const BUCKET_SIZE = 28;

  useEffect(() => {
    Animated.spring(fishX, {
      toValue: progress,
      tension: 55,
      friction: 10,
      useNativeDriver: false,
    }).start();
  }, [step]);

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(bobY, {
          toValue: -4, duration: 850,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bobY, {
          toValue: 4, duration: 850,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const fishTranslateX = fishX.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.max(0, trackWidth - BUCKET_SIZE - FISH_SIZE - 4)],
  });

  const atHome = step === total - 1;

  return (
    <View style={pStyles.wrapper}>
      <View
        style={pStyles.trackContainer}
        onLayout={e => setTrackWidth(e.nativeEvent.layout.width)}>

        <View style={pStyles.waveRow}>
          {Array.from({ length: WAVE_COUNT }, (_, i) => (
            <View
              key={i}
              style={[
                pStyles.waveBump,
                { marginTop: i % 2 === 0 ? 0 : 6 }
              ]}
            />
          ))}
        </View>

        <Animated.View
          style={[
            pStyles.fishWrap,
            { transform: [{ translateX: fishTranslateX }, { translateY: bobY }] }
          ]}
        >
          <Ionicons
            name="fish"
            size={FISH_SIZE}
            color={Colors.ponyo}
            style={{ transform: [{ scaleX: -1 }] }}
          />
        </Animated.View>
      </View>

      <View style={[pStyles.bucket, { opacity: atHome ? 1 : 0.32 }]}>
        <View style={[pStyles.bucketInner, { backgroundColor: atHome ? Colors.ponyo + "22" : Colors.teal + "14" }]}>
          <Ionicons name="home" size={18} color={atHome ? Colors.ponyo : Colors.teal} />
        </View>
      </View>
    </View>
  );
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { setCurrentUser, setIsOnboarded } = useApp();
  const [step, setStep] = useState(0);

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [name, setName] = useState("");
  const [major, setMajor] = useState("");
  const [bio, setBio] = useState("");
  const [budget, setBudget] = useState(800);
  const [gender, setGender] = useState<"female" | "male" | "nonbinary">("female");
  const [genderPref, setGenderPref] = useState<GenderPref>("mixed");
  const [cleanliness, setCleanliness] = useState(3);
  const [noise, setNoise] = useState(3);
  const [leaseType, setLeaseType] = useState<LeaseType>("full_year");
  const [zone, setZone] = useState<Zone>("campustown");
  const [landlord, setLandlord] = useState<Landlord>("other");
  const [staysThanksgiving, setStaysThanksgiving] = useState(false);
  const [staysSpringBreak, setStaysSpringBreak] = useState(false);
  const [showMajorPicker, setShowMajorPicker] = useState(false);

  const STEPS = 5;

  const validateEmail = () => {
    if (!name.trim()) { setEmailError("Please enter your name."); return false; }
    if (!email.endsWith("@illinois.edu")) { setEmailError("Only @illinois.edu emails are allowed."); return false; }
    setEmailError("");
    return true;
  };

  const handleNext = () => {
    if (step === 0 && !validateEmail()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(s => Math.min(s + 1, STEPS - 1));
  };

  const handleFinish = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const avatarColors = [Colors.tealLight, Colors.ponyo, Colors.grassGreen, "#9B59B6", Colors.yellowDark, Colors.teal];
    const avatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];
    const user: UserProfile = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
      name: name.trim(), email: email.toLowerCase().trim(),
      major: major || "Undeclared", bio: bio.trim(), budget, gender, genderPref,
      cleanliness, noise, leaseType, zone, landlord,
      staysThanksgiving, staysSpringBreak, avatarColor,
    };
    await setCurrentUser(user);
    await setIsOnboarded(true);
    router.replace("/(tabs)");
  };

  const budgetStep = (dir: number) => {
    Haptics.selectionAsync();
    setBudget(b => Math.min(2000, Math.max(400, b + dir * 50)));
  };

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: Colors.foam }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>

      <View style={[styles.header, { paddingTop: topPadding + 20 }]}>
        <PonyoProgress step={step} total={STEPS} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {step === 0 && (
          <View style={styles.stepContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="school" size={38} color={Colors.teal} />
            </View>
            <Text style={styles.stepTitle}>Welcome to PopMatch</Text>
            <Text style={styles.stepSubtitle}>UIUC's student-first housing matchmaker</Text>

            <Text style={styles.label}>Your Name</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName}
              placeholder="Full name" placeholderTextColor={Colors.textLight}
              autoCapitalize="words" returnKeyType="next" />

            <Text style={styles.label}>Illinois Email</Text>
            <TextInput style={[styles.input, emailError ? styles.inputError : null]}
              value={email} onChangeText={t => { setEmail(t); setEmailError(""); }}
              placeholder="yournetid@illinois.edu" placeholderTextColor={Colors.textLight}
              keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
            {emailError ? (
              <View style={styles.errorRow}>
                <Ionicons name="warning-outline" size={13} color={Colors.errorRed} />
                <Text style={styles.errorText}>{emailError}</Text>
              </View>
            ) : null}

            <View style={styles.gateBox}>
              <Ionicons name="shield-checkmark-outline" size={15} color={Colors.grassGreen} />
              <Text style={styles.gateText}>Only @illinois.edu addresses accepted — no exceptions</Text>
            </View>
          </View>
        )}

        {step === 1 && (
          <View style={styles.stepContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="person" size={38} color={Colors.teal} />
            </View>
            <Text style={styles.stepTitle}>About You</Text>
            <Text style={styles.stepSubtitle}>Help future roommates get to know you</Text>

            <Text style={styles.label}>Major</Text>
            <TouchableOpacity style={styles.input} onPress={() => setShowMajorPicker(!showMajorPicker)}>
              <Text style={[styles.selectText, { color: major ? Colors.charcoal : Colors.textLight }]}>
                {major || "Select your major"}
              </Text>
              <Ionicons name={showMajorPicker ? "chevron-up" : "chevron-down"} size={15} color={Colors.textMuted} />
            </TouchableOpacity>
            {showMajorPicker && (
              <View style={styles.majorList}>
                {MAJORS.map(m => (
                  <TouchableOpacity key={m} style={[styles.majorItem, major === m && styles.majorSelected]}
                    onPress={() => { setMajor(m); setShowMajorPicker(false); Haptics.selectionAsync(); }}>
                    <Text style={[styles.majorText, major === m && styles.majorTextSelected]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.label}>Short Bio</Text>
            <TextInput style={[styles.input, styles.textArea]} value={bio} onChangeText={setBio}
              placeholder="Tell future roommates about yourself..."
              placeholderTextColor={Colors.textLight} multiline numberOfLines={3} textAlignVertical="top" />

            <Text style={styles.label}>I identify as</Text>
            <View style={styles.chipRow}>
              {(["female", "male", "nonbinary"] as const).map(g => (
                <TouchableOpacity key={g} style={[styles.chip, gender === g && styles.chipActive]}
                  onPress={() => { setGender(g); Haptics.selectionAsync(); }}>
                  <Text style={[styles.chipText, gender === g && styles.chipTextActive]}>
                    {g === "female" ? "Woman" : g === "male" ? "Man" : "Non-binary"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="home" size={38} color={Colors.teal} />
            </View>
            <Text style={styles.stepTitle}>Housing Preferences</Text>
            <Text style={styles.stepSubtitle}>What kind of living situation do you want?</Text>

            <Text style={styles.label}>Monthly Budget</Text>
            <View style={styles.budgetRow}>
              <TouchableOpacity style={styles.budgetBtn} onPress={() => budgetStep(-1)}>
                <Ionicons name="remove" size={22} color={Colors.charcoal} />
              </TouchableOpacity>
              <View style={styles.budgetDisplay}>
                <Text style={styles.budgetValue}>${budget}</Text>
                <Text style={styles.budgetSub}>per month</Text>
              </View>
              <TouchableOpacity style={styles.budgetBtn} onPress={() => budgetStep(1)}>
                <Ionicons name="add" size={22} color={Colors.charcoal} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Roommate Gender Preference</Text>
            <View style={styles.chipRow}>
              {([
                { k: "girls_only" as GenderPref, l: "Girls Only" },
                { k: "boys_only" as GenderPref, l: "Boys Only" },
                { k: "mixed" as GenderPref, l: "No Preference" }
              ]).map(({ k, l }) => (
                <TouchableOpacity key={k} style={[styles.chip, genderPref === k && styles.chipActive]}
                  onPress={() => { setGenderPref(k); Haptics.selectionAsync(); }}>
                  <Text style={[styles.chipText, genderPref === k && styles.chipTextActive]}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Lease Type</Text>
            {([
              { k: "full_year" as LeaseType, l: "Full Year", d: "Aug – Jul (12 months)" },
              { k: "fall_sublease" as LeaseType, l: "Fall Sublease", d: "Aug – Dec" },
              { k: "spring_sublease" as LeaseType, l: "Spring Sublease", d: "Jan – May" },
              { k: "summer_sublease" as LeaseType, l: "Summer Sublease", d: "May – Aug" },
            ]).map(({ k, l, d }) => (
              <TouchableOpacity key={k} style={[styles.optionCard, leaseType === k && styles.optionCardActive]}
                onPress={() => { setLeaseType(k); Haptics.selectionAsync(); }}>
                <View style={styles.optionLeft}>
                  <Text style={[styles.optionLabel, leaseType === k && styles.optionLabelActive]}>{l}</Text>
                  <Text style={styles.optionDesc}>{d}</Text>
                </View>
                {leaseType === k && <Ionicons name="checkmark-circle" size={18} color={Colors.teal} />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="map" size={38} color={Colors.teal} />
            </View>
            <Text style={styles.stepTitle}>Location & Lifestyle</Text>
            <Text style={styles.stepSubtitle}>Where in Champaign-Urbana do you want to live?</Text>

            {ZONES.map(z => (
              <TouchableOpacity key={z.key} style={[styles.optionCard, zone === z.key && styles.optionCardActive]}
                onPress={() => { setZone(z.key); Haptics.selectionAsync(); }}>
                <View style={[styles.zoneIcon, { backgroundColor: Colors.zones[z.key] + "22" }]}>
                  <Ionicons name={z.icon} size={18} color={Colors.charcoal} />
                </View>
                <View style={styles.optionLeft}>
                  <Text style={[styles.optionLabel, zone === z.key && styles.optionLabelActive]}>{z.label}</Text>
                  <Text style={styles.optionDesc}>{z.desc}</Text>
                </View>
                {zone === z.key && <Ionicons name="checkmark-circle" size={18} color={Colors.teal} />}
              </TouchableOpacity>
            ))}

            <Text style={styles.label}>Cleanliness Level</Text>
            <View style={styles.scaleLabels}>
              <Text style={styles.scaleLabel}>Relaxed</Text>
              <Text style={styles.scaleLabel}>Spotless</Text>
            </View>
            <RatingSelector value={cleanliness} onChange={setCleanliness} color={Colors.grassGreen} />

            <Text style={styles.label}>Noise & Social Level</Text>
            <View style={styles.scaleLabels}>
              <Text style={styles.scaleLabel}>Very Quiet</Text>
              <Text style={styles.scaleLabel}>Party Mode</Text>
            </View>
            <RatingSelector value={noise} onChange={setNoise} color={Colors.teal} />
          </View>
        )}

        {step === 4 && (
          <View style={styles.stepContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="calendar" size={38} color={Colors.teal} />
            </View>
            <Text style={styles.stepTitle}>Breaks & Landlord</Text>
            <Text style={styles.stepSubtitle}>Helps split utilities & coordinate with roommates</Text>

            <Text style={styles.label}>Break Plans</Text>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleTitle}>Staying Thanksgiving Break?</Text>
                <Text style={styles.toggleDesc}>Nov 27 – Dec 1</Text>
              </View>
              <TouchableOpacity style={[styles.toggle, staysThanksgiving && styles.toggleOn]}
                onPress={() => { setStaysThanksgiving(!staysThanksgiving); Haptics.selectionAsync(); }}>
                <Text style={[styles.toggleText, staysThanksgiving && styles.toggleTextOn]}>
                  {staysThanksgiving ? "Yes" : "No"}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleTitle}>Staying Spring Break?</Text>
                <Text style={styles.toggleDesc}>Mar 15 – 23</Text>
              </View>
              <TouchableOpacity style={[styles.toggle, staysSpringBreak && styles.toggleOn]}
                onPress={() => { setStaysSpringBreak(!staysSpringBreak); Haptics.selectionAsync(); }}>
                <Text style={[styles.toggleText, staysSpringBreak && styles.toggleTextOn]}>
                  {staysSpringBreak ? "Yes" : "No"}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Your Landlord</Text>
            {LANDLORDS.map(l => (
              <TouchableOpacity key={l.key} style={[styles.optionCard, landlord === l.key && styles.optionCardActive]}
                onPress={() => { setLandlord(l.key); Haptics.selectionAsync(); }}>
                <View style={[styles.landlordDot, { backgroundColor: l.color }]} />
                <Text style={[styles.optionLabel, landlord === l.key && styles.optionLabelActive]}>{l.label}</Text>
                {landlord === l.key && <Ionicons name="checkmark-circle" size={18} color={Colors.teal} />}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 12 }]}>
        {step > 0 && (
          <TouchableOpacity style={styles.backBtn} onPress={() => { setStep(s => s - 1); Haptics.selectionAsync(); }}>
            <Ionicons name="arrow-back" size={20} color={Colors.charcoal} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextBtn, step === 0 && { flex: 1 }]}
          onPress={step === STEPS - 1 ? handleFinish : handleNext}>
          <Text style={styles.nextBtnText}>{step === STEPS - 1 ? "Find My Match" : "Continue"}</Text>
          <Ionicons name={step === STEPS - 1 ? "heart" : "arrow-forward"} size={17} color={Colors.white} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const pStyles = StyleSheet.create({
  wrapper: {
    flexDirection: "row", alignItems: "center", gap: 8, paddingBottom: 4,
  },
  trackContainer: {
    flex: 1, height: 48, position: "relative", justifyContent: "center",
  },
  waveRow: {
    flexDirection: "row", alignItems: "center", gap: 4,
    position: "absolute", bottom: 8, left: 0, right: 0,
  },
  waveBump: {
    width: 9, height: 5,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: Colors.tealLight + "55",
    backgroundColor: "transparent",
  },
  fishWrap: {
    position: "absolute", bottom: 12,
  },
  bucket: {
    alignItems: "center", justifyContent: "center",
  },
  bucketInner: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.foam },
  header: { paddingHorizontal: 20, paddingBottom: 4 },
  scroll: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 8 },
  stepContainer: { gap: 12 },
  iconCircle: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: Colors.teal + "15",
    alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 4,
    borderWidth: 2, borderColor: Colors.teal + "28",
  },
  stepTitle: {
    fontFamily: "Nunito_800ExtraBold", fontSize: 27, color: Colors.teal,
    textAlign: "center", lineHeight: 34,
  },
  stepSubtitle: {
    fontFamily: "Nunito_400Regular", fontSize: 15, color: Colors.textMuted,
    textAlign: "center", marginBottom: 6,
  },
  label: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.charcoal, marginTop: 6 },
  input: {
    backgroundColor: Colors.white, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.borderSoft,
    paddingHorizontal: 14, paddingVertical: 13, fontFamily: "Nunito_400Regular",
    fontSize: 15, color: Colors.charcoal, flexDirection: "row",
    alignItems: "center", justifyContent: "space-between",
  },
  inputError: { borderColor: Colors.errorRed },
  textArea: { height: 90, paddingTop: 13 },
  selectText: { fontFamily: "Nunito_400Regular", fontSize: 15 },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  errorText: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.errorRed },
  gateBox: {
    flexDirection: "row", alignItems: "center", gap: 7,
    backgroundColor: Colors.grassGreen + "18", borderRadius: 12, padding: 11,
  },
  gateText: { fontFamily: "Nunito_600SemiBold", fontSize: 12, color: Colors.grassGreen, flex: 1 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 22,
    backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.borderSoft,
  },
  chipActive: { backgroundColor: Colors.teal, borderColor: Colors.teal },
  chipText: { fontFamily: "Nunito_600SemiBold", fontSize: 13, color: Colors.textMuted },
  chipTextActive: { color: Colors.white },
  budgetRow: { flexDirection: "row", alignItems: "center", gap: 16, justifyContent: "center", marginVertical: 4 },
  budgetBtn: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.white,
    borderWidth: 1.5, borderColor: Colors.borderSoft, alignItems: "center", justifyContent: "center",
  },
  budgetDisplay: { alignItems: "center", minWidth: 110 },
  budgetValue: { fontFamily: "Nunito_800ExtraBold", fontSize: 36, color: Colors.teal },
  budgetSub: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted },
  optionCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.white, borderRadius: 14, borderWidth: 1.5,
    borderColor: Colors.borderSoft, padding: 13,
  },
  optionCardActive: { borderColor: Colors.teal, backgroundColor: Colors.teal + "0E" },
  optionLeft: { flex: 1 },
  optionLabel: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.charcoal },
  optionLabelActive: { color: Colors.teal },
  optionDesc: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  zoneIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  ratingRow: { flexDirection: "row", gap: 10, justifyContent: "center", marginVertical: 6 },
  ratingDot: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  ratingNum: { fontFamily: "Nunito_800ExtraBold", fontSize: 17 },
  scaleLabels: { flexDirection: "row", justifyContent: "space-between" },
  scaleLabel: { fontFamily: "Nunito_400Regular", fontSize: 11, color: Colors.textLight },
  toggleRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: Colors.white, borderRadius: 14, borderWidth: 1.5,
    borderColor: Colors.borderSoft, padding: 14,
  },
  toggleInfo: { flex: 1 },
  toggleTitle: { fontFamily: "Nunito_700Bold", fontSize: 14, color: Colors.charcoal },
  toggleDesc: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted },
  toggle: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16,
    backgroundColor: Colors.foamDark, borderWidth: 1.5, borderColor: Colors.borderSoft,
  },
  toggleOn: { backgroundColor: Colors.grassGreen, borderColor: Colors.grassGreen },
  toggleText: { fontFamily: "Nunito_700Bold", fontSize: 13, color: Colors.textMuted },
  toggleTextOn: { color: Colors.white },
  landlordDot: { width: 12, height: 12, borderRadius: 6 },
  majorList: {
    backgroundColor: Colors.white, borderRadius: 12, borderWidth: 1.5,
    borderColor: Colors.borderSoft, overflow: "hidden",
  },
  majorItem: {
    paddingHorizontal: 14, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: Colors.foamDark,
  },
  majorSelected: { backgroundColor: Colors.teal + "14" },
  majorText: { fontFamily: "Nunito_400Regular", fontSize: 14, color: Colors.charcoal },
  majorTextSelected: { fontFamily: "Nunito_700Bold", color: Colors.teal },
  footer: {
    flexDirection: "row", gap: 12, paddingHorizontal: 24, paddingTop: 12,
    backgroundColor: Colors.foam, borderTopWidth: 1, borderTopColor: Colors.borderSoft,
  },
  backBtn: {
    width: 50, height: 54, borderRadius: 15, backgroundColor: Colors.white,
    borderWidth: 1.5, borderColor: Colors.borderSoft, alignItems: "center", justifyContent: "center",
  },
  nextBtn: {
    flex: 1, height: 54, borderRadius: 15, backgroundColor: Colors.ponyo,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  nextBtnText: { fontFamily: "Nunito_800ExtraBold", fontSize: 16, color: Colors.white },
});
