import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Platform, Alert
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import { getApiUrl } from "@/lib/query-client";

type Zone = "campustown" | "north" | "south" | "urbana" | "downtown";

const ZONES: { key: Zone; label: string }[] = [
  { key: "campustown", label: "Campustown" },
  { key: "north", label: "North Campus" },
  { key: "south", label: "South Campus" },
  { key: "urbana", label: "Urbana" },
  { key: "downtown", label: "Downtown" },
];

export default function CreateGroupScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser } = useApp();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const [buildingName, setBuildingName] = useState("");
  const [address, setAddress] = useState("");
  const [zone, setZone] = useState<Zone>("campustown");
  const [rentPerPerson, setRentPerPerson] = useState(800);
  const [roomsAvailable, setRoomsAvailable] = useState(1);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const step = (setter: React.Dispatch<React.SetStateAction<number>>, dir: number, min: number, max: number) => {
    Haptics.selectionAsync();
    setter(v => Math.min(max, Math.max(min, v + dir)));
  };

  const handleSave = async () => {
    if (!buildingName.trim()) {
      Alert.alert("Missing Info", "Please enter a building name.");
      return;
    }
    if (!currentUser) return;
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const AVATAR_COLORS = [Colors.ocean, Colors.ponyo, Colors.grassGreen, Colors.goldDark, "#9B59B6"];
      const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
      const url = new URL("/api/group-profiles", getApiUrl()).toString();
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
          creatorEmail: currentUser.email,
          buildingName: buildingName.trim(),
          address: address.trim(),
          zone,
          rentPerPerson,
          roomsAvailable,
          description: description.trim(),
          avatarColor,
        }),
      });
      if (res.ok) {
        router.back();
      } else {
        Alert.alert("Error", "Failed to create group profile.");
      }
    } catch {
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.sand }}>
      <View style={[s.header, { paddingTop: topPadding + 12 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.ocean} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Create Group Profile</Text>
          <Text style={s.sub}>Find roommates to fill your place</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[s.content, {
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 20
        }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.section}>
          <Text style={s.label}>Building Name *</Text>
          <TextInput
            style={s.input}
            value={buildingName}
            onChangeText={setBuildingName}
            placeholder="e.g. Hub Champaign, 707 S Mathews"
            placeholderTextColor={Colors.textLight}
          />

          <Text style={s.label}>Address</Text>
          <TextInput
            style={s.input}
            value={address}
            onChangeText={setAddress}
            placeholder="Street address"
            placeholderTextColor={Colors.textLight}
          />

          <Text style={s.label}>Zone</Text>
          <View style={s.zoneRow}>
            {ZONES.map(z => (
              <TouchableOpacity
                key={z.key}
                style={[s.zoneChip, zone === z.key && s.zoneChipActive]}
                onPress={() => { setZone(z.key); Haptics.selectionAsync(); }}
              >
                <Text style={[s.zoneChipText, zone === z.key && s.zoneChipTextActive]}>{z.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.label}>Rent Per Person</Text>
          <View style={s.stepper}>
            <TouchableOpacity style={s.stepBtn} onPress={() => step(setRentPerPerson, -50, 200, 3000)}>
              <Ionicons name="remove" size={20} color={Colors.charcoal} />
            </TouchableOpacity>
            <Text style={s.stepValue}>${rentPerPerson}/mo</Text>
            <TouchableOpacity style={s.stepBtn} onPress={() => step(setRentPerPerson, 50, 200, 3000)}>
              <Ionicons name="add" size={20} color={Colors.charcoal} />
            </TouchableOpacity>
          </View>

          <Text style={s.label}>Rooms Available</Text>
          <View style={s.stepper}>
            <TouchableOpacity style={s.stepBtn} onPress={() => step(setRoomsAvailable, -1, 1, 6)}>
              <Ionicons name="remove" size={20} color={Colors.charcoal} />
            </TouchableOpacity>
            <Text style={s.stepValue}>{roomsAvailable} room{roomsAvailable !== 1 ? "s" : ""}</Text>
            <TouchableOpacity style={s.stepBtn} onPress={() => step(setRoomsAvailable, 1, 1, 6)}>
              <Ionicons name="add" size={20} color={Colors.charcoal} />
            </TouchableOpacity>
          </View>

          <Text style={s.label}>Description</Text>
          <TextInput
            style={[s.input, { height: 90, textAlignVertical: "top", paddingTop: 12 }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Tell potential roommates about your place and your current roommates..."
            placeholderTextColor={Colors.textLight}
            multiline
            numberOfLines={4}
          />
        </View>

        <TouchableOpacity
          style={[s.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Ionicons name="people" size={18} color={Colors.white} />
          <Text style={s.saveBtnText}>{saving ? "Creating..." : "Create Group Profile"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: Colors.cardBg,
    borderBottomWidth: 1, borderBottomColor: Colors.borderSoft,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.sand,
    alignItems: "center", justifyContent: "center",
  },
  title: { fontFamily: "Nunito_700Bold", fontSize: 17, color: Colors.ocean },
  sub: { fontFamily: "Nunito_400Regular", fontSize: 12, color: Colors.textMuted },
  content: { padding: 16, gap: 4 },
  section: { gap: 10 },
  label: { fontFamily: "Nunito_700Bold", fontSize: 13, color: Colors.charcoal, marginTop: 4 },
  input: {
    backgroundColor: Colors.cardBg, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.borderSoft,
    paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: "Nunito_400Regular", fontSize: 14, color: Colors.charcoal,
  },
  zoneRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  zoneChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: Colors.cardBg, borderWidth: 1.5, borderColor: Colors.borderSoft,
  },
  zoneChipActive: { backgroundColor: Colors.ocean, borderColor: Colors.ocean },
  zoneChipText: { fontFamily: "Nunito_600SemiBold", fontSize: 12, color: Colors.textMuted },
  zoneChipTextActive: { color: Colors.white },
  stepper: {
    flexDirection: "row", alignItems: "center", gap: 20, justifyContent: "center",
    backgroundColor: Colors.cardBg, borderRadius: 12, borderWidth: 1.5,
    borderColor: Colors.borderSoft, padding: 12,
  },
  stepBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.sand,
    alignItems: "center", justifyContent: "center",
  },
  stepValue: { fontFamily: "Nunito_800ExtraBold", fontSize: 20, color: Colors.ocean, minWidth: 100, textAlign: "center" },
  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.ocean, borderRadius: 14, paddingVertical: 16, marginTop: 16,
  },
  saveBtnText: { fontFamily: "Nunito_700Bold", fontSize: 16, color: Colors.white },
});
