import React, { useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Dimensions,
} from "react-native";
import { useTranslation } from "react-i18next";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function BookingWonScreen({ route, navigation }) {
  const { t, i18n } = useTranslation();
  const { booking } = route.params || {};

  // Confetti Animation Setup
  const confettiCount = 20;
  const animatedValues = useRef(
    Array.from({ length: confettiCount }).map(() => new Animated.Value(0))
  ).current;

  useEffect(() => {
    // Start confetti animation
    const animations = animatedValues.map((value) => {
      // Random delay and duration for each piece of confetti
      const delay = Math.random() * 800;
      const duration = 2500 + Math.random() * 1500;
      return Animated.sequence([
        Animated.delay(delay),
        Animated.timing(value, {
          toValue: 1,
          duration: duration,
          useNativeDriver: true,
        }),
      ]);
    });

    Animated.parallel(animations).start();
  }, [animatedValues]);

  const handleDone = () => {
    // Navigate back to Main tab screen, specifically to MyBookings tab
    navigation.reset({
      index: 0,
      routes: [
        {
          name: "Main",
          state: {
            routes: [{ name: "MyBookings" }],
          },
        },
      ],
    });
  };

  const isHindi = i18n.language === "hi";
  const poojaName = isHindi ? booking?.pooja_name_hi : booking?.pooja_name_en;

  return (
    <SafeAreaView style={styles.container}>
      {/* Dynamic Confetti Elements */}
      {animatedValues.map((value, index) => {
        const left = (SCREEN_WIDTH / confettiCount) * index + (Math.random() * 15 - 7);
        const colors = ["#fbbf24", "#f59e0b", "#d97706", "#b45309", "#10b981", "#3b82f6", "#ec4899"];
        const color = colors[index % colors.length];
        
        const translateY = value.interpolate({
          inputRange: [0, 1],
          outputRange: [-50, SCREEN_HEIGHT + 50],
        });

        const rotate = value.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", `${360 + Math.random() * 360}deg`],
        });

        const scale = value.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0.5, 1, 0.8],
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.confetti,
              {
                left,
                backgroundColor: color,
                transform: [{ translateY }, { rotate }, { scale }],
              },
            ]}
          />
        );
      })}

      <View style={styles.content}>
        <Text style={styles.wonEmoji}>🎉🏆🎉</Text>
        <Text style={styles.congratsText}>
          {isHindi ? "बधाई हो, बुकिंग आपकी हुई!" : "Congratulations, Booking Won!"}
        </Text>
        <Text style={styles.subCongratsText}>
          {isHindi
            ? "देवभक्त ने आपको इस पूजा के लिए चुना है।"
            : "The devotee has chosen you for this sacred ceremony."}
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardHeader}>{poojaName || "Pooja Ceremony"}</Text>
          <View style={styles.divider} />

          {/* Unlocked Details */}
          <View style={styles.detailRow}>
            <Text style={styles.label}>👤 {isHindi ? "भक्त का नाम" : "Devotee Name"}</Text>
            <Text style={styles.value}>{booking?.user_name || "N/A"}</Text>
          </View>

          <View style={styles.privacyBox}>
            <Text style={styles.privacyText}>Customer contact details stay private and coordination is managed through Panditoo.</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.label}>📅 {isHindi ? "तिथि एवं समय" : "Date & Time"}</Text>
            <Text style={styles.value}>
              {booking?.booking_date
                ? new Date(booking.booking_date).toLocaleDateString(isHindi ? "hi-IN" : "en-US", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })
                : "N/A"}{" "}
              - {booking?.booking_time?.slice(0, 5) || "N/A"}
            </Text>
          </View>

          <View style={[styles.detailRow, styles.addressRow]}>
            <Text style={styles.label}>📍 {isHindi ? "पूरा पता (अनलॉक)" : "Full Address (Unlocked)"}</Text>
            <Text style={styles.addressValue}>{booking?.address || "N/A"}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.payoutRow}>
            <Text style={styles.payoutLabel}>{isHindi ? "आपका भुगतान" : "Your Payout"}</Text>
            <Text style={styles.payoutValue}>₹{parseInt(booking?.pandit_payout_amount || 0)}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleDone} activeOpacity={0.9}>
          <Text style={styles.buttonText}>
            {isHindi ? "मेरी बुकिंग्स पर जाएं" : "Go to My Bookings"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  privacyBox: { backgroundColor: "#F5F1ED", borderRadius: 12, padding: 12, marginBottom: 13 },
  privacyText: { color: "#756A62", fontSize: 13, lineHeight: 19, fontWeight: "600" },
  container: {
    flex: 1,
    backgroundColor: "#fff7ed",
  },
  confetti: {
    position: "absolute",
    width: 10,
    height: 14,
    borderRadius: 2,
    zIndex: 99,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  wonEmoji: {
    fontSize: 64,
    marginBottom: 16,
    textAlign: "center",
  },
  congratsText: {
    fontSize: 26,
    fontWeight: "900",
    color: "#15803d",
    textAlign: "center",
    marginBottom: 8,
  },
  subCongratsText: {
    fontSize: 15,
    color: "#431407",
    textAlign: "center",
    marginBottom: 28,
    opacity: 0.8,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 28,
    padding: 24,
    width: "100%",
    shadowColor: "#7c2d12",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    marginBottom: 30,
    borderWidth: 1.5,
    borderColor: "#fef3c7",
  },
  cardHeader: {
    fontSize: 22,
    fontWeight: "800",
    color: "#7c2d12",
    textAlign: "center",
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: "#f5ebe0",
    marginVertical: 14,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  addressRow: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 4,
  },
  label: {
    fontSize: 13,
    color: "#78350f",
    opacity: 0.6,
    fontWeight: "600",
  },
  value: {
    fontSize: 15,
    fontWeight: "700",
    color: "#431407",
  },
  addressValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#431407",
    lineHeight: 20,
  },
  payoutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 6,
  },
  payoutLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: "#431407",
  },
  payoutValue: {
    fontSize: 26,
    fontWeight: "900",
    color: "#16a34a",
  },
  button: {
    height: 60,
    backgroundColor: "#16a34a",
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    shadowColor: "#16a34a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "850",
    color: "#ffffff",
  },
});
