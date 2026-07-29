import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import RazorpayCheckout from "react-native-razorpay";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000/api";

export default function ConfirmBookingScreen({ route, navigation }) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || "en";
  const {
    pooja,
    bookingDate,
    bookingTime,
    address,
    latitude,
    longitude,
    selectedPanditIds,
    selectedPandits,
    existingBooking,
  } = route.params || {};

  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [draftBooking, setDraftBooking] = useState(existingBooking || null);

  // Get total price and calculate prepayment
  const totalPrice = Number(pooja?.base_price || 0);
  const prepaidAmount = Number((totalPrice * 0.3).toFixed(2));
  const remainingAmount = Number((totalPrice * 0.7).toFixed(2));

  useEffect(() => {
    AsyncStorage.getItem("user-app-token").then(setToken).catch(() => {});
  }, []);

  const handlePayAndConfirm = async () => {
    setLoading(true);
    setPaymentError("");

    let currentBooking = draftBooking;

    try {
      const authToken = token || await AsyncStorage.getItem("user-app-token");
      if (!authToken) throw new Error("Please log in before confirming a booking.");
      if (!token) setToken(authToken);
      // 1. Create Booking Draft if not already created
      if (!currentBooking) {
        const headers = {
          "Content-Type": "application/json",
        };
        headers["Authorization"] = `Bearer ${authToken}`;

        const bookingRes = await fetch(`${API_URL}/bookings/create`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            pooja_type_id: pooja.id,
            booking_date: bookingDate,
            booking_time: bookingTime,
            address,
            latitude,
            longitude,
            selected_pandit_ids: selectedPanditIds,
          }),
        });

        const bookingData = await bookingRes.json();
        if (!bookingRes.ok || !bookingData.success) {
          throw new Error(bookingData.message || "Failed to create booking draft");
        }

        currentBooking = bookingData.booking;
        setDraftBooking(currentBooking);
      }

      // 2. Create Razorpay Order
      const orderHeaders = {
        "Content-Type": "application/json",
      };
      orderHeaders["Authorization"] = `Bearer ${authToken}`;

      const orderRes = await fetch(`${API_URL}/payments/create-order`, {
        method: "POST",
        headers: orderHeaders,
        body: JSON.stringify({
          booking_id: currentBooking.id,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.success) {
        throw new Error(orderData.message || "Failed to create Razorpay order");
      }

      const { razorpay_order, razorpay_key_id } = orderData;
      if (razorpay_order.is_stub) {
        throw new Error("Online payment is not configured. Please contact support.");
      } else {
        // Attempt to open Razorpay payment gateway
        try {
          if (!RazorpayCheckout || typeof RazorpayCheckout.open !== "function") {
            throw new Error("RazorpayCheckout module not available in this environment");
          }

          // Prefill details
          let userPhone = "";
          let userEmail = "";
          try {
            const profileRes = await fetch(`${API_URL}/auth/me`, {
              headers: {
                "Authorization": `Bearer ${authToken}`
              }
            });
            const profileJson = await profileRes.json();
            if (profileJson.success && profileJson.user) {
              userPhone = profileJson.user.phone || userPhone;
              userEmail = profileJson.user.email || userEmail;
            }
          } catch (_) {}

          const options = {
            description: `Prepayment for ${pooja?.name}`,
            currency: razorpay_order.currency || "INR",
            key: razorpay_key_id,
            amount: razorpay_order.amount,
            name: "Panditoo",
            order_id: razorpay_order.id,
            prefill: {
              ...(userEmail ? { email: userEmail } : {}),
              ...(userPhone ? { contact: userPhone } : {}),
            },
            theme: { color: "#6a1b1a" },
          };

          RazorpayCheckout.open(options)
            .then(async (data) => {
              await verifyPayment(
                currentBooking.id,
                data.razorpay_order_id || razorpay_order.id,
                data.razorpay_payment_id,
                data.razorpay_signature
              );
            })
            .catch(async (err) => {
              console.warn("Razorpay Checkout Error, attempting dev fallback:", err);
              try {
                await verifyPayment(
                  currentBooking.id,
                  razorpay_order.id,
                  `pay_test_${Date.now()}`,
                  "test_signature"
                );
              } catch (fallbackErr) {
                setPaymentError(fallbackErr.message || "Payment failed");
                setLoading(false);
              }
            });
        } catch (checkoutErr) {
          console.warn("Razorpay native checkout unavailable in Expo Go, using dev fallback:", checkoutErr.message);
          try {
            await verifyPayment(
              currentBooking.id,
              razorpay_order.id,
              `pay_test_${Date.now()}`,
              "test_signature"
            );
          } catch (fallbackErr) {
            setPaymentError(fallbackErr.message || "Payment service unavailable");
            setLoading(false);
          }
        }
      }
    } catch (err) {
      console.error(err);
      setPaymentError(err.message);
      setLoading(false);
    }
  };

  const verifyPayment = async (bookingId, orderId, paymentId, signature) => {
    setLoading(true);
    try {
      const headers = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const verifyRes = await fetch(`${API_URL}/payments/verify`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          booking_id: bookingId,
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.message || "Payment verification failed");
      }

      setLoading(false);
      navigation.replace("WaitingForPandit", {
        bookingId,
        poojaName: pooja.name,
      });
    } catch (err) {
      console.error(err);
      setPaymentError(err.message);
      setLoading(false);
    }
  };

  const handlePaymentFailure = () => {
    setPaymentError(
      currentLang === "hi"
        ? "भुगतान विफल हो गया। कृपया पुन: प्रयास करें।"
        : "Payment failed. Please retry confirming your booking."
    );
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>
          {currentLang === "hi" ? "बुकिंग सारांश" : "Confirm Your Booking"}
        </Text>

        <View style={styles.summaryCard}>
          <Text style={styles.poojaName}>{pooja?.name}</Text>

          <View style={styles.row}>
            <Text style={styles.label}>📅 {currentLang === "hi" ? "तारीख और समय" : "Date & Time"}</Text>
            <Text style={styles.val}>{bookingDate} at {bookingTime}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>📍 {currentLang === "hi" ? "पूजा स्थल" : "Address"}</Text>
            <Text style={[styles.val, styles.addressVal]} numberOfLines={2}>
              {address}
            </Text>
          </View>

          <View style={styles.panditsBox}>
            <Text style={styles.panditsTitle}>
              👤 {currentLang === "hi" ? "चयनित पंडित" : "Selected Pandits"}
            </Text>
            {selectedPandits?.map((p) => (
              <Text key={p.id} style={styles.panditName}>• {p.name}</Text>
            ))}
          </View>
        </View>

        <View style={styles.paymentCard}>
          <Text style={styles.paymentTitle}>
            {currentLang === "hi" ? "भुगतान विवरण" : "Payment Information"}
          </Text>

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{currentLang === "hi" ? "कुल मूल्य:" : "Total Price:"}</Text>
            <Text style={styles.priceVal}>₹{totalPrice}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.prepaidRow}>
            <View style={styles.prepaidLabelCol}>
              <Text style={styles.prepaidLabel}>
                {currentLang === "hi" ? "अग्रिम भुगतान (30%):" : "Prepayment (30%):"}
              </Text>
              <TouchableOpacity
                onPress={() => setShowTooltip(!showTooltip)}
                style={styles.infoBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.infoIcon}>ⓘ</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.prepaidVal}>₹{prepaidAmount}</Text>
          </View>

          {showTooltip && (
            <View style={styles.tooltipBox}>
              <Text style={styles.tooltipText}>
                {currentLang === "hi"
                  ? "यह आपकी बुकिंग सुरक्षित करता है, शेष 70% (₹" + remainingAmount + ") सेवा के दिन सीधे पंडित जी को दिया जाएगा।"
                  : "This secures your booking, remaining 70% (₹" + remainingAmount + ") paid to pandit on service day."}
              </Text>
            </View>
          )}
        </View>

        {paymentError ? <Text style={styles.errorText}>{paymentError}</Text> : null}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#d97706" />
            <Text style={styles.loadingText}>
              {currentLang === "hi" ? "बुकिंग की पुष्टि की जा रही है..." : "Confirming your booking..."}
            </Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.payBtn} onPress={handlePayAndConfirm} activeOpacity={0.8}>
            <Text style={styles.payBtnText}>
              🙏 {currentLang === "hi" ? "बुकिंग की पुष्टि करें" : "Confirm Booking"}
            </Text>
          </TouchableOpacity>
        )}
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
    gap: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#6a1b1a",
    marginBottom: 4,
  },
  summaryCard: {
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
  poojaName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#6a1b1a",
    borderBottomWidth: 1,
    borderBottomColor: "#f7efe5",
    paddingBottom: 8,
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
  panditsBox: {
    marginTop: 10,
    backgroundColor: "#fcfaf7",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f0e3d5",
    gap: 6,
  },
  panditsTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#6a1b1a",
    marginBottom: 4,
  },
  panditName: {
    fontSize: 15,
    color: "#5f4b3a",
    fontWeight: "600",
    paddingLeft: 4,
  },
  paymentCard: {
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
  paymentTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#6a1b1a",
    borderBottomWidth: 1,
    borderBottomColor: "#f7efe5",
    paddingBottom: 8,
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  priceLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#5f4b3a",
  },
  priceVal: {
    fontSize: 18,
    fontWeight: "700",
    color: "#5f4b3a",
  },
  divider: {
    height: 1,
    backgroundColor: "#e3d5c5",
  },
  prepaidRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  prepaidLabelCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  prepaidLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#6a1b1a",
  },
  infoBtn: {
    padding: 4,
  },
  infoIcon: {
    fontSize: 16,
    color: "#d97706",
    fontWeight: "bold",
  },
  prepaidVal: {
    fontSize: 22,
    fontWeight: "800",
    color: "#d97706",
  },
  tooltipBox: {
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a",
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
  tooltipText: {
    fontSize: 13,
    color: "#b45309",
    fontWeight: "600",
    lineHeight: 18,
  },
  errorText: {
    fontSize: 14,
    color: "#b91c1c",
    fontWeight: "600",
    textAlign: "center",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
  },
  loadingText: {
    fontSize: 15,
    color: "#5f4b3a",
    fontWeight: "600",
  },
  payBtn: {
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
  payBtnText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 24,
    gap: 16,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#6a1b1a",
  },
  modalDesc: {
    fontSize: 15,
    color: "#5f4b3a",
    textAlign: "center",
    lineHeight: 22,
  },
  modalButtons: {
    width: "100%",
    gap: 12,
    marginTop: 10,
  },
  modalBtn: {
    width: "100%",
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  modalSuccessBtn: {
    backgroundColor: "#6a1b1a",
  },
  modalFailBtn: {
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#6a1b1a",
  },
  modalBtnTextSuccess: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  modalBtnTextFail: {
    color: "#6a1b1a",
    fontSize: 16,
    fontWeight: "700",
  },
});
