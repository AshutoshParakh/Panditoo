import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

export default function BookingSuccessScreen({ route, navigation }) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || "en";
  const { pooja, bookingDate, bookingTime, address, selectedPanditCount } = route.params || {};

  const handleBackToHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "Main" }],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.successHeader}>
          <View style={styles.successBadge}>
            <Text style={styles.successIcon}>🙏</Text>
          </View>
          <Text style={styles.title}>
            {currentLang === "hi" ? "बुकिंग अनुरोध भेजा गया!" : "Booking Request Sent!"}
          </Text>
          <Text style={styles.subtitle}>
            {currentLang === "hi"
              ? `हमने आपके द्वारा चुने गए ${selectedPanditCount} पंडितों को अनुरोध भेज दिया है। उनके जवाब देते ही आपको सूचित किया जाएगा।`
              : `We have sent booking requests to the ${selectedPanditCount} selected pandits. You will be notified as soon as someone accepts.`}
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>
            {currentLang === "hi" ? "बुकिंग विवरण" : "Booking Summary"}
          </Text>

          <View style={styles.row}>
            <Text style={styles.label}>{currentLang === "hi" ? "पूजा:" : "Pooja:"}</Text>
            <Text style={styles.val}>{pooja?.name}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>{currentLang === "hi" ? "दिनांक:" : "Date:"}</Text>
            <Text style={styles.val}>{bookingDate}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>{currentLang === "hi" ? "समय:" : "Time:"}</Text>
            <Text style={styles.val}>{bookingTime}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>{currentLang === "hi" ? "स्थान:" : "Address:"}</Text>
            <Text style={[styles.val, styles.addressVal]} numberOfLines={2}>
              {address}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.homeBtn} onPress={handleBackToHome} activeOpacity={0.8}>
          <Text style={styles.homeBtnText}>
            {currentLang === "hi" ? "मुख्य पृष्ठ पर वापस जाएं" : "Back to Home"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7efe5",
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "space-between",
    alignItems: "center",
  },
  successHeader: {
    alignItems: "center",
    marginTop: 40,
    gap: 12,
  },
  successBadge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#fffbeb",
    borderWidth: 2,
    borderColor: "#d97706",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#d97706",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  successIcon: {
    fontSize: 54,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#6a1b1a",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#5f4b3a",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  summaryCard: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#e3d5c5",
    shadowColor: "#6a1b1a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    gap: 14,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#6a1b1a",
    borderBottomWidth: 1,
    borderBottomColor: "#f7efe5",
    paddingBottom: 10,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#a08f80",
  },
  val: {
    fontSize: 15,
    fontWeight: "700",
    color: "#3a2d21",
    textAlign: "right",
    flex: 1,
    paddingLeft: 20,
  },
  addressVal: {
    fontSize: 14,
    color: "#5f4b3a",
  },
  homeBtn: {
    width: "100%",
    height: 52,
    backgroundColor: "#6a1b1a",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#6a1b1a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 20,
  },
  homeBtnText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
});
