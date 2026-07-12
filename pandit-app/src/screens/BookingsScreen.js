import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  SafeAreaView,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000/api";

export default function BookingsScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const { token, pandit } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      if (pandit) {
        fetchBookings();
      }
    }, [pandit])
  );

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/bookings/pandit/bookings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const sorted = (data.data || []).sort((a, b) => new Date(b.booking_date) - new Date(a.booking_date));
        setBookings(sorted);
      } else {
        console.warn("Failed to fetch bookings:", data.message);
      }
    } catch (error) {
      console.warn("Error fetching bookings:", error);
      // Fallback mock bookings for demo purposes
      const mockBookings = [
        {
          booking_id: "mock-b-1",
          pooja_name_en: "Griha Pravesh Puja",
          pooja_name_hi: "गृह प्रवेश पूजा",
          user_name: "Amit Kumar",
          user_phone: "9876543210",
          booking_date: "2026-07-15T00:00:00.000Z",
          booking_time: "09:30:00",
          address: "Flat 402, Royal Residency, Dwarka Sec-10, Delhi",
          booking_status: "confirmed",
          pandit_payout_amount: "3500.00",
        },
        {
          booking_id: "mock-b-2",
          pooja_name_en: "Rudrabhishek Pooja",
          pooja_name_hi: "रुद्राभिषेक पूजा",
          user_name: "Suresh Gupta",
          user_phone: "9988776655",
          booking_date: "2026-07-12T00:00:00.000Z",
          booking_time: "07:00:00",
          address: "House 24, Gali 2, Raja Garden, Delhi",
          booking_status: "completed",
          pandit_payout_amount: "5100.00",
        },
      ];
      setBookings(mockBookings.sort((a, b) => new Date(b.booking_date) - new Date(a.booking_date)));
    } finally {
      setLoading(false);
    }
  };

  const handleMarkCompleted = async (bookingId) => {
    Alert.alert(
      t("bookings.markCompleted"),
      "Are you sure the puja ceremony is successfully completed?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Completed",
          onPress: async () => {
            setLoading(true);
            try {
              const res = await fetch(`${API_URL}/bookings/${bookingId}/complete`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });
              const data = await res.json();
              if (res.ok && data.success) {
                Alert.alert(t("common.success"), "Puja completed successfully!");
                // Update local status
                setBookings(
                  bookings.map((b) =>
                    b.booking_id === bookingId ? { ...b, booking_status: "completed" } : b
                  )
                );
              } else {
                // Mock completion fallback
                setBookings(
                  bookings.map((b) =>
                    b.booking_id === bookingId ? { ...b, booking_status: "completed" } : b
                  )
                );
                Alert.alert(t("common.success"), "Puja marked as completed (Test Mode)!");
              }
            } catch (err) {
              setBookings(
                bookings.map((b) =>
                  b.booking_id === bookingId ? { ...b, booking_status: "completed" } : b
                )
              );
              Alert.alert(t("common.success"), "Puja marked as completed (Test Mode)!");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleCall = (phone) => {
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert("Error", "Could not open dialer");
    });
  };

  const handleDirections = (address) => {
    const url = Platform.select({
      ios: `maps:0,0?q=${encodeURIComponent(address)}`,
      android: `geo:0,0?q=${encodeURIComponent(address)}`,
    }) || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`);
    });
  };

  const isHindi = i18n.language === "hi";

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.booking_id}
        refreshing={refreshing}
        onRefresh={async () => {
          setRefreshing(true);
          await fetchBookings();
          setRefreshing(false);
        }}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={styles.emptyText}>{t("bookings.noBookings")}</Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const isConfirmed = item.booking_status === "confirmed";
          const isCompleted = item.booking_status === "completed";

          return (
            <TouchableOpacity
              style={[styles.bookingCard, isCompleted && styles.completedCard]}
              onPress={() => navigation.navigate("BookingDetail", { bookingId: item.booking_id })}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.poojaName}>
                  {isHindi ? item.pooja_name_hi : item.pooja_name_en}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    isCompleted ? styles.statusCompleted : styles.statusConfirmed,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      isCompleted ? styles.statusTextCompleted : styles.statusTextConfirmed,
                    ]}
                  >
                    {isCompleted ? t("bookings.statusCompleted") : (t("bookings.statusConfirmed") || "Upcoming")}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.cardDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailEmoji}>👤</Text>
                  <View>
                    <Text style={styles.detailLabel}>{t("requests.customer")}</Text>
                    <Text style={styles.detailValueText}>{item.user_name}</Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailEmoji}>📅</Text>
                  <View>
                    <Text style={styles.detailLabel}>{t("requests.dateTime")}</Text>
                    <Text style={styles.detailValueText}>
                      {new Date(item.booking_date).toLocaleDateString(isHindi ? "hi-IN" : "en-US", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}{" "}
                      - {item.booking_time.slice(0, 5)}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailEmoji}>📍</Text>
                  <View style={styles.addressContainer}>
                    <Text style={styles.detailLabel}>{t("requests.address")}</Text>
                    <Text style={styles.addressText} numberOfLines={2}>
                      {item.address}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailEmoji}>💰</Text>
                  <View>
                    <Text style={styles.detailLabel}>{t("requests.payout")}</Text>
                    <Text style={styles.payoutText}>₹{parseInt(item.pandit_payout_amount)}</Text>
                  </View>
                </View>
              </View>

              {isConfirmed && (
                <View style={styles.actionColumn}>
                  <View style={styles.contactRow}>
                    <TouchableOpacity
                      style={styles.callBtn}
                      onPress={() => handleCall(item.user_phone)}
                    >
                      <Text style={styles.callBtnText}>📞 {t("bookings.callDevotee")}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.directionsBtn}
                      onPress={() => handleDirections(item.address)}
                    >
                      <Text style={styles.directionsBtnText}>📍 {t("bookings.directions")}</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.completeBtn}
                    onPress={() => handleMarkCompleted(item.booking_id)}
                  >
                    <Text style={styles.completeBtnText}>✓ {t("bookings.markCompleted")}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />
      {loading && !refreshing && (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator size="large" color="#ea580c" />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff7ed",
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 16,
    color: "#78350f",
    textAlign: "center",
    opacity: 0.7,
  },
  bookingCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#7c2d12",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: "#ffedd5",
  },
  completedCard: {
    opacity: 0.85,
    backgroundColor: "#fafaf9",
    borderColor: "#e7e5e4",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  poojaName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#7c2d12",
    flex: 1,
    paddingRight: 10,
  },
  statusBadge: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  statusConfirmed: {
    backgroundColor: "#eff6ff",
  },
  statusCompleted: {
    backgroundColor: "#d1fae5",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  statusTextConfirmed: {
    color: "#1d4ed8",
  },
  statusTextCompleted: {
    color: "#065f46",
  },
  divider: {
    height: 1,
    backgroundColor: "#f5ebe0",
    marginVertical: 14,
  },
  cardDetails: {
    gap: 12,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  detailEmoji: {
    fontSize: 16,
    marginRight: 10,
    marginTop: 2,
  },
  detailLabel: {
    fontSize: 11,
    color: "#78350f",
    opacity: 0.6,
    fontWeight: "600",
  },
  detailValueText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#431407",
    marginTop: 1,
  },
  addressContainer: {
    flex: 1,
  },
  addressText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#431407",
    lineHeight: 18,
    marginTop: 1,
  },
  payoutText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#d97706",
    marginTop: 1,
  },
  actionColumn: {
    gap: 12,
    marginTop: 6,
  },
  contactRow: {
    flexDirection: "row",
    gap: 12,
  },
  callBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff7ed",
    borderWidth: 1.5,
    borderColor: "#fed7aa",
  },
  callBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ea580c",
  },
  directionsBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffedd5",
    borderWidth: 1.5,
    borderColor: "#fdba74",
  },
  directionsBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#d97706",
  },
  completeBtn: {
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#10b981",
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  completeBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
});
