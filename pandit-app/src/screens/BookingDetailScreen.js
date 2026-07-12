import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  SafeAreaView,
  Platform,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000/api";

export default function BookingDetailScreen({ route, navigation }) {
  const { bookingId } = route.params;
  const { t, i18n } = useTranslation();
  const { token } = useAuth();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkedSamagri, setCheckedSamagri] = useState({});

  useEffect(() => {
    fetchBookingDetails();
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/bookings/pandit/bookings/${bookingId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBooking(data.data);
        await loadChecklist(bookingId);
      } else {
        Alert.alert(t("common.error"), data.message || "Failed to fetch details");
      }
    } catch (error) {
      console.error("Error fetching booking details:", error);
      Alert.alert(t("common.error"), "Could not load booking details");
    } finally {
      setLoading(false);
    }
  };

  const loadChecklist = async (id) => {
    try {
      const stored = await AsyncStorage.getItem(`samagri_checklist:${id}`);
      if (stored) {
        setCheckedSamagri(JSON.parse(stored));
      }
    } catch (err) {
      console.warn("Error loading checklist state:", err);
    }
  };

  const toggleSamagri = async (index) => {
    const newChecked = {
      ...checkedSamagri,
      [index]: !checkedSamagri[index],
    };
    setCheckedSamagri(newChecked);
    try {
      await AsyncStorage.setItem(
        `samagri_checklist:${bookingId}`,
        JSON.stringify(newChecked)
      );
    } catch (err) {
      console.warn("Error saving checklist state:", err);
    }
  };

  const handleCall = () => {
    if (!booking?.user_phone) return;
    Linking.openURL(`tel:${booking.user_phone}`).catch(() => {
      Alert.alert(t("common.error"), "Could not open dialer");
    });
  };

  const handleWhatsApp = () => {
    if (!booking?.user_phone) return;
    let cleanPhone = booking.user_phone.replace(/[^\d]/g, "");
    if (cleanPhone.length === 10) {
      cleanPhone = "91" + cleanPhone;
    }
    const isHindi = i18n.language === "hi";
    const poojaName = isHindi ? booking.pooja_name_hi : booking.pooja_name_en;
    const message = isHindi 
      ? `प्रणाम! मैं आपका पंडित जी बात कर रहा हूँ। ${poojaName} के संदर्भ में संपर्क किया है।`
      : `Pranam! I am your Pandit ji for the ${poojaName}. Contacting you regarding the arrangements.`;

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert(t("common.error"), "Could not open WhatsApp");
    });
  };

  const handleDirections = () => {
    if (!booking?.address) return;
    const address = booking.address;
    const url = Platform.select({
      ios: `maps:0,0?q=${encodeURIComponent(address)}`,
      android: `geo:0,0?q=${encodeURIComponent(address)}`,
    }) || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`);
    });
  };

  const handleMarkCompleted = async () => {
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
                method: "PATCH",
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });
              const data = await res.json();
              if (res.ok && data.success) {
                Alert.alert(t("common.success"), "Puja completed successfully!");
                setBooking({
                  ...booking,
                  booking_status: "completed",
                });
              } else {
                Alert.alert(t("common.error"), data.message || "Failed to complete puja");
              }
            } catch (err) {
              console.error("Error completing puja:", err);
              Alert.alert(t("common.error"), "Could not update status");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const isCompletionAllowed = () => {
    if (!booking) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const bookingDate = new Date(booking.booking_date);
    bookingDate.setHours(0, 0, 0, 0);
    return today >= bookingDate;
  };

  if (loading && !booking) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#ea580c" />
        <Text style={styles.loadingText}>{t("common.loading")}</Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Booking not found.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>{t("common.back")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isHindi = i18n.language === "hi";
  const isCompleted = booking.booking_status === "completed";
  const isConfirmed = booking.booking_status === "confirmed";

  // Samagri checklist parsing
  let samagriList = [];
  if (booking.samagri_list) {
    samagriList = typeof booking.samagri_list === "string" 
      ? JSON.parse(booking.samagri_list) 
      : booking.samagri_list;
  }

  // Format date and time
  const formattedDate = new Date(booking.booking_date).toLocaleDateString(isHindi ? "hi-IN" : "en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const formattedTime = booking.booking_time ? booking.booking_time.slice(0, 5) : "";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Block */}
        <View style={styles.headerBlock}>
          <View style={styles.titleRow}>
            <Text style={styles.poojaName}>
              {isHindi ? booking.pooja_name_hi : booking.pooja_name_en}
            </Text>
            <View style={[styles.statusBadge, isCompleted ? styles.badgeCompleted : styles.badgeUpcoming]}>
              <Text style={[styles.statusText, isCompleted ? styles.statusTextCompleted : styles.statusTextUpcoming]}>
                {isCompleted ? t("bookings.statusCompleted") : "Upcoming"}
              </Text>
            </View>
          </View>
          <Text style={styles.priceText}>₹{parseInt(booking.pandit_payout_amount)}</Text>
        </View>

        {/* Date and Time Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>📅 {t("requests.dateTime")}</Text>
          <Text style={styles.dateTimeText}>{formattedDate}</Text>
          <Text style={styles.timeText}>⏰ {formattedTime}</Text>
        </View>

        {/* Devotee Contact Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>👤 {t("requests.customer")}</Text>
          <Text style={styles.customerName}>{booking.user_name}</Text>
          <Text style={styles.customerPhone}>{booking.user_phone}</Text>

          {isConfirmed && (
            <View style={styles.contactRow}>
              <TouchableOpacity style={styles.callButton} onPress={handleCall}>
                <Text style={styles.buttonText}>📞 Call Devotee</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.whatsappButton} onPress={handleWhatsApp}>
                <Text style={styles.buttonText}>💬 WhatsApp</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Address and Map Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>📍 {t("requests.address")}</Text>
          <Text style={styles.addressText}>{booking.address}</Text>

          {booking.latitude && booking.longitude && (
            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: parseFloat(booking.latitude),
                  longitude: parseFloat(booking.longitude),
                  latitudeDelta: 0.0122,
                  longitudeDelta: 0.0121,
                }}
                scrollEnabled={false}
                zoomEnabled={false}
              >
                <Marker
                  coordinate={{
                    latitude: parseFloat(booking.latitude),
                    longitude: parseFloat(booking.longitude),
                  }}
                  title={isHindi ? booking.pooja_name_hi : booking.pooja_name_en}
                />
              </MapView>
            </View>
          )}

          <TouchableOpacity style={styles.directionsButton} onPress={handleDirections}>
            <Text style={styles.directionsText}>📍 {t("bookings.directions")}</Text>
          </TouchableOpacity>
        </View>

        {/* Samagri Checklist Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>📋 Samagri Checklist</Text>
          <Text style={styles.checklistSubtitle}>
            Interactive checklist for your reference:
          </Text>

          {samagriList.length === 0 ? (
            <Text style={styles.noSamagriText}>No samagri items listed for this Puja.</Text>
          ) : (
            samagriList.map((item, idx) => {
              const isChecked = !!checkedSamagri[idx];
              const broughtByUser = item.brought_by === "user";
              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.checklistRow, isChecked && styles.checklistRowChecked]}
                  onPress={() => toggleSamagri(idx)}
                >
                  <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                    {isChecked && <Text style={styles.checkboxTick}>✓</Text>}
                  </View>
                  <View style={styles.samagriDetails}>
                    <Text style={[styles.samagriName, isChecked && styles.samagriNameChecked]}>
                      {isHindi ? item.item_hi : item.item_en}
                    </Text>
                    <View style={[styles.broughtBadge, broughtByUser ? styles.broughtUser : styles.broughtPandit]}>
                      <Text style={styles.broughtText}>
                        {broughtByUser ? "Devotee brings" : "Pandit brings"}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Mark Completed Section */}
        {isConfirmed && (
          <View style={styles.completionContainer}>
            {isCompletionAllowed() ? (
              <TouchableOpacity style={styles.completeButton} onPress={handleMarkCompleted}>
                <Text style={styles.completeButtonText}>✓ {t("bookings.markCompleted")}</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.infoCard}>
                <Text style={styles.infoText}>
                  ⚠️ Completion button will be active on the scheduled puja date ({new Date(booking.booking_date).toLocaleDateString(isHindi ? "hi-IN" : "en-US", { day: "numeric", month: "short" })}).
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff7ed",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff7ed",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#78350f",
    fontWeight: "600",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff7ed",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#7c2d12",
    fontWeight: "700",
    marginBottom: 20,
  },
  backBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#7c2d12",
    borderRadius: 12,
  },
  backBtnText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  headerBlock: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: "#ffedd5",
    shadowColor: "#7c2d12",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  poojaName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#7c2d12",
    flex: 1,
  },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  badgeUpcoming: {
    backgroundColor: "#eff6ff",
  },
  badgeCompleted: {
    backgroundColor: "#d1fae5",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "800",
  },
  statusTextUpcoming: {
    color: "#1d4ed8",
  },
  statusTextCompleted: {
    color: "#065f46",
  },
  priceText: {
    fontSize: 24,
    fontWeight: "900",
    color: "#d97706",
    marginTop: 12,
  },
  sectionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: "#ffedd5",
    shadowColor: "#7c2d12",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#78350f",
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  dateTimeText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#431407",
  },
  timeText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ea580c",
    marginTop: 6,
  },
  customerName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#431407",
  },
  customerPhone: {
    fontSize: 15,
    fontWeight: "600",
    color: "#a1a1aa",
    marginTop: 2,
  },
  contactRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  callButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff7ed",
    borderWidth: 1.5,
    borderColor: "#fed7aa",
  },
  whatsappButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#d1fae5",
    borderWidth: 1.5,
    borderColor: "#a7f3d0",
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#431407",
  },
  addressText: {
    fontSize: 15,
    color: "#431407",
    fontWeight: "600",
    lineHeight: 22,
    marginBottom: 14,
  },
  mapContainer: {
    height: 180,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#ffedd5",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  directionsButton: {
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffedd5",
    borderWidth: 1.5,
    borderColor: "#fdba74",
  },
  directionsText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#d97706",
  },
  checklistSubtitle: {
    fontSize: 13,
    color: "#a1a1aa",
    fontWeight: "600",
    marginBottom: 16,
  },
  noSamagriText: {
    fontSize: 14,
    color: "#a1a1aa",
    fontStyle: "italic",
    textAlign: "center",
    marginVertical: 12,
  },
  checklistRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f5ebe0",
  },
  checklistRowChecked: {
    backgroundColor: "#fafaf9",
    opacity: 0.7,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#ea580c",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  checkboxChecked: {
    backgroundColor: "#ea580c",
    borderColor: "#ea580c",
  },
  checkboxTick: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
  },
  samagriDetails: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  samagriName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#431407",
    flex: 1,
  },
  samagriNameChecked: {
    textDecorationLine: "line-through",
    color: "#a1a1aa",
  },
  broughtBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  broughtUser: {
    backgroundColor: "#eff6ff",
  },
  broughtPandit: {
    backgroundColor: "#fff7ed",
  },
  broughtText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#78350f",
  },
  completionContainer: {
    marginTop: 10,
  },
  completeButton: {
    height: 54,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#10b981",
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
  },
  infoCard: {
    backgroundColor: "#fef3c7",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  infoText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#b45309",
    textAlign: "center",
    lineHeight: 18,
  },
});
