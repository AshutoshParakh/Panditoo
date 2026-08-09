import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import RazorpayCheckout from "react-native-razorpay";
import { colors, shadow } from "../theme/homeTheme";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000/api";

export default function ConfirmBookingScreen({ route, navigation }) {
  const { i18n } = useTranslation();
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
  const [couponCode, setCouponCode] = useState("");
  const [quote, setQuote] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [automaticReferralCode, setAutomaticReferralCode] = useState("");

  // Get total price and calculate prepayment
  const totalPrice = Number(quote?.total_price ?? pooja?.base_price ?? 0);
  const prepaidAmount = Number(quote?.payable_now ?? (totalPrice * 0.3).toFixed(2));
  const remainingAmount = Number(quote?.remaining_amount ?? (totalPrice * 0.7).toFixed(2));
  const paymentPercent = Number(quote?.payment_percent || 30);

  useEffect(() => {
    const loadQuote = async () => {
      const authToken = await AsyncStorage.getItem("user-app-token");
      setToken(authToken);
      let savedReferral = "";
      if (authToken) {
        const profileResponse = await fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${authToken}` } });
        const profile = await profileResponse.json();
        savedReferral = profile?.user?.referral_eligible ? (profile?.user?.referral_code || "") : "";
      }
      const response = await fetch(`${API_URL}/pricing/quote`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({pooja_type_id:pooja?.id,booking_date:bookingDate,referral_code:savedReferral||undefined}) });
      const payload = await response.json();
      if (payload.success) { setQuote(payload.data); setAutomaticReferralCode(savedReferral); }
    };
    loadQuote().catch(()=>{});
  }, []);

  const applyCoupon = async () => { try { setCouponLoading(true); setPaymentError(""); const response=await fetch(`${API_URL}/pricing/quote`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pooja_type_id:pooja?.id,booking_date:bookingDate,coupon_code:couponCode.trim(),referral_code:automaticReferralCode||undefined})});const payload=await response.json();if(!response.ok||!payload.success)throw new Error(payload.message||"Invalid coupon");setQuote(payload.data);} catch(error){setPaymentError(error.message);} finally{setCouponLoading(false);} };

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
            coupon_code: quote?.coupon?.code || undefined,
            referral_code: quote?.referral?.code || undefined,
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
        console.log("[DUMMY PAYMENT] Auto-verifying test order:", razorpay_order.id);
        await verifyPayment(
          currentBooking.id,
          razorpay_order.id,
          `pay_stub_${Date.now()}`,
          "stub_signature"
        );
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

          if (RazorpayCheckout && typeof RazorpayCheckout.open === "function") {
            RazorpayCheckout.open(options)
              .then(async (data) => {
                await verifyPayment(
                  currentBooking.id,
                  data.razorpay_order_id || razorpay_order.id,
                  data.razorpay_payment_id,
                  data.razorpay_signature
                );
              })
              .catch((err) => {
                console.log("Razorpay checkout issue/cancellation:", err?.description || err?.message || err);
                const isCancelled = err?.code === 2 || String(err?.description || err?.message || "").toLowerCase().includes("cancel");
                setPaymentError(isCancelled ? "Payment was cancelled." : (err?.description || err?.message || "Payment failed. Please try again."));
                setLoading(false);
              });
          } else {
            throw new Error("Razorpay payment gateway is not available on this device/environment.");
          }
        } catch (checkoutErr) {
          console.warn("Razorpay checkout failed:", checkoutErr.message);
          setPaymentError(checkoutErr.message || "Payment service unavailable");
          setLoading(false);
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
      const authToken = token || await AsyncStorage.getItem("user-app-token");
      const headers = {
        "Content-Type": "application/json",
      };
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
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

  const hindi = currentLang === "hi";
  const formatMoney = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  const pandits = Array.isArray(selectedPandits) ? selectedPandits : [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>{hindi ? "अंतिम चरण" : "FINAL STEP"}</Text>
          <Text style={styles.pageTitle}>{hindi ? "अपनी बुकिंग जांचें" : "Review your booking"}</Text>
          <Text style={styles.pageSubtitle}>{hindi ? "भुगतान से पहले पूजा की जानकारी सुनिश्चित कर लें।" : "Please confirm the ceremony details before payment."}</Text>
        </View>

        <View style={styles.ceremonyCard}>
          <View style={styles.ceremonyTop}>
            <View style={styles.omBadge}><Text style={styles.om}>ॐ</Text></View>
            <View style={styles.ceremonyCopy}>
              <Text style={styles.cardLabel}>{hindi ? "चयनित पूजा" : "SELECTED CEREMONY"}</Text>
              <Text style={styles.poojaName}>{pooja?.name || (hindi ? "पूजा" : "Pooja")}</Text>
            </View>
            <View style={styles.readyBadge}><Text style={styles.readyText}>{hindi ? "तैयार" : "Ready"}</Text></View>
          </View>
          <View style={styles.rule} />
          <View style={styles.detailRow}>
            <View style={styles.detailMark}><Text style={styles.detailMarkText}>01</Text></View>
            <View style={styles.detailCopy}><Text style={styles.detailLabel}>{hindi ? "तारीख और समय" : "Date & time"}</Text><Text style={styles.detailValue}>{bookingDate || "—"}  ·  {bookingTime || "—"}</Text></View>
          </View>
          <View style={styles.detailRow}>
            <View style={styles.detailMark}><Text style={styles.detailMarkText}>02</Text></View>
            <View style={styles.detailCopy}><Text style={styles.detailLabel}>{hindi ? "पूजा स्थल" : "Ceremony location"}</Text><Text style={styles.detailValue} numberOfLines={3}>{address || (hindi ? "पता उपलब्ध नहीं" : "Address unavailable")}</Text></View>
          </View>
        </View>

        <View style={styles.sectionHeader}><View><Text style={styles.sectionTitle}>{hindi ? "पंडित प्राथमिकता" : "Pandit preference"}</Text><Text style={styles.sectionSubtitle}>{hindi ? "अनुरोध इन पंडितों को भेजा जाएगा" : "Your request will be shared with these pandits"}</Text></View><Text style={styles.sectionCount}>{pandits.length}</Text></View>
        <View style={styles.panditCard}>
          {pandits.length ? pandits.map((pandit, index) => (
            <View key={pandit.id || index} style={[styles.panditRow, index === pandits.length - 1 && styles.lastPanditRow]}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{String(pandit.name || "P").charAt(0).toUpperCase()}</Text></View>
              <View style={styles.panditCopy}><Text style={styles.panditName}>{pandit.name || "Pandit"}</Text><Text style={styles.panditMeta}>{hindi ? "सत्यापित पंडित" : "Verified pandit"}</Text></View>
              <Text style={styles.verified}>✓</Text>
            </View>
          )) : <View style={styles.openPreference}><Text style={styles.openPreferenceTitle}>{hindi ? "सभी उपलब्ध पंडित" : "Any available verified pandit"}</Text><Text style={styles.openPreferenceText}>{hindi ? "हम आपके समय के अनुसार उपयुक्त पंडित खोजेंगे।" : "We will find the best match for your selected time."}</Text></View>}
        </View>

        <View style={styles.sectionHeader}><View><Text style={styles.sectionTitle}>{hindi ? "भुगतान सारांश" : "Payment summary"}</Text><Text style={styles.sectionSubtitle}>{hindi ? "स्पष्ट और सुरक्षित भुगतान" : "Simple, transparent and secure"}</Text></View></View>
        {quote?.promotional_offer?<View style={styles.offerCard}><Text style={styles.offerTitle}>🎉 {quote.promotional_offer.title}</Text><Text style={styles.offerText}>{quote.promotional_offer.subtitle || "Special offer applied automatically"} · You save {formatMoney(quote.discount_amount)}. Full online payment applies.</Text></View>:null}
        {quote?.referral?<View style={styles.offerCard}><Text style={styles.offerTitle}>Referred by {quote.referral.name}</Text>{quote.discount_amount&&!quote.promotional_offer&&!quote.coupon?<Text style={styles.offerText}>First booking offer applied automatically · You save {formatMoney(quote.discount_amount)}</Text>:null}</View>:null}
        <View style={styles.couponCard}><Text style={styles.couponTitle}>Coupon code</Text><View style={styles.couponRow}><TextInput value={couponCode} onChangeText={(value)=>setCouponCode(value.toUpperCase())} autoCapitalize="characters" placeholder="ENTER COUPON" style={styles.couponInput}/><TouchableOpacity disabled={!couponCode.trim()||couponLoading} onPress={applyCoupon} style={styles.couponButton}>{couponLoading?<ActivityIndicator color="#FFF"/>:<Text style={styles.couponButtonText}>Apply</Text>}</TouchableOpacity></View>{quote?.coupon?<Text style={styles.couponSuccess}>✓ {quote.coupon.code} applied · You save {formatMoney(quote.discount_amount)}</Text>:null}</View>
        <View style={styles.paymentCard}>
          {quote?.festival_title?<Text style={styles.festivalBadge}>{quote.festival_title} special pricing</Text>:null}
          <View style={styles.priceRow}><Text style={styles.priceLabel}>{hindi ? "कुल पूजा शुल्क" : "Total ceremony fee"}</Text><View style={{alignItems:"flex-end"}}>{quote?.list_price>totalPrice?<Text style={styles.listPrice}>{formatMoney(quote.list_price)}</Text>:null}<Text style={styles.priceVal}>{formatMoney(totalPrice)}</Text></View></View>
          <View style={styles.paymentRule} />
          <View style={styles.payNowRow}>
            <View style={styles.payNowCopy}><View style={styles.prepaidTitleRow}><Text style={styles.prepaidLabel}>{hindi ? "अभी भुगतान करें" : "Pay now"}</Text><View style={styles.percentBadge}><Text style={styles.percentText}>{paymentPercent}%</Text></View></View><Text style={styles.prepaidNote}>{paymentPercent===100?"Full payment required for this date":(hindi ? "आपकी बुकिंग सुरक्षित करने के लिए" : "To secure your booking")}</Text></View>
            <Text style={styles.prepaidVal}>{formatMoney(prepaidAmount)}</Text>
          </View>
          <TouchableOpacity style={styles.balanceRow} activeOpacity={0.75} onPress={() => setShowTooltip((value) => !value)}>
            <View><Text style={styles.balanceLabel}>{hindi ? "सेवा के दिन देय शेष" : "Balance due on ceremony day"}</Text><Text style={styles.balanceNote}>{hindi ? "सीधे पंडित जी को" : "Paid directly to the pandit"}</Text></View>
            <View style={styles.balanceRight}><Text style={styles.balanceValue}>{formatMoney(remainingAmount)}</Text><Text style={styles.infoIcon}>i</Text></View>
          </TouchableOpacity>
          {showTooltip ? <View style={styles.tooltipBox}><Text style={styles.tooltipText}>{hindi ? `शेष 70% (${formatMoney(remainingAmount)}) पूजा संपन्न होने के दिन सीधे पंडित जी को देना होगा।` : `The remaining 70% (${formatMoney(remainingAmount)}) is paid directly to the pandit on the ceremony day.`}</Text></View> : null}
          <View style={styles.secureRow}>
            <View style={styles.secureIcon}><Text style={styles.secureIconText}>✓</Text></View>
            <View style={styles.secureCopy}><Text style={styles.secureTitle}>{hindi ? "सुरक्षित ऑनलाइन भुगतान" : "Secure online payment"}</Text><Text style={styles.secureText}>{hindi ? "आपकी भुगतान जानकारी एन्क्रिप्टेड है" : "Your payment information is encrypted and protected"}</Text></View>
          </View>
        </View>

        {paymentError ? <View style={styles.errorBox}><Text style={styles.errorTitle}>{hindi ? "भुगतान पूरा नहीं हुआ" : "Payment could not be completed"}</Text><Text style={styles.errorText}>{paymentError}</Text></View> : null}
        <Text style={styles.terms}>{hindi ? "आगे बढ़कर आप बुकिंग और रद्दीकरण की शर्तों से सहमत होते हैं।" : "By continuing, you agree to the booking and cancellation terms."}</Text>
        <View style={styles.scrollSpacer} />
      </ScrollView>
      <View style={styles.footer}>
        <View><Text style={styles.footerLabel}>{hindi ? "अभी देय" : "PAYABLE NOW"}</Text><Text style={styles.footerPrice}>{formatMoney(prepaidAmount)}</Text></View>
        <TouchableOpacity disabled={loading} style={[styles.payBtn, loading && styles.payBtnDisabled]} onPress={handlePayAndConfirm} activeOpacity={0.82}>
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <><Text style={styles.payBtnText}>{hindi ? "भुगतान करें" : "Pay & confirm"}</Text><Text style={styles.payArrow}>›</Text></>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F5F0" }, scrollContent: { paddingHorizontal: 18, paddingTop: 8 },
  intro: { paddingVertical: 12 }, eyebrow: { color: colors.primary, fontSize: 12, fontWeight: "800", letterSpacing: 1.5 }, pageTitle: { color: colors.ink, fontSize: 30, lineHeight: 36, fontWeight: "800", marginTop: 7 }, pageSubtitle: { color: colors.muted, fontSize: 15, lineHeight: 21, marginTop: 5 },
  ceremonyCard: { backgroundColor: "#FFFFFF", borderRadius: 18, borderWidth: 1, borderColor: "#E8DED5", marginTop: 10, padding: 16, ...shadow }, ceremonyTop: { flexDirection: "row", alignItems: "center" }, omBadge: { width: 48, height: 48, borderRadius: 13, backgroundColor: "#F1E6E1", alignItems: "center", justifyContent: "center" }, om: { color: colors.primary, fontSize: 23 }, ceremonyCopy: { flex: 1, marginLeft: 12 }, cardLabel: { color: colors.muted, fontSize: 8, fontWeight: "800", letterSpacing: 1.1 }, poojaName: { color: colors.ink, fontSize: 16, fontWeight: "800", marginTop: 3 }, readyBadge: { borderRadius: 10, backgroundColor: colors.greenSoft, paddingHorizontal: 9, paddingVertical: 5 }, readyText: { color: colors.green, fontSize: 9, fontWeight: "800" }, rule: { height: 1, backgroundColor: "#EFE7DF", marginVertical: 15 },
  detailRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 14 }, detailMark: { width: 26, height: 26, borderRadius: 8, backgroundColor: "#F3EEE9", alignItems: "center", justifyContent: "center" }, detailMarkText: { color: "#94877D", fontSize: 8, fontWeight: "800" }, detailCopy: { flex: 1, marginLeft: 11 }, detailLabel: { color: colors.muted, fontSize: 9, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 }, detailValue: { color: "#4A423C", fontSize: 12, lineHeight: 18, fontWeight: "700", marginTop: 3 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 27, marginBottom: 10 }, sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: "800" }, sectionSubtitle: { color: colors.muted, fontSize: 10, marginTop: 3 }, sectionCount: { minWidth: 28, height: 28, borderRadius: 14, backgroundColor: "#ECE4DD", color: "#756A62", fontSize: 10, fontWeight: "800", textAlign: "center", textAlignVertical: "center" },
  panditCard: { backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E8DED5", paddingHorizontal: 15 }, panditRow: { minHeight: 64, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#F0E9E3" }, lastPanditRow: { borderBottomWidth: 0 }, avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#EEE5DD", alignItems: "center", justifyContent: "center" }, avatarText: { color: colors.primary, fontSize: 13, fontWeight: "800" }, panditCopy: { flex: 1, marginLeft: 11 }, panditName: { color: colors.ink, fontSize: 12, fontWeight: "800" }, panditMeta: { color: colors.muted, fontSize: 9, marginTop: 3 }, verified: { width: 21, height: 21, borderRadius: 11, color: colors.green, backgroundColor: colors.greenSoft, textAlign: "center", textAlignVertical: "center", fontSize: 10, fontWeight: "800" }, openPreference: { paddingVertical: 17 }, openPreferenceTitle: { color: colors.ink, fontSize: 12, fontWeight: "800" }, openPreferenceText: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 4 },
  paymentCard: { backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E8DED5", padding: 16, ...shadow }, priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, priceLabel: { color: "#61574F", fontSize: 12, fontWeight: "600" }, priceVal: { color: colors.ink, fontSize: 16, fontWeight: "800" }, paymentRule: { height: 1, backgroundColor: "#EFE7E0", marginVertical: 15 }, payNowRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, payNowCopy: { flex: 1 }, prepaidTitleRow: { flexDirection: "row", alignItems: "center" }, prepaidLabel: { color: colors.primary, fontSize: 14, fontWeight: "800" }, percentBadge: { marginLeft: 7, backgroundColor: "#F2DFDC", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3 }, percentText: { color: colors.primary, fontSize: 8, fontWeight: "800" }, prepaidNote: { color: colors.muted, fontSize: 9, marginTop: 4 }, prepaidVal: { color: colors.primary, fontSize: 23, fontWeight: "800" },
  balanceRow: { marginTop: 15, padding: 12, borderRadius: 12, backgroundColor: "#F7F3EF", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, balanceLabel: { color: "#5B524B", fontSize: 10, fontWeight: "700" }, balanceNote: { color: colors.muted, fontSize: 8, marginTop: 3 }, balanceRight: { flexDirection: "row", alignItems: "center" }, balanceValue: { color: "#5B524B", fontSize: 12, fontWeight: "800" }, infoIcon: { width: 17, height: 17, borderRadius: 9, borderWidth: 1, borderColor: "#B7A99E", color: "#8C7E73", fontSize: 9, fontWeight: "800", textAlign: "center", textAlignVertical: "center", marginLeft: 7 }, tooltipBox: { backgroundColor: "#FBF5E8", borderRadius: 10, padding: 11, marginTop: 8 }, tooltipText: { color: "#77613F", fontSize: 9, lineHeight: 15 },
  secureRow: { marginTop: 15, flexDirection: "row", alignItems: "center" }, secureIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.greenSoft, alignItems: "center", justifyContent: "center" }, secureIconText: { color: colors.green, fontWeight: "800", fontSize: 11 }, secureCopy: { flex: 1, marginLeft: 10 }, secureTitle: { color: "#365E4B", fontSize: 10, fontWeight: "800" }, secureText: { color: "#73847B", fontSize: 8, marginTop: 2 },
  errorBox: { backgroundColor: "#FBEDEC", borderWidth: 1, borderColor: "#F1CDCA", borderRadius: 12, padding: 13, marginTop: 14 }, errorTitle: { color: "#993F3F", fontSize: 11, fontWeight: "800" }, errorText: { color: "#A65A57", fontSize: 9, lineHeight: 14, marginTop: 3 }, terms: { color: colors.muted, fontSize: 9, lineHeight: 14, textAlign: "center", marginTop: 18, paddingHorizontal: 22 }, scrollSpacer: { height: 100 },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, minHeight: 78, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#E6DCD3", paddingHorizontal: 18, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", ...shadow }, footerLabel: { color: colors.muted, fontSize: 8, fontWeight: "800", letterSpacing: 1 }, footerPrice: { color: colors.ink, fontSize: 20, fontWeight: "800", marginTop: 2 }, payBtn: { minWidth: 190, height: 50, borderRadius: 12, backgroundColor: colors.primary, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "center" }, payBtnDisabled: { opacity: 0.7 }, payBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" }, payArrow: { color: "#FFFFFF", fontSize: 23, marginLeft: 10, marginTop: -2 },
  offerCard:{backgroundColor:"#FFF1D0",borderWidth:1,borderColor:"#E3B84E",borderRadius:16,padding:14,marginBottom:10},offerTitle:{fontSize:13,fontWeight:"900",color:"#7B241C"},offerText:{fontSize:10,lineHeight:15,color:"#7A5920",marginTop:5},couponCard:{backgroundColor:"#FFF",borderWidth:1,borderColor:"#E8DED5",borderRadius:16,padding:14,marginBottom:10},couponTitle:{fontSize:11,fontWeight:"800",color:colors.ink},couponRow:{flexDirection:"row",gap:8,marginTop:9},couponInput:{flex:1,height:44,borderWidth:1,borderColor:"#DCCFC5",borderRadius:10,paddingHorizontal:12,fontWeight:"800",letterSpacing:1,color:colors.ink},couponButton:{width:88,height:44,borderRadius:10,backgroundColor:colors.primary,alignItems:"center",justifyContent:"center"},couponButtonText:{color:"#FFF",fontWeight:"800"},couponSuccess:{color:colors.green,fontSize:10,fontWeight:"800",marginTop:9},festivalBadge:{alignSelf:"flex-start",backgroundColor:"#FFF0CE",color:"#8B5D12",fontSize:9,fontWeight:"900",paddingHorizontal:9,paddingVertical:5,borderRadius:8,marginBottom:12},listPrice:{fontSize:11,color:colors.muted,textDecorationLine:"line-through"},
});
