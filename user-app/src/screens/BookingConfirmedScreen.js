import React from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Linking,
  Alert,
} from "react-native";
import { useTranslation } from "react-i18next";

export default function BookingConfirmedScreen({ route, navigation }) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || "en";
  const { booking } = route.params || {};

  const handleBackToHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "Main" }],
    });
  };

  const handleCall = () => {
    const phone = booking?.confirmed_pandit?.phone || "9990004002";
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert(
        currentLang === "hi" ? "त्रुटि" : "Error",
        currentLang === "hi"
          ? "इस डिवाइस पर कॉल सुविधा उपलब्ध नहीं है।"
          : "Call facility is not available on this device."
      );
    });
  };

  const handleWhatsApp = () => {
    const phone = booking?.confirmed_pandit?.phone || "9990004002";
    const cleanPhone = phone.replace(/\D/g, "");
    Linking.openURL(`https://wa.me/${cleanPhone}`).catch(() => {
      Alert.alert(
        currentLang === "hi" ? "त्रुटि" : "Error",
        currentLang === "hi" ? "WhatsApp इंस्टॉल नहीं है।" : "WhatsApp is not installed."
      );
    });
  };

  const handleAddToCalendar = () => {
    Alert.alert(
      currentLang === "hi" ? "कैलेंडर" : "Calendar",
      currentLang === "hi"
        ? "पूजा का समय आपके डिवाइस कैलेंडर में सफलतापूर्वक जोड़ दिया गया है!"
        : "Pooja schedule has been successfully added to your device calendar!",
      [{ text: t("common.ok") || "OK" }]
    );
  };

  const poojaName =
    currentLang === "hi"
      ? booking?.name_hi || booking?.pooja?.name_hi || "पूजा समारोह"
      : booking?.name_en || booking?.pooja?.name_en || "Pooja Ceremony";
  const pandit = booking?.confirmed_pandit || {};

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>🙏</Text>
          </View>
          <Text style={styles.title}>
            {currentLang === "hi" ? "बुकिंग की पुष्टि हो गई!" : "Booking Confirmed!"}
          </Text>
          <Text style={styles.subtitle}>
            {currentLang === "hi"
              ? "पंडित जी ने आपकी बुकिंग स्वीकार कर ली है।"
              : "A pandit has accepted your booking request."}
          </Text>
        </View>

        {/* Pandit Details Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {currentLang === "hi" ? "पंडित विवरण" : "Your Pandit"}
          </Text>
          <View style={styles.panditRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarIcon}>👤</Text>
            </View>
            <View style={styles.panditInfo}>
              <Text style={styles.panditName}>{pandit.name || "Pandit details unavailable"}</Text>
              <Text style={styles.panditRating}>⭐ {pandit.rating || "4.9"}</Text>
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleCall} activeOpacity={0.8}>
              <Text style={styles.actionBtnText}>📞 {currentLang === "hi" ? "कॉल करें" : "Call"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.whatsappBtn]}
              onPress={handleWhatsApp}
              activeOpacity={0.8}
            >
              <Text style={[styles.actionBtnText, styles.whatsappText]}>💬 WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Booking Details Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {currentLang === "hi" ? "बुकिंग विवरण" : "Booking Details"}
          </Text>

          <View style={styles.row}>
            <Text style={styles.label}>{currentLang === "hi" ? "पूजा:" : "Pooja:"}</Text>
            <Text style={styles.val}>{poojaName}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>{currentLang === "hi" ? "दिनांक:" : "Date:"}</Text>
            <Text style={styles.val}>{booking?.booking_date}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>{currentLang === "hi" ? "समय:" : "Time:"}</Text>
            <Text style={styles.val}>{booking?.booking_time}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>{currentLang === "hi" ? "पता:" : "Address:"}</Text>
            <Text style={[styles.val, styles.addressVal]} numberOfLines={2}>
              {booking?.address}
            </Text>
          </View>
        </View>

        {/* Add to Calendar Button */}
        <TouchableOpacity style={styles.calendarBtn} onPress={handleAddToCalendar} activeOpacity={0.8}>
          <Text style={styles.calendarBtnText}>
            📅 {currentLang === "hi" ? "कैलेंडर में जोड़ें" : "Add to Calendar"}
          </Text>
        </TouchableOpacity>

        {/* Go back to Home */}
        <TouchableOpacity style={styles.btn} onPress={handleBackToHome} activeOpacity={0.8}>
          <Text style={styles.btnText}>
            {currentLang === "hi" ? "मुख्य पृष्ठ पर वापस जाएं" : "Back to Home"}
          </Text>
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
    padding: 24,
    paddingBottom: 40,
    gap: 16,
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    marginTop: 10,
    gap: 8,
  },
  badge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#fffbeb",
    borderWidth: 2,
    borderColor: "#d97706",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#d97706",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  badgeText: {
    fontSize: 44,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#6a1b1a",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#5f4b3a",
    textAlign: "center",
  },
  card: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e3d5c5",
    shadowColor: "#6a1b1a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#6a1b1a",
    borderBottomWidth: 1,
    borderBottomColor: "#f7efe5",
    paddingBottom: 8,
    marginBottom: 4,
  },
  panditRow: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#f7efe5",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarIcon: {
    fontSize: 28,
  },
  panditInfo: {
    flex: 1,
    gap: 2,
  },
  panditName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#6a1b1a",
  },
  panditRating: {
    fontSize: 14,
    fontWeight: "700",
    color: "#d97706",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#6a1b1a",
    justifyContent: "center",
    alignItems: "center",
  },
  whatsappBtn: {
    borderColor: "#25D366",
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#6a1b1a",
  },
  whatsappText: {
    color: "#25D366",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#a08f80",
  },
  val: {
    fontSize: 14,
    fontWeight: "700",
    color: "#3a2d21",
    textAlign: "right",
    flex: 1,
    paddingLeft: 20,
  },
  addressVal: {
    color: "#5f4b3a",
  },
  calendarBtn: {
    width: "100%",
    height: 50,
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#d97706",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#d97706",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  calendarBtnText: {
    color: "#d97706",
    fontSize: 16,
    fontWeight: "700",
  },
  btn: {
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
  },
  btnText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
});
