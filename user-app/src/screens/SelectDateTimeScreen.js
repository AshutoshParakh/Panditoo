import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar } from "react-native-calendars";
import { useTranslation } from "react-i18next";
import { colors, shadow } from "../theme/homeTheme";

const TIME_SLOTS = [
  { value: "07:00 AM", label: "07:00", period: "AM" },
  { value: "09:00 AM", label: "09:00", period: "AM" },
  { value: "11:00 AM", label: "11:00", period: "AM" },
  { value: "01:00 PM", label: "01:00", period: "PM" },
  { value: "03:00 PM", label: "03:00", period: "PM" },
  { value: "05:00 PM", label: "05:00", period: "PM" },
];

const toDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function SelectDateTimeScreen({ route, navigation }) {
  const { i18n } = useTranslation();
  const hindi = i18n.language === "hi";
  const { pooja } = route.params || {};
  const tomorrow = useMemo(() => { const date = new Date(); date.setDate(date.getDate() + 1); return toDateString(date); }, []);
  const [selectedDate, setSelectedDate] = useState(tomorrow);
  const [selectedTime, setSelectedTime] = useState(TIME_SLOTS[1].value);

  const displayDate = useMemo(() => {
    const [year, month, day] = selectedDate.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString(hindi ? "hi-IN" : "en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
  }, [hindi, selectedDate]);

  const handleContinue = () => navigation.navigate("SelectLocation", { pooja, bookingDate: selectedDate, bookingTime: selectedTime });

  return (
    <SafeAreaView style={s.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <View style={s.intro}><Text style={s.eyebrow}>{hindi ? "बुकिंग विवरण" : "BOOKING DETAILS"}</Text><Text style={s.title}>{hindi ? "सुविधाजनक समय चुनें" : "Choose a convenient time"}</Text><Text style={s.subtitle}>{hindi ? "पूजा के लिए अपनी पसंद की तारीख और समय चुनें।" : "Select your preferred date and arrival window for the ceremony."}</Text></View>

        <View style={s.sectionHeader}><View style={s.sectionNumber}><Text style={s.sectionNumberText}>01</Text></View><View><Text style={s.sectionTitle}>{hindi ? "तारीख चुनें" : "Select a date"}</Text><Text style={s.sectionHint}>{hindi ? "कल से उपलब्ध" : "Available from tomorrow"}</Text></View></View>
        <View style={s.calendarCard}>
          <Calendar
            current={selectedDate}
            minDate={tomorrow}
            firstDay={1}
            hideExtraDays
            enableSwipeMonths
            onDayPress={(day) => setSelectedDate(day.dateString)}
            markedDates={{ [selectedDate]: { selected: true, selectedColor: colors.primary } }}
            theme={{
              calendarBackground: "#FFFFFF", textSectionTitleColor: "#93877E", selectedDayBackgroundColor: colors.primary,
              selectedDayTextColor: "#FFFFFF", todayTextColor: colors.primary, dayTextColor: colors.ink,
              textDisabledColor: "#D2C8C0", arrowColor: colors.primary, monthTextColor: colors.ink,
              textDayFontWeight: "600", textMonthFontWeight: "800", textDayHeaderFontWeight: "700",
              textDayFontSize: 13, textMonthFontSize: 15, textDayHeaderFontSize: 9,
            }}
          />
        </View>

        <View style={s.sectionHeader}><View style={s.sectionNumber}><Text style={s.sectionNumberText}>02</Text></View><View><Text style={s.sectionTitle}>{hindi ? "आगमन का समय" : "Select arrival time"}</Text><Text style={s.sectionHint}>{hindi ? "पंडित जी के पहुंचने का समय" : "When the pandit should arrive"}</Text></View></View>
        <View style={s.periodLabel}><Text style={s.periodText}>{hindi ? "सुबह" : "MORNING"}</Text><View style={s.periodLine} /></View>
        <View style={s.slots}>{TIME_SLOTS.slice(0, 3).map((slot) => <TimeSlot key={slot.value} slot={slot} selected={selectedTime === slot.value} onPress={() => setSelectedTime(slot.value)} />)}</View>
        <View style={s.periodLabel}><Text style={s.periodText}>{hindi ? "दोपहर और शाम" : "AFTERNOON & EVENING"}</Text><View style={s.periodLine} /></View>
        <View style={s.slots}>{TIME_SLOTS.slice(3).map((slot) => <TimeSlot key={slot.value} slot={slot} selected={selectedTime === slot.value} onPress={() => setSelectedTime(slot.value)} />)}</View>

        <View style={s.note}><View style={s.noteMark}><Text style={s.noteMarkText}>i</Text></View><Text style={s.noteText}>{hindi ? "अंतिम समय पंडित जी की उपलब्धता के अनुसार पुष्टि किया जाएगा।" : "Final timing is confirmed based on the selected pandit’s availability."}</Text></View>
        <View style={s.spacer} />
      </ScrollView>

      <View style={s.footer}>
        <View style={s.selection}><Text style={s.selectionLabel}>{hindi ? "चुना गया समय" : "SELECTED SCHEDULE"}</Text><Text numberOfLines={1} style={s.selectionValue}>{displayDate}</Text><Text style={s.selectionTime}>{selectedTime}</Text></View>
        <TouchableOpacity style={s.continueButton} onPress={handleContinue} activeOpacity={0.82}><Text style={s.continueText}>{hindi ? "स्थान चुनें" : "Choose location"}</Text><Text style={s.arrow}>›</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const TimeSlot = ({ slot, selected, onPress }) => <TouchableOpacity activeOpacity={0.75} style={[s.slot, selected && s.slotSelected]} onPress={onPress}><Text style={[s.slotTime, selected && s.slotTimeSelected]}>{slot.label}</Text><Text style={[s.slotPeriod, selected && s.slotPeriodSelected]}>{slot.period}</Text>{selected ? <View style={s.selectedMark}><Text style={s.selectedMarkText}>✓</Text></View> : null}</TouchableOpacity>;

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8F5F0" }, content: { paddingHorizontal: 18 }, intro: { paddingTop: 2, paddingBottom: 5 }, eyebrow: { color: colors.primary, fontSize: 8, fontWeight: "800", letterSpacing: 1.3 }, title: { color: colors.ink, fontSize: 23, lineHeight: 29, fontWeight: "800", marginTop: 4 }, subtitle: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginTop: 13, marginBottom: 7 }, sectionNumber: { width: 27, height: 27, borderRadius: 8, backgroundColor: "#ECE4DD", alignItems: "center", justifyContent: "center", marginRight: 9 }, sectionNumberText: { color: colors.primary, fontSize: 7, fontWeight: "800" }, sectionTitle: { color: colors.ink, fontSize: 13, fontWeight: "800" }, sectionHint: { color: colors.muted, fontSize: 7, marginTop: 1 },
  calendarCard: { backgroundColor: "#FFFFFF", borderRadius: 17, borderWidth: 1, borderColor: "#E7DDD4", overflow: "hidden", padding: 7, ...shadow }, periodLabel: { flexDirection: "row", alignItems: "center", marginBottom: 9, marginTop: 4 }, periodText: { color: colors.muted, fontSize: 8, fontWeight: "800", letterSpacing: 1 }, periodLine: { flex: 1, height: 1, backgroundColor: "#E7DED6", marginLeft: 9 }, slots: { flexDirection: "row", gap: 9, marginBottom: 13 }, slot: { flex: 1, height: 57, borderRadius: 12, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E4D9D0", alignItems: "center", justifyContent: "center" }, slotSelected: { backgroundColor: colors.primary, borderColor: colors.primary, ...shadow }, slotTime: { color: "#4D453F", fontSize: 13, fontWeight: "800" }, slotTimeSelected: { color: "#FFFFFF" }, slotPeriod: { color: colors.muted, fontSize: 7, fontWeight: "800", marginTop: 2 }, slotPeriodSelected: { color: "#EBCFCD" }, selectedMark: { position: "absolute", top: 5, right: 6, width: 13, height: 13, borderRadius: 7, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }, selectedMarkText: { color: "#FFFFFF", fontSize: 7, fontWeight: "800" },
  note: { flexDirection: "row", alignItems: "center", borderRadius: 11, backgroundColor: "#F0EDEA", padding: 11, marginTop: 4 }, noteMark: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: "#A99B90", alignItems: "center", justifyContent: "center" }, noteMarkText: { color: "#81746B", fontSize: 8, fontWeight: "800" }, noteText: { flex: 1, color: "#776C64", fontSize: 8, lineHeight: 13, marginLeft: 9 }, spacer: { height: 105 },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, minHeight: 83, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#E6DCD3", paddingHorizontal: 18, paddingVertical: 11, flexDirection: "row", alignItems: "center", justifyContent: "space-between", ...shadow }, selection: { flex: 1, paddingRight: 8 }, selectionLabel: { color: colors.muted, fontSize: 7, fontWeight: "800", letterSpacing: 0.9 }, selectionValue: { color: colors.ink, fontSize: 10, fontWeight: "800", marginTop: 3 }, selectionTime: { color: colors.primary, fontSize: 9, fontWeight: "800", marginTop: 2 }, continueButton: { minWidth: 174, height: 50, borderRadius: 12, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 15 }, continueText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" }, arrow: { color: "#FFFFFF", fontSize: 22, marginLeft: 8, marginTop: -2 },
});
