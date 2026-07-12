import React, { useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView } from "react-native";
import { Calendar } from "react-native-calendars";
import { useTranslation } from "react-i18next";

const TIME_SLOTS = ["07:00 AM", "09:00 AM", "11:00 AM", "01:00 PM", "03:00 PM", "05:00 PM"];

export default function SelectDateTimeScreen({ route, navigation }) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || "en";
  const { pooja } = route.params || {};

  // Default to tomorrow's date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const [selectedDate, setSelectedDate] = useState(tomorrowStr);
  const [selectedTime, setSelectedTime] = useState(TIME_SLOTS[1]); // Default 09:00 AM

  const handleContinue = () => {
    navigation.navigate("SelectLocation", {
      pooja,
      bookingDate: selectedDate,
      bookingTime: selectedTime,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("dateTime.selectDate")}</Text>
          <View style={styles.calendarCard}>
            <Calendar
              current={selectedDate}
              minDate={tomorrowStr}
              onDayPress={(day) => setSelectedDate(day.dateString)}
              markedDates={{
                [selectedDate]: { selected: true, marked: true, selectedColor: "#d97706" },
              }}
              theme={{
                backgroundColor: "#ffffff",
                calendarBackground: "#ffffff",
                textSectionTitleColor: "#5f4b3a",
                selectedDayBackgroundColor: "#d97706",
                selectedDayTextColor: "#ffffff",
                todayTextColor: "#d97706",
                dayTextColor: "#3a2d21",
                textDisabledColor: "#d0c0b0",
                dotColor: "#d97706",
                selectedDotColor: "#ffffff",
                arrowColor: "#6a1b1a",
                disabledArrowColor: "#d3d3d3",
                monthTextColor: "#6a1b1a",
                indicatorColor: "#6a1b1a",
                textDayFontWeight: "600",
                textMonthFontWeight: "700",
                textDayHeaderFontWeight: "600",
                textDayFontSize: 15,
                textMonthFontSize: 16,
                textDayHeaderFontSize: 13,
              }}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("dateTime.selectTime")}</Text>
          <View style={styles.slotsContainer}>
            {TIME_SLOTS.map((slot) => {
              const isSelected = selectedTime === slot;
              return (
                <TouchableOpacity
                  key={slot}
                  style={[styles.slotCard, isSelected && styles.selectedSlotCard]}
                  onPress={() => setSelectedTime(slot)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.slotText, isSelected && styles.selectedSlotText]}>
                    {slot}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity style={styles.continueBtn} onPress={handleContinue} activeOpacity={0.8}>
          <Text style={styles.continueBtnText}>{t("dateTime.continue")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7efe5",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#6a1b1a",
    marginBottom: 12,
  },
  calendarCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e3d5c5",
    overflow: "hidden",
    shadowColor: "#6a1b1a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    padding: 8,
  },
  slotsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  slotCard: {
    flexBasis: "30%",
    flexGrow: 1,
    height: 50,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e3d5c5",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#6a1b1a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  selectedSlotCard: {
    backgroundColor: "#6a1b1a",
    borderColor: "#6a1b1a",
  },
  slotText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#5f4b3a",
  },
  selectedSlotText: {
    color: "#ffffff",
  },
  continueBtn: {
    height: 54,
    backgroundColor: "#d97706",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#d97706",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
    marginTop: 10,
  },
  continueBtnText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
});
