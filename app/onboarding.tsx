import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  ActivityIndicator,
  Dimensions,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import Colors from "@/constants/colors";
import {
  useApp,
  UserProfile,
  LeaseType,
  GenderPref,
  Zone,
  Landlord,
  Intent,
} from "@/context/AppContext";
import {
  displayNameOf,
  isUiucEmail,
  onAuthStateChange,
  sendUiucOtp,
  signInWithAzure,
  verifyUiucOtp,
} from "@/lib/auth";
import { uploadProfileImage } from "@/lib/uploads";

const MAJORS = [
  "Accountancy", "Aerospace Engineering", "Agricultural & Biological Engineering",
  "Animal Sciences", "Architecture", "Astronomy", "Biochemistry", "Biology",
  "Bioengineering", "Business (Undeclared)", "Chemical Engineering",
  "Chemistry", "Civil Engineering", "Communications", "Computer Engineering",
  "Computer Science", "Computer Science + X", "Crop Sciences",
  "Economics", "Education", "Electrical Engineering",
  "Finance", "Food Science", "Graphic Design",
  "History", "Industrial Engineering", "Information Sciences",
  "Integrative Biology", "Journalism", "Kinesiology",
  "Landscape Architecture", "Linguistics", "Materials Science & Engineering",
  "Mathematics", "Mechanical Engineering", "Molecular & Cellular Biology",
  "Music", "Nuclear Engineering", "Nursing",
  "Philosophy", "Physics", "Political Science",
  "Pre-Medicine", "Psychology", "Social Work",
  "Sociology", "Statistics", "Supply Chain Management",
  "Theatre", "Urban Planning", "Other",
];

const WAVE_COUNT = 22;

function PonyoProgress({ step, total }: { step: number; total: number }) {
  const progress = step / Math.max(1, total - 1);
  const fishPx = useRef(new Animated.Value(0)).current;
  const bobY = useRef(new Animated.Value(0)).current;
  const [trackWidth, setTrackWidth] = useState(260);

  const FISH_SIZE = 28;

  useEffect(() => {
    const target = progress * Math.max(0, trackWidth - FISH_SIZE);
    Animated.spring(fishPx, {
      toValue: target,
      tension: 55,
      friction: 10,
      useNativeDriver: false,
    }).start();
  }, [progress, trackWidth, fishPx]);

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(bobY, {
          toValue: -4,
          duration: 850,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(bobY, {
          toValue: 4,
          duration: 850,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [bobY]);

  const atHome = step === total - 1;

  return (
    <View style={pStyles.wrapper}>
      <View
        style={pStyles.trackContainer}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      >
        <View style={pStyles.waveRow}>
          {Array.from({ length: WAVE_COUNT }, (_, i) => (
            <View key={i} style={[pStyles.waveBump, { marginTop: i % 2 === 0 ? 0 : 6 }]} />
          ))}
        </View>

        <Animated.View style={[pStyles.fishWrap, { transform: [{ translateX: fishPx }] }]}>
          <Animated.View style={{ transform: [{ translateY: bobY }] }}>
            <Ionicons
              name="fish"
              size={FISH_SIZE}
              color={Colors.ponyo}
              style={{ transform: [{ scaleX: -1 }] }}
            />
          </Animated.View>
        </Animated.View>
      </View>

      <View style={[pStyles.bucket, { opacity: atHome ? 1 : 0.32 }]}>
        <View
          style={[
            pStyles.bucketInner,
            { backgroundColor: atHome ? Colors.ponyo + "22" : Colors.teal + "14" },
          ]}
        >
          <Ionicons name="home" size={18} color={atHome ? Colors.ponyo : Colors.teal} />
        </View>
      </View>
    </View>
  );
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { setCurrentUser, setIsOnboarded, setOtpVerifiedEmail, isOnboarded } = useApp();
  // Read at sign-in time, not as an effect dependency: finishing onboarding
  // flips it to true, and that must not re-run the redirect below.
  const alreadyOnboarded = useRef(isOnboarded);
  alreadyOnboarded.current = isOnboarded;

  const [step, setStep] = useState(0);

  const [email, setEmail] = useState("");
  const [popupLoading, setPopupLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [showEmailFallback, setShowEmailFallback] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [name, setName] = useState("");
  const [major, setMajor] = useState("");
  const [showMajorPicker, setShowMajorPicker] = useState(false);
  const [intent, setIntent] = useState<Intent>("joiner");
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // Everything onboarding no longer asks for. These seed the profile and are
  // all editable from the Profile tab, so nothing is lost by defaulting them.
  const bio = "";
  const budget = 800;
  const gender: "female" | "male" | "nonbinary" = "nonbinary";
  const genderPref: GenderPref = "mixed";
  const cleanliness = 3;
  const noise = 3;
  const leaseType: LeaseType = "full_year";
  const zone: Zone = "campustown";
  const landlords: Landlord[] = [];
  const staysThanksgiving = false;
  const staysSpringBreak = false;

  useEffect(() => {
    const unsubscribe = onAuthStateChange((sessionUser) => {
      if (!sessionUser) return;

      // Signing back in after a session ended: the profile is already saved.
      if (alreadyOnboarded.current) {
        router.replace("/(tabs)");
        return;
      }

      if (sessionUser.email) {
        setEmail((prev) => prev || sessionUser.email || "");
        setOtpVerifiedEmail(sessionUser.email);
      }

      const providerName = displayNameOf(sessionUser);
      if (providerName) {
        setName((prev) => prev || providerName);
      }

      setStep((prev) => (prev === 0 ? 1 : prev));
    });

    return unsubscribe;
  }, [setOtpVerifiedEmail]);

  async function handleSendCode() {
    setAuthError(null);

    if (!isUiucEmail(email)) {
      setAuthError("Please use your @illinois.edu email address.");
      return;
    }

    setOtpLoading(true);

    try {
      await sendUiucOtp(email);
      setOtpSent(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      setAuthError(error?.message || "Could not send the code. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  }

  async function handleVerifyCode() {
    setAuthError(null);

    if (otpCode.trim().length < 6) {
      setAuthError("Enter the 6-digit code from your email.");
      return;
    }

    setOtpLoading(true);

    try {
      // onAuthStateChange advances the step once the session lands.
      await verifyUiucOtp(email, otpCode);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setAuthError("That code didn't work. Check it or request a new one.");
    } finally {
      setOtpLoading(false);
    }
  }

  async function signInWithUIUC() {
    setAuthError(null);
    setPopupLoading(true);

    try {
      await signInWithAzure();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      setAuthError(error?.message || "UIUC sign-in failed. Please try again.");
    } finally {
      setPopupLoading(false);
    }
  }

  const isSupplySide = intent === "host" || intent === "sublessor";

  // Sign in -> pick a role -> name and photo. Budget, neighborhood, lease
  // type, cleanliness and landlord all default below and are editable from
  // the Profile tab; asking for them up front lost people before they ever
  // saw the app.
  const STEPS = 3;

  const pickProfileImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setProfileImage(result.assets[0].uri);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const DISABLED_BG = "#E0E8E9";
  const DISABLED_TEXT = "#8A9FA3";

  const isStepComplete = (s: number): boolean => {
    switch (s) {
      case 1:
        return !!intent;
      case 2:
        // Name only. A photo helps but shouldn't block anyone at the door.
        return name.trim().length > 0;
      default:
        return true;
    }
  };

  const isFormComplete = isStepComplete(step);

  const handleNext = () => {
    if (!isFormComplete) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setStep((s) => Math.min(s + 1, STEPS - 1));
  };

  const handleFinish = async () => {
    if (savingProfile) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSavingProfile(true);

    const avatarColors = [
      Colors.tealLight,
      Colors.ponyo,
      Colors.grassGreen,
      "#9B59B6",
      Colors.yellowDark,
      Colors.teal,
    ];
    const avatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

    const userId = Date.now().toString() + Math.random().toString(36).substr(2, 6);

    // Push the picked avatar to Supabase Storage so it resolves on every
    // device, not just the one that picked it. A failed upload shouldn't
    // block onboarding — fall back to the local URI.
    let avatarUrl = profileImage;
    if (profileImage) {
      try {
        avatarUrl = await uploadProfileImage(profileImage);
      } catch (error) {
        console.error("Avatar upload failed, keeping local copy:", error);
      }
    }

    const user: UserProfile = {
      id: userId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      major: major || "Undeclared",
      bio: bio.trim(),
      budget: isSupplySide ? 0 : budget,
      gender,
      genderPref: isSupplySide ? "mixed" : genderPref,
      cleanliness: isSupplySide ? 3 : cleanliness,
      noise: isSupplySide ? 3 : noise,
      leaseType: isSupplySide ? "full_year" : leaseType,
      zone: isSupplySide ? "campustown" : zone,
      landlords: isSupplySide ? [] : landlords,
      staysThanksgiving: isSupplySide ? false : staysThanksgiving,
      staysSpringBreak: isSupplySide ? false : staysSpringBreak,
      avatarColor,
      intent,
      ...(avatarUrl ? { profileImage: avatarUrl } : {}),
    };

    // Saves to the users table (and caches on the device). If the API is
    // unreachable the profile stays cached, flagged unsynced, and is retried
    // on next launch — onboarding carries on either way.
    const saved = await setCurrentUser(user);
    if (!saved) {
      console.warn("Profile not saved to the server yet; continuing with the cached copy.");
    }
    await setIsOnboarded(true);
    setSavingProfile(false);

    switch (intent) {
      case "host":
        router.replace("/post-sublease?mode=host&gateway=1");
        break;
      case "joiner":
        router.replace("/marketplace?category=roommate_openings");
        break;
      case "co_seeker":
        router.replace("/compatibility-setup");
        break;
      case "sublessor":
        router.replace("/post-sublease?mode=sublessor&gateway=1");
        break;
      case "sublessee": {
        const sublesseeRoutes: Record<string, string> = {
          spring_sublease: "/marketplace?category=semester_takeover&subFilter=Spring (Dec/Jan – May)",
          fall_sublease: "/marketplace?category=semester_takeover&subFilter=Fall (Aug – Dec)",
          full_year: "/marketplace?category=semester_takeover&subFilter=Full Year (Aug – Jul)",
          summer_sublease: "/marketplace?category=summer_only",
        };
        router.replace((sublesseeRoutes[leaseType] || "/marketplace?category=short_term") as any);
        break;
      }
      default:
        router.replace("/(tabs)");
        break;
    }
  };

  const onbWidth = Dimensions.get("window").width;
  const isDesktopOnb = Platform.OS === "web" && onbWidth >= 1024;
  const topPadding = Platform.OS === "web" ? (isDesktopOnb ? 24 : 67) : insets.top;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: Colors.foam }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { paddingTop: topPadding + 20 }]}>
        <PonyoProgress step={step} total={STEPS} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === 0 && (
          <View style={styles.stepContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="school" size={38} color={Colors.teal} />
            </View>

            <Text style={styles.stepTitle}>Welcome to PopMatch</Text>
            <Text style={styles.stepSubtitle}>
              {otpSent
                ? `We sent a 6-digit code to ${email}`
                : "Sign in with your UIUC account to start PopMatch"}
            </Text>

            {!otpSent && (
              <>
                {/* Primary path: UIUC Microsoft sign-in. No codes, no email
                    limits, and it proves the account is a real UIUC one. */}
                <TouchableOpacity
                  style={[styles.otpSendBtn, popupLoading && { opacity: 0.7 }]}
                  onPress={signInWithUIUC}
                  disabled={popupLoading || otpLoading}
                >
                  {popupLoading ? (
                    <ActivityIndicator color={Colors.white} size="small" />
                  ) : (
                    <>
                      <Ionicons name="school-outline" size={16} color={Colors.white} />
                      <Text style={styles.otpSendBtnText}>Continue with UIUC</Text>
                    </>
                  )}
                </TouchableOpacity>

                <Text style={[styles.fieldHint, { textAlign: "center" }]}>
                  Uses your university Microsoft login
                </Text>
              </>
            )}

            {!otpSent && !showEmailFallback && (
              <TouchableOpacity
                onPress={() => {
                  setShowEmailFallback(true);
                  setAuthError(null);
                }}
                disabled={popupLoading}
              >
                <Text style={styles.linkText}>Sign in with an email code instead</Text>
              </TouchableOpacity>
            )}

            {!otpSent && showEmailFallback && (
              <>
                <Text style={styles.dividerText}>or use an email code</Text>

                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={(next) => {
                    setEmail(next);
                    setAuthError(null);
                  }}
                  placeholder="netid@illinois.edu"
                  placeholderTextColor={Colors.textLight}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  returnKeyType="send"
                  onSubmitEditing={handleSendCode}
                  editable={!otpLoading}
                />

                <TouchableOpacity
                  style={[styles.ssoBtn, otpLoading && { opacity: 0.7 }]}
                  onPress={handleSendCode}
                  disabled={otpLoading}
                >
                  {otpLoading ? (
                    <ActivityIndicator color={Colors.teal} size="small" />
                  ) : (
                    <>
                      <Ionicons name="mail-outline" size={16} color={Colors.teal} />
                      <Text style={styles.ssoBtnText}>Email me a code</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}

            {otpSent && (
              <>
                <TextInput
                  style={[styles.input, styles.codeInput]}
                  value={otpCode}
                  onChangeText={(next) => {
                    setOtpCode(next.replace(/[^0-9]/g, "").slice(0, 6));
                    setAuthError(null);
                  }}
                  placeholder="000000"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete="one-time-code"
                  maxLength={6}
                  returnKeyType="done"
                  onSubmitEditing={handleVerifyCode}
                  editable={!otpLoading}
                />

                <TouchableOpacity
                  style={[styles.otpSendBtn, otpLoading && { opacity: 0.7 }]}
                  onPress={handleVerifyCode}
                  disabled={otpLoading}
                >
                  {otpLoading ? (
                    <ActivityIndicator color={Colors.white} size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={16} color={Colors.white} />
                      <Text style={styles.otpSendBtnText}>Verify & Continue</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setOtpSent(false);
                    setOtpCode("");
                    setAuthError(null);
                  }}
                  disabled={otpLoading}
                >
                  <Text style={styles.linkText}>Back to sign-in options</Text>
                </TouchableOpacity>
              </>
            )}

            {authError && <Text style={styles.errorText}>{authError}</Text>}
          </View>
        )}

        {step === 1 && (
          <View style={styles.stepContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="compass" size={38} color={Colors.teal} />
            </View>

            <Text style={styles.stepTitle}>What brings you here?</Text>
            <Text style={styles.stepSubtitle}>Tell us how you want to use PopMatch</Text>

            {([
              { key: "host" as Intent, label: "Host", icon: "home-outline" as const, desc: "I have a place and need a roommate" },
              { key: "joiner" as Intent, label: "Joiner", icon: "person-add-outline" as const, desc: "I'm looking for an open room to join" },
              { key: "co_seeker" as Intent, label: "Co-Seeker", icon: "people-outline" as const, desc: "I want to find a place with someone" },
              { key: "sublessor" as Intent, label: "Sublessor", icon: "swap-horizontal-outline" as const, desc: "I need to sublease my current spot" },
              { key: "sublessee" as Intent, label: "Sublessee", icon: "search-outline" as const, desc: "I'm looking for a sublease to pick up" },
            ]).map(({ key, label, icon, desc }) => (
              <TouchableOpacity
                key={key}
                style={[styles.optionCard, intent === key && styles.optionCardActive]}
                onPress={() => {
                  setIntent(key);
                  Haptics.selectionAsync();
                }}
              >
                <View style={[styles.zoneIcon, { backgroundColor: Colors.teal + "18" }]}>
                  <Ionicons name={icon} size={18} color={intent === key ? Colors.teal : Colors.charcoal} />
                </View>
                <View style={styles.optionLeft}>
                  <Text style={[styles.optionLabel, intent === key && styles.optionLabelActive]}>{label}</Text>
                  <Text style={styles.optionDesc}>{desc}</Text>
                </View>
                {intent === key && <Ionicons name="checkmark-circle" size={18} color={Colors.teal} />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="person" size={38} color={Colors.teal} />
            </View>

            <Text style={styles.stepTitle}>Almost there</Text>
            <Text style={styles.stepSubtitle}>
              Just your name to get started — everything else is editable later
            </Text>

            <TouchableOpacity style={styles.avatarPicker} onPress={pickProfileImage} activeOpacity={0.7}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="camera" size={32} color={Colors.teal} />
                  <Text style={styles.avatarHint}>Add photo</Text>
                </View>
              )}
            </TouchableOpacity>
            <Text style={[styles.fieldHint, { textAlign: "center" }]}>
              Optional, but profiles with photos get far more matches
            </Text>

            <Text style={styles.label}>Your Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Full name"
              placeholderTextColor={Colors.textLight}
              autoCapitalize="words"
              returnKeyType="done"
            />
            {!name.trim() && <Text style={styles.fieldHint}>Required to continue</Text>}

            <Text style={styles.label}>
              Major <Text style={styles.optionalTag}>optional</Text>
            </Text>
            <TouchableOpacity style={styles.input} onPress={() => setShowMajorPicker(!showMajorPicker)}>
              <Text style={[styles.selectText, { color: major ? Colors.charcoal : Colors.textLight }]}>
                {major || "Select your major"}
              </Text>
              <Ionicons
                name={showMajorPicker ? "chevron-up" : "chevron-down"}
                size={15}
                color={Colors.textMuted}
              />
            </TouchableOpacity>

            {showMajorPicker && (
              <View style={styles.majorList}>
                {MAJORS.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.majorItem, major === m && styles.majorSelected]}
                    onPress={() => {
                      setMajor(m);
                      setShowMajorPicker(false);
                      Haptics.selectionAsync();
                    }}
                  >
                    <Text style={[styles.majorText, major === m && styles.majorTextSelected]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.deferNote}>
              Budget, neighborhood, lease type and roommate preferences all live in
              your profile — set them whenever you like.
            </Text>
          </View>
        )}

      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 12 },
        ]}
      >
        {step > 1 && (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              setStep((s) => s - 1);
              Haptics.selectionAsync();
            }}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.charcoal} />
          </TouchableOpacity>
        )}

        {step > 0 && (
          <TouchableOpacity
            style={[
              styles.nextBtn,
              !isFormComplete && { backgroundColor: DISABLED_BG, elevation: 0, shadowOpacity: 0 },
            ]}
            onPress={step === STEPS - 1 || (isSupplySide && step === 2) ? handleFinish : handleNext}
            disabled={!isFormComplete || savingProfile}
          >
            <Text style={[styles.nextBtnText, !isFormComplete && { color: DISABLED_TEXT }]}>
              {savingProfile
                ? "Saving..."
                : isSupplySide && step === 2
                ? intent === "host"
                  ? "Post My Apartment"
                  : "Post My Sublease"
                : step === STEPS - 1
                  ? "Find My Match"
                  : "Continue"}
            </Text>

            <Ionicons
              name={isSupplySide && step === 2 ? "home" : step === STEPS - 1 ? "heart" : "arrow-forward"}
              size={17}
              color={isFormComplete ? Colors.white : DISABLED_TEXT}
            />
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const pStyles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingBottom: 4,
  },
  trackContainer: {
    flex: 1,
    height: 48,
    position: "relative",
    justifyContent: "center",
  },
  waveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    position: "absolute",
    bottom: 8,
    left: 0,
    right: 0,
  },
  waveBump: {
    width: 9,
    height: 5,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: Colors.tealLight + "55",
    backgroundColor: "transparent",
  },
  fishWrap: { position: "absolute", bottom: 12 },
  bucket: { alignItems: "center", justifyContent: "center" },
  bucketInner: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.foam },
  header: { paddingHorizontal: 20, paddingBottom: 4 },
  scroll: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 8 },
  stepContainer: { gap: 12 },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Colors.teal + "15",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 4,
    borderWidth: 2,
    borderColor: Colors.teal + "28",
  },
  stepTitle: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 27,
    color: Colors.teal,
    textAlign: "center",
    lineHeight: 34,
  },
  stepSubtitle: {
    fontFamily: "Nunito_400Regular",
    fontSize: 15,
    color: Colors.textMuted,
    textAlign: "center",
    marginBottom: 6,
  },
  label: {
    fontFamily: "Nunito_700Bold",
    fontSize: 14,
    color: Colors.charcoal,
    marginTop: 6,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.borderSoft,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontFamily: "Nunito_400Regular",
    fontSize: 15,
    color: Colors.charcoal,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  textArea: { height: 90, paddingTop: 13 },
  selectText: { fontFamily: "Nunito_400Regular", fontSize: 15 },
  fieldHint: { fontFamily: "Nunito_400Regular", fontSize: 11, color: Colors.textLight },
  optionalTag: {
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    color: Colors.textLight,
  },
  deferNote: {
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 12,
    paddingHorizontal: 8,
  },
  otpSendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.teal,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 4,
  },
  otpSendBtnText: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 16,
    color: Colors.white,
  },
  codeInput: {
    textAlign: "center",
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 28,
    letterSpacing: 10,
  },
  linkText: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 13,
    color: Colors.teal,
    textAlign: "center",
    marginTop: 4,
  },
  dividerText: {
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    color: Colors.textLight,
    textAlign: "center",
    marginTop: 4,
  },
  ssoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.teal + "40",
    paddingVertical: 15,
  },
  ssoBtnText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
    color: Colors.teal,
  },
  errorText: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 13,
    color: Colors.errorRed,
    textAlign: "center",
    marginTop: 4,
  },
  avatarPicker: { alignSelf: "center", marginVertical: 8 },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#D0F0E0",
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#D0F0E0",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.teal + "30",
    borderStyle: "dashed",
  },
  avatarHint: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 11,
    color: Colors.teal,
    marginTop: 4,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 22,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.borderSoft,
  },
  chipActive: { backgroundColor: Colors.teal, borderColor: Colors.teal },
  chipText: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 13,
    color: Colors.textMuted,
  },
  chipTextActive: { color: Colors.white },
  budgetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    justifyContent: "center",
    marginVertical: 4,
  },
  budgetBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.borderSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  budgetDisplay: { alignItems: "center", minWidth: 110 },
  budgetValue: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 36,
    color: Colors.teal,
  },
  budgetSub: {
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.borderSoft,
    padding: 13,
  },
  optionCardActive: { borderColor: Colors.teal, backgroundColor: Colors.teal + "0E" },
  optionLeft: { flex: 1 },
  optionLabel: {
    fontFamily: "Nunito_700Bold",
    fontSize: 14,
    color: Colors.charcoal,
  },
  optionLabelActive: { color: Colors.teal },
  optionDesc: {
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 1,
  },
  zoneIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  ratingRow: { flexDirection: "row", gap: 10, justifyContent: "center", marginVertical: 6 },
  ratingDot: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  ratingNum: { fontFamily: "Nunito_800ExtraBold", fontSize: 17 },
  scaleLabels: { flexDirection: "row", justifyContent: "space-between" },
  scaleLabel: {
    fontFamily: "Nunito_400Regular",
    fontSize: 11,
    color: Colors.textLight,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.borderSoft,
    padding: 14,
  },
  toggleInfo: { flex: 1 },
  toggleTitle: {
    fontFamily: "Nunito_700Bold",
    fontSize: 14,
    color: Colors.charcoal,
  },
  toggleDesc: {
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
  },
  toggle: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: Colors.foamDark,
    borderWidth: 1.5,
    borderColor: Colors.borderSoft,
  },
  toggleOn: { backgroundColor: Colors.grassGreen, borderColor: Colors.grassGreen },
  toggleText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 13,
    color: Colors.textMuted,
  },
  toggleTextOn: { color: Colors.white },
  landlordDot: { width: 12, height: 12, borderRadius: 6 },
  majorList: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.borderSoft,
    overflow: "hidden",
  },
  majorItem: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: Colors.foamDark,
  },
  majorSelected: { backgroundColor: Colors.teal + "14" },
  majorText: {
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    color: Colors.charcoal,
  },
  majorTextSelected: {
    fontFamily: "Nunito_700Bold",
    color: Colors.teal,
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: Colors.foam,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSoft,
  },
  backBtn: {
    width: 50,
    height: 54,
    borderRadius: 15,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.borderSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  nextBtn: {
    flex: 1,
    height: 54,
    borderRadius: 15,
    backgroundColor: Colors.ponyo,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  nextBtnText: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 16,
    color: Colors.white,
  },
});