import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import { useIsFocused } from "@react-navigation/native";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000/api";

export default function BookingsScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || "en";
  const isFocused = useIsFocused();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [token, setToken] = useState(null);
  const [userId, setUserId] = useState(null);

  const getFallbackBookings = () => [
    {
      id: "b1",
      pooja_type_id: "mock-1",
      name_en: "Ganesha Pooja",
      name_hi: "गणेश पूजा",
      booking_date: "2026-07-15",
      booking_time: "10:00 AM",
      address: "Connaught Place, New Delhi",
      total_price: 2100,
      prepaid_status: "paid",
      status: "confirmed",
      confirmed_pandit: {
        name: "Pandit Rajesh Shastri",
        phone: "9990004002",
        rating: "4.9",
      },
    },
    {
      id: "b2",
      pooja_type_id: "mock-2",
      name_en: "Satyanarayan Katha",
      name_hi: "सत्यनारायण कथा",
      booking_date: "2026-07-09",
      booking_time: "02:00 PM",
      address: "Dwarka Sector 12, New Delhi",
      total_price: 3500,
      prepaid_status: "paid",
      status: "completed",
      confirmed_pandit: {
        name: "Pandit Sunil Dwivedi",
        phone: "9990004003",
        rating: "4.8",
      },
      has_rated: false, // Let user rate this experience!
    },
    {
      id: "b3",
      pooja_type_id: "mock-3",
      name_en: "Griha Pravesh Pooja",
      name_hi: "गृह प्रवेश पूजा",
      booking_date: "2026-07-22",
      booking_time: "08:30 AM",
      address: "Noida Sector 62, UP",
      total_price: 5100,
      prepaid_status: "pending",
      status: "pending",
    },
  ];

  const fetchBookings = async () => {
    setLoading(true);
    setError("");

    try {
      const savedToken = await AsyncStorage.getItem("user-app-token");
      const savedUserId = await AsyncStorage.getItem("user-id");
      setToken(savedToken);
      setUserId(savedUserId);

      if (!savedUserId || savedUserId.startsWith("mock-")) {
        setBookings(getFallbackBookings());
        setLoading(false);
        return;
      }

      const headers = {
        "Content-Type": "application/json",
      };
      if (savedToken) {
        headers["Authorization"] = `Bearer ${savedToken}`;
      }

      const res = await fetch(`${API_URL}/bookings/user/${savedUserId}`, {
        method: "GET",
        headers,
      });

      const json = await res.json();
      if (res.ok && json.success) {
        // Sort bookings by date descending
        const sorted = (json.data || []).sort(
          (a, b) => new Date(b.booking_date) - new Date(a.booking_date)
        );
        setBookings(sorted);
      } else {
        setBookings(getFallbackBookings());
      }
    } catch (err) {
      console.warn("Fetch bookings error:", err.message);
      setBookings(getFallbackBookings());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      fetchBookings();
    }
  }, [isFocused]);

  const handleBookingTap = (booking) => {
    if (booking.status === "completed") {
      // Navigate to rating screen
      navigation.navigate("RateExperience", { booking });
    } else if (booking.status === "confirmed") {
      navigation.navigate("BookingConfirmed", { booking });
    } else if (booking.status === "pending") {
      // If payment is unpaid, navigate to ConfirmBooking, otherwise WaitingForPandit
      if (booking.prepaid_status === "paid") {
        navigation.navigate("WaitingForPandit", {
          bookingId: booking.id,
          poojaName: currentLang === "hi" ? booking.name_hi : booking.name_en,
        });
      } else {
        navigation.navigate("ConfirmBooking", {
          pooja: {
            id: booking.pooja_type_id,
            name: currentLang === "hi" ? booking.name_hi : booking.name_en,
            base_price: booking.total_price,
          },
          bookingDate: booking.booking_date,
          bookingTime: booking.booking_time,
          address: booking.address,
        });
      }
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "confirmed":
        return { badge: styles.successBadge, text: styles.successText, label: currentLang === "hi" ? "पक्की हो गई" : "Confirmed" };
      case "completed":
        return { badge: styles.completedBadge, text: styles.completedText, label: currentLang === "hi" ? "पूर्ण" : "Completed" };
      case "cancelled":
        return { badge: styles.cancelledBadge, text: styles.cancelledText, label: currentLang === "hi" ? "रद्द" : "Cancelled" };
      case "expired":
        return { badge: styles.expiredBadge, text: styles.expiredText, label: currentLang === "hi" ? "समाप्त" : "Expired" };
      default:
        return { badge: styles.pendingBadge, text: styles.pendingText, label: currentLang === "hi" ? "लंबित" : "Pending" };
    }
  };

  const renderBookingItem = ({ item }) => {
    const poojaName = currentLang === "hi" ? (item.name_hi || item.name_en) : item.name_en;
    const statusInfo = getStatusStyle(item.status);
    const dateObj = new Date(item.booking_date);
    const formattedDate = dateObj.toLocaleDateString(currentLang === "hi" ? "hi-IN" : "en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleBookingTap(item)}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.title}>{poojaName}</Text>
          <View style={[styles.statusBadge, statusInfo.badge]}>
            <Text style={[styles.statusText, statusInfo.text]}>{statusInfo.label}</Text>
          </View>
        </View>

        <View style={styles.details}>
          <Text style={styles.detailRow}>📅 {formattedDate} at {item.booking_time}</Text>
          {item.confirmed_pandit?.name && (
            <Text style={styles.detailRow}>👤 {item.confirmed_pandit.name}</Text>
          )}
          <Text style={styles.detailRow}>💰 ₹{item.total_price}</Text>
        </View>

        {item.status === "completed" && (
          <View style={styles.ratePromptContainer}>
            <Text style={styles.ratePromptText}>
              ⭐ {currentLang === "hi" ? "अपना अनुभव रेट करें" : "Rate Your Experience"}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d97706" />
        <Text style={styles.loadingText}>
          {currentLang === "hi" ? "बुकिंग लोड हो रही है..." : "Loading bookings..."}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        renderItem={renderBookingItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📿</Text>
            <Text style={styles.emptyText}>
              {currentLang === "hi" ? "कोई बुकिंग नहीं मिली" : "No bookings found yet"}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7efe5",
  },
  listContent: {
    padding: 20,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e3d5c5",
    shadowColor: "#6a1b1a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#6a1b1a",
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  pendingBadge: {
    backgroundColor: "#fffbeb",
  },
  successBadge: {
    backgroundColor: "#ecfdf5",
  },
  completedBadge: {
    backgroundColor: "#eff6ff",
  },
  cancelledBadge: {
    backgroundColor: "#fef2f2",
  },
  expiredBadge: {
    backgroundColor: "#f3f4f6",
  },
  statusText: {
    fontSize: 13,
    fontWeight: "700",
  },
  pendingText: {
    color: "#b45309",
  },
  successText: {
    color: "#047857",
  },
  completedText: {
    color: "#1d4ed8",
  },
  cancelledText: {
    color: "#b91c1c",
  },
  expiredText: {
    color: "#4b5563",
  },
  details: {
    gap: 6,
  },
  detailRow: {
    fontSize: 14,
    color: "#5f4b3a",
    fontWeight: "600",
  },
  ratePromptContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f7efe5",
    alignItems: "flex-end",
  },
  ratePromptText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#d97706",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#f7efe5",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: "#5f4b3a",
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 54,
  },
  emptyText: {
    fontSize: 16,
    color: "#a08f80",
    fontWeight: "600",
    textAlign: "center",
  },
});
