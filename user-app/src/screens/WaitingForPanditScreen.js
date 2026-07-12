import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ActivityIndicator,
  Animated,
  TouchableOpacity,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000/api";

export default function WaitingForPanditScreen({ route, navigation }) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || "en";
  const { bookingId, poojaName } = route.params || {};

  const [notifiedCount, setNotifiedCount] = useState(1);
  const [token, setToken] = useState(null);

  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Fetch token & start polling
    let intervalId;
    AsyncStorage.getItem("user-app-token").then((savedToken) => {
      setToken(savedToken);
      pollBookingStatus(savedToken);
      intervalId = setInterval(() => pollBookingStatus(savedToken), 5000);
    });

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  const pollBookingStatus = async (authToken) => {
    if (!bookingId) return;

    try {
      const headers = {
        "Content-Type": "application/json",
      };
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      const res = await fetch(`${API_URL}/bookings/${bookingId}`, {
        method: "GET",
        headers,
      });

      const json = await res.json();
      if (res.ok && json.success && json.data) {
        const booking = json.data;
        setNotifiedCount(booking.notified_pandits_count || 1);

        if (booking.status === "confirmed") {
          navigation.replace("BookingConfirmed", {
            booking,
          });
        }
      }
    } catch (error) {
      console.warn("Polling error:", error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.animContainer}>
          <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]}>
            <Text style={styles.icon}>🕉️</Text>
          </Animated.View>
          <ActivityIndicator size="large" color="#d97706" style={styles.spinner} />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title}>
            {currentLang === "hi"
              ? "हम आपको आस-पास के पंडितों से जोड़ रहे हैं"
              : "Connecting with Pandits"}
          </Text>
          <Text style={styles.subtitle}>
            {currentLang === "hi"
              ? `कृपया प्रतीक्षा करें। हम ${poojaName || "पूजा"} के लिए पंडितों से संपर्क कर रहे हैं...`
              : `Connecting you with nearby pandits for ${poojaName || "pooja"}...`}
          </Text>
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.statsText}>
            {currentLang === "hi"
              ? `✓ ${notifiedCount} पंडितों को अनुरोध भेजा गया`
              : `✓ ${notifiedCount} pandits notified`}
          </Text>
        </View>

        {/* Demo simulator trigger */}
        <TouchableOpacity
          style={styles.demoBtn}
          onPress={async () => {
            // Let's call the backend to mark a pandit as interested and confirmed to test integration
            // We can search the database for a pandit to accept the booking.
            // But let's just trigger a navigation mock if needed.
            if (token && bookingId) {
              try {
                // Fetch nearby pandits to get a valid one
                const resPandits = await fetch(`${API_URL}/pandits/nearby?lat=28.6139&lng=77.2090&radius=15`);
                const jsonPandits = await resPandits.json();
                const pandit = jsonPandits.data?.[0];
                if (pandit) {
                  // We can hit the mock accept endpoint if available, or just mock navigations
                  console.log("Simulating accept with:", pandit.name);
                }
              } catch (e) {}
            }
            // Fallback navigation simulation
            navigation.replace("BookingConfirmed", {
              booking: {
                id: bookingId,
                pooja_type_id: "mock",
                name_en: poojaName,
                name_hi: poojaName,
                booking_date: "Tomorrow",
                booking_time: "09:00 AM",
                address: "Connaught Place, New Delhi",
                confirmed_pandit: {
                  name: "Pandit Rajesh Shastri",
                  phone: "9990004002",
                  rating: "4.9",
                },
              },
            });
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.demoBtnText}>Simulate Pandit Accept (Demo)</Text>
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
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
  },
  animContainer: {
    marginTop: 60,
    alignItems: "center",
    justifyContent: "center",
    height: 180,
    width: 180,
  },
  pulseCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#fffbeb",
    borderWidth: 2,
    borderColor: "#d97706",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    shadowColor: "#d97706",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  icon: {
    fontSize: 54,
  },
  spinner: {
    position: "absolute",
    bottom: 0,
  },
  textContainer: {
    alignItems: "center",
    gap: 12,
    marginTop: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#6a1b1a",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#5f4b3a",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  statsCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e3d5c5",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    shadowColor: "#6a1b1a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  statsText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#d97706",
  },
  demoBtn: {
    height: 48,
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#6a1b1a",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  demoBtnText: {
    color: "#6a1b1a",
    fontSize: 14,
    fontWeight: "700",
  },
});
