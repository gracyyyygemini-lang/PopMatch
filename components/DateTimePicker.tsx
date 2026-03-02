import React, { useState, useCallback } from "react";
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, Platform, ScrollView
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

const DAYS_OF_WEEK = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  const d = new Date(year, month, 1).getDay();
  return (d + 6) % 7;
}

export function formatDateRange(moveInAt: string | null | undefined, moveOutAt: string | null | undefined): string | null {
  if (!moveInAt && !moveOutAt) return null;
  const fmt = (iso: string) => {
    const d = new Date(iso);
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const h = d.getHours();
    const ampm = h >= 12 ? "PM" : "AM";
    const hour = h % 12 === 0 ? 12 : h % 12;
    return `${months[d.getMonth()]} ${d.getDate()} (${hour} ${ampm})`;
  };
  if (moveInAt && moveOutAt) return `${fmt(moveInAt)} – ${fmt(moveOutAt)}`;
  if (moveInAt) return `From ${fmt(moveInAt)}`;
  if (moveOutAt) return `Until ${fmt(moveOutAt)}`;
  return null;
}

export function calcDays(moveInAt: string | null | undefined, moveOutAt: string | null | undefined): number | null {
  if (!moveInAt || !moveOutAt) return null;
  const diff = new Date(moveOutAt).getTime() - new Date(moveInAt).getTime();
  return Math.max(1, Math.round(diff / 86400000));
}

interface DateTimePickerProps {
  visible: boolean;
  value: Date | null;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
  title?: string;
  minimumDate?: Date;
}

export default function DateTimePicker({ visible, value, onConfirm, onCancel, title = "Select Date & Time", minimumDate }: DateTimePickerProps) {
  const initial = value ?? new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const [selectedDay, setSelectedDay] = useState(initial.getDate());
  const [selectedYear, setSelectedYear] = useState(initial.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(initial.getMonth());
  const [hour, setHour] = useState(initial.getHours() % 12 === 0 ? 12 : initial.getHours() % 12);
  const [minute, setMinute] = useState(Math.round(initial.getMinutes() / 5) * 5 % 60);
  const [isPM, setIsPM] = useState(initial.getHours() >= 12);

  const today = new Date();

  const goMonth = (dir: -1 | 1) => {
    let m = viewMonth + dir;
    let y = viewYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setViewMonth(m);
    setViewYear(y);
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const isBeforeMin = (y: number, m: number, d: number) => {
    if (!minimumDate) return false;
    const cellDate = new Date(y, m, d);
    const min = new Date(minimumDate.getFullYear(), minimumDate.getMonth(), minimumDate.getDate());
    return cellDate < min;
  };

  const selectDay = (d: number) => {
    if (isBeforeMin(viewYear, viewMonth, d)) return;
    setSelectedDay(d);
    setSelectedMonth(viewMonth);
    setSelectedYear(viewYear);
  };

  const handleConfirm = () => {
    const h24 = isPM ? (hour === 12 ? 12 : hour + 12) : (hour === 12 ? 0 : hour);
    const date = new Date(selectedYear, selectedMonth, selectedDay, h24, minute, 0);
    onConfirm(date);
  };

  const stepHour = (dir: 1 | -1) => {
    setHour(h => { let n = h + dir; if (n < 1) n = 12; if (n > 12) n = 1; return n; });
  };

  const stepMinute = (dir: 1 | -1) => {
    setMinute(m => { let n = m + dir * 5; if (n < 0) n = 55; if (n > 55) n = 0; return n; });
  };

  const isSelected = (d: number) => d === selectedDay && viewMonth === selectedMonth && viewYear === selectedYear;
  const isToday = (d: number) => d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.handle} />

          <Text style={s.title}>{title}</Text>

          {/* Month navigation */}
          <View style={s.monthNav}>
            <TouchableOpacity style={s.monthArrow} onPress={() => goMonth(-1)}>
              <Ionicons name="chevron-back" size={20} color={Colors.ocean} />
            </TouchableOpacity>
            <Text style={s.monthLabel}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
            <TouchableOpacity style={s.monthArrow} onPress={() => goMonth(1)}>
              <Ionicons name="chevron-forward" size={20} color={Colors.ocean} />
            </TouchableOpacity>
          </View>

          {/* Day of week headers */}
          <View style={s.weekRow}>
            {DAYS_OF_WEEK.map(d => (
              <Text key={d} style={s.weekDay}>{d}</Text>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={s.grid}>
            {cells.map((cell, i) => {
              if (!cell) return <View key={i} style={s.cell} />;
              const disabled = isBeforeMin(viewYear, viewMonth, cell);
              const sel = isSelected(cell);
              const todayCell = isToday(cell);
              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    s.cell,
                    sel && s.cellSelected,
                    !sel && todayCell && s.cellToday,
                    disabled && s.cellDisabled,
                  ]}
                  onPress={() => selectDay(cell)}
                  disabled={disabled}
                >
                  <Text style={[
                    s.cellText,
                    sel && s.cellTextSelected,
                    !sel && todayCell && s.cellTextToday,
                    disabled && s.cellTextDisabled,
                  ]}>
                    {cell}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={s.divider} />

          {/* Time picker */}
          <View style={s.timeRow}>
            <View style={s.stepGroup}>
              <TouchableOpacity style={s.stepBtn} onPress={() => stepHour(1)}>
                <Ionicons name="chevron-up" size={16} color={Colors.ocean} />
              </TouchableOpacity>
              <View style={s.stepVal}>
                <Text style={s.stepText}>{String(hour).padStart(2, "0")}</Text>
              </View>
              <TouchableOpacity style={s.stepBtn} onPress={() => stepHour(-1)}>
                <Ionicons name="chevron-down" size={16} color={Colors.ocean} />
              </TouchableOpacity>
            </View>

            <Text style={s.timeSep}>:</Text>

            <View style={s.stepGroup}>
              <TouchableOpacity style={s.stepBtn} onPress={() => stepMinute(1)}>
                <Ionicons name="chevron-up" size={16} color={Colors.ocean} />
              </TouchableOpacity>
              <View style={s.stepVal}>
                <Text style={s.stepText}>{String(minute).padStart(2, "0")}</Text>
              </View>
              <TouchableOpacity style={s.stepBtn} onPress={() => stepMinute(-1)}>
                <Ionicons name="chevron-down" size={16} color={Colors.ocean} />
              </TouchableOpacity>
            </View>

            <View style={s.ampmGroup}>
              <TouchableOpacity
                style={[s.ampmBtn, !isPM && s.ampmActive]}
                onPress={() => setIsPM(false)}
              >
                <Text style={[s.ampmText, !isPM && s.ampmTextActive]}>AM</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.ampmBtn, isPM && s.ampmActive]}
                onPress={() => setIsPM(true)}
              >
                <Text style={[s.ampmText, isPM && s.ampmTextActive]}>PM</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Actions */}
          <View style={s.actions}>
            <TouchableOpacity style={s.cancelBtn} onPress={onCancel}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.confirmBtn} onPress={handleConfirm}>
              <Text style={s.confirmText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const CELL = 40;

const s = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.50)", justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.cardBg,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingBottom: Platform.OS === "web" ? 34 : 32,
    paddingTop: 12,
  },
  handle: {
    alignSelf: "center", width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.borderSoft, marginBottom: 12,
  },
  title: {
    fontFamily: "Nunito_800ExtraBold", fontSize: 17, color: Colors.charcoal,
    textAlign: "center", marginBottom: 14,
  },
  monthNav: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10,
  },
  monthArrow: {
    width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.ocean + "15",
  },
  monthLabel: {
    fontFamily: "Nunito_700Bold", fontSize: 16, color: Colors.charcoal,
  },
  weekRow: {
    flexDirection: "row", marginBottom: 4,
  },
  weekDay: {
    flex: 1, textAlign: "center",
    fontFamily: "Nunito_600SemiBold", fontSize: 12, color: Colors.textMuted,
  },
  grid: {
    flexDirection: "row", flexWrap: "wrap",
  },
  cell: {
    width: `${100/7}%` as any,
    height: CELL, alignItems: "center", justifyContent: "center",
  },
  cellSelected: {
    backgroundColor: Colors.ocean, borderRadius: CELL / 2,
  },
  cellToday: {
    borderWidth: 1.5, borderColor: Colors.ponyo, borderRadius: CELL / 2,
  },
  cellDisabled: { opacity: 0.25 },
  cellText: {
    fontFamily: "Nunito_600SemiBold", fontSize: 14, color: Colors.charcoal,
  },
  cellTextSelected: { color: Colors.white },
  cellTextToday: { color: Colors.ponyo },
  cellTextDisabled: { color: Colors.textLight },
  divider: {
    height: 1, backgroundColor: Colors.borderSoft, marginVertical: 14,
  },
  timeRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 18,
  },
  stepGroup: {
    alignItems: "center", gap: 2,
  },
  stepBtn: {
    width: 36, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.ocean + "12",
  },
  stepVal: {
    width: 52, height: 42, borderRadius: 10, alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.sand, borderWidth: 1.5, borderColor: Colors.borderSoft,
  },
  stepText: {
    fontFamily: "Nunito_800ExtraBold", fontSize: 22, color: Colors.charcoal,
  },
  timeSep: {
    fontFamily: "Nunito_800ExtraBold", fontSize: 26, color: Colors.charcoal, marginTop: -4,
  },
  ampmGroup: {
    gap: 6, marginLeft: 4,
  },
  ampmBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    backgroundColor: Colors.sand, borderWidth: 1.5, borderColor: Colors.borderSoft,
  },
  ampmActive: {
    backgroundColor: Colors.ocean, borderColor: Colors.ocean,
  },
  ampmText: {
    fontFamily: "Nunito_700Bold", fontSize: 13, color: Colors.textMuted,
  },
  ampmTextActive: { color: Colors.white },
  actions: {
    flexDirection: "row", gap: 12,
  },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center",
    backgroundColor: Colors.sand, borderWidth: 1.5, borderColor: Colors.borderSoft,
  },
  cancelText: {
    fontFamily: "Nunito_700Bold", fontSize: 15, color: Colors.textMuted,
  },
  confirmBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 14, alignItems: "center",
    backgroundColor: Colors.ocean,
  },
  confirmText: {
    fontFamily: "Nunito_700Bold", fontSize: 15, color: Colors.white,
  },
});
