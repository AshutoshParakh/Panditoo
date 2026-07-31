import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import { colors, shadow } from "../theme/homeTheme";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000/api";

export default function BookingConfirmedScreen({ route, navigation }) {
  const { i18n } = useTranslation();
  const hindi = i18n.language === "hi";
  const initialBooking = route.params?.booking;
  const [booking, setBooking] = useState(initialBooking);

  useEffect(() => {
    let active = true;
    if (!initialBooking?.id) return () => { active = false; };
    const refreshBooking = () => AsyncStorage.getItem("user-app-token").then(async (token) => {
      if (!token) return;
      const response = await fetch(`${API_URL}/bookings/${initialBooking.id}`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await response.json();
      if (active && response.ok && json.success) setBooking(json.data);
    }).catch(() => {});
    refreshBooking();
    const timer = setInterval(refreshBooking, 5000);
    return () => { active = false; clearInterval(timer); };
  }, [initialBooking?.id]);

  const goHome = () => navigation.reset({ index: 0, routes: [{ name: "Main" }] });

  const poojaName = hindi ? booking?.name_hi || booking?.pooja?.name_hi || booking?.name_en || "पूजा" : booking?.name_en || booking?.pooja?.name_en || booking?.name_hi || "Pooja";
  const pandit = booking?.confirmed_pandit || {};
  const reference = String(booking?.id || "").slice(0, 8).toUpperCase();
  const date = booking?.booking_date ? new Date(booking.booking_date).toLocaleDateString(hindi ? "hi-IN" : "en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  return (
    <SafeAreaView style={s.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {booking?.service_otp ? <ServiceOtpBanner otp={booking.service_otp} hindi={hindi} /> : null}
        <View style={s.successHero}>
          <View style={s.successRing}><View style={s.successCircle}><Text style={s.check}>✓</Text></View></View>
          <Text style={s.eyebrow}>{hindi ? "बुकिंग पक्की हुई" : "BOOKING CONFIRMED"}</Text>
          <Text style={s.title}>{hindi ? "आपकी पूजा निश्चित है" : "Your ceremony is confirmed"}</Text>
          <Text style={s.subtitle}>{hindi ? "पंडित जी ने आपका अनुरोध स्वीकार कर लिया है।" : "A verified pandit has accepted your request."}</Text>
          {reference ? <View style={s.referenceBadge}><Text style={s.referenceLabel}>{hindi ? "बुकिंग आईडी" : "BOOKING ID"}</Text><Text style={s.reference}>#{reference}</Text></View> : null}
        </View>

        <Text style={s.sectionLabel}>{hindi ? "आपके पंडित" : "YOUR PANDIT"}</Text>
        <View style={s.panditCard}>
          <View style={s.panditTop}><View style={s.avatar}><Text style={s.avatarText}>{String(pandit.name || "P").charAt(0).toUpperCase()}</Text></View><View style={s.panditCopy}><View style={s.nameRow}><Text style={s.panditName}>{pandit.name || (hindi ? "पंडित विवरण जल्द उपलब्ध होगा" : "Pandit details coming soon")}</Text><Text style={s.verified}>✓</Text></View><Text style={s.panditMeta}>{hindi ? "सत्यापित सेवा प्रदाता" : "Verified service professional"}</Text>{pandit.rating != null ? <Text style={s.rating}>★ {Number(pandit.rating).toFixed(1)}</Text> : null}</View></View>
          <View style={s.privacyNote}><Text style={s.privacyMark}>✓</Text><Text style={s.privacyText}>{hindi ? "संपर्क और समन्वय Panditoo के माध्यम से सुरक्षित रूप से प्रबंधित होगा।" : "Contact and coordination are securely managed through Panditoo."}</Text></View>
        </View>

        <Text style={s.sectionLabel}>{hindi ? "पूजा विवरण" : "CEREMONY DETAILS"}</Text>
        <View style={s.detailsCard}>
          <View style={s.ceremonyHeader}><View style={s.omBox}><Text style={s.om}>ॐ</Text></View><View style={s.ceremonyCopy}><Text style={s.detailHint}>{hindi ? "चयनित पूजा" : "CEREMONY"}</Text><Text style={s.ceremonyName}>{poojaName}</Text></View><View style={s.status}><Text style={s.statusText}>{hindi ? "पुष्ट" : "Confirmed"}</Text></View></View>
          <View style={s.rule} />
          <Detail index="01" label={hindi ? "तारीख" : "Date"} value={date} />
          <Detail index="02" label={hindi ? "समय" : "Time"} value={booking?.booking_time || "—"} />
          <Detail index="03" label={hindi ? "पूजा स्थल" : "Location"} value={booking?.address || "—"} last />
        </View>

        <View style={s.reminder}><Text style={s.reminderMark}>i</Text><View style={s.reminderCopy}><Text style={s.reminderTitle}>{hindi ? "पूजा से पहले" : "Before the ceremony"}</Text><Text style={s.reminderText}>{hindi ? "आवश्यक सामग्री तैयार रखें। जरूरत होने पर पंडित जी से संपर्क करें।" : "Keep the required materials ready. Contact your pandit if you need any guidance."}</Text></View></View>
        <TouchableOpacity style={s.homeButton} onPress={goHome} activeOpacity={0.8}><Text style={s.homeText}>{hindi ? "मेरी बुकिंग देखें" : "View my bookings"}</Text><Text style={s.homeArrow}>›</Text></TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const Detail = ({ index, label, value, last }) => <View style={[s.detailRow, last && s.lastDetail]}><View style={s.index}><Text style={s.indexText}>{index}</Text></View><Text style={s.detailLabel}>{label}</Text><Text numberOfLines={3} style={s.detailValue}>{value}</Text></View>;

const ServiceOtpBanner = ({ otp, hindi }) => {
  const [secondsLeft, setSecondsLeft] = useState(() => Math.max(0, Math.ceil((new Date(otp.expires_at).getTime() - Date.now()) / 1000)));
  useEffect(() => {
    const update = () => setSecondsLeft(Math.max(0, Math.ceil((new Date(otp.expires_at).getTime() - Date.now()) / 1000)));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [otp.expires_at]);
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = String(secondsLeft % 60).padStart(2, "0");
  return <View style={s.otpCard}><View style={s.otpLiveBadge}><Text style={s.otpLiveText}>OTP READY</Text></View><Text style={s.otpLabel}>{otp.phase === "start" ? "START POOJA" : "COMPLETE POOJA"}</Text><Text selectable style={s.otpCode}>{otp.code}</Text><Text style={s.otpTimer}>{secondsLeft > 0 ? `Expires in ${minutes}:${seconds}` : "OTP expired"}</Text><Text style={s.otpHint}>{hindi ? "यह OTP केवल अपने पंडित जी को बताएं" : "Share this code only with your pandit"}</Text></View>;
};

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8F5F0" }, content: { paddingHorizontal: 18, paddingBottom: 30 }, successHero: { alignItems: "center", paddingTop: 18, paddingBottom: 25 }, successRing: { width: 82, height: 82, borderRadius: 41, borderWidth: 1, borderColor: "#B8D4C6", alignItems: "center", justifyContent: "center" }, successCircle: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.greenSoft, alignItems: "center", justifyContent: "center" }, check: { color: colors.green, fontSize: 27, fontWeight: "700" }, eyebrow: { color: colors.green, fontSize: 9, fontWeight: "800", letterSpacing: 1.5, marginTop: 17 }, title: { color: colors.ink, fontSize: 25, lineHeight: 32, fontWeight: "800", textAlign: "center", marginTop: 7 }, subtitle: { color: colors.muted, fontSize: 11, textAlign: "center", marginTop: 6 }, referenceBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#EEE9E4", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, marginTop: 14 }, referenceLabel: { color: colors.muted, fontSize: 7, fontWeight: "800", letterSpacing: 0.8 }, reference: { color: "#655B54", fontSize: 9, fontWeight: "800", marginLeft: 6 },
  sectionLabel: { color: colors.primary, fontSize: 9, fontWeight: "800", letterSpacing: 1.3, marginTop: 20, marginBottom: 9 }, panditCard: { backgroundColor: "#FFFFFF", borderRadius: 17, borderWidth: 1, borderColor: "#E7DDD4", padding: 15, ...shadow }, panditTop: { flexDirection: "row", alignItems: "center" }, avatar: { width: 51, height: 51, borderRadius: 26, backgroundColor: "#EFE5DE", alignItems: "center", justifyContent: "center" }, avatarText: { color: colors.primary, fontSize: 19, fontWeight: "800" }, panditCopy: { flex: 1, marginLeft: 12 }, nameRow: { flexDirection: "row", alignItems: "center" }, panditName: { color: colors.ink, fontSize: 14, fontWeight: "800", maxWidth: "88%" }, verified: { width: 17, height: 17, borderRadius: 9, backgroundColor: colors.greenSoft, color: colors.green, fontSize: 8, fontWeight: "800", textAlign: "center", textAlignVertical: "center", marginLeft: 6 }, panditMeta: { color: colors.muted, fontSize: 9, marginTop: 3 }, rating: { color: "#A46C2C", fontSize: 9, fontWeight: "800", marginTop: 4 }, privacyNote: { flexDirection: "row", alignItems: "center", backgroundColor: "#F0F4F1", borderRadius: 10, padding: 10, marginTop: 13 }, privacyMark: { color: colors.green, fontSize: 10, fontWeight: "800" }, privacyText: { flex: 1, color: "#5E7568", fontSize: 8, lineHeight: 13, marginLeft: 8 },
  detailsCard: { backgroundColor: "#FFFFFF", borderRadius: 17, borderWidth: 1, borderColor: "#E7DDD4", padding: 15 }, ceremonyHeader: { flexDirection: "row", alignItems: "center" }, omBox: { width: 42, height: 42, borderRadius: 11, backgroundColor: "#F1E7E1", alignItems: "center", justifyContent: "center" }, om: { color: colors.primary, fontSize: 20 }, ceremonyCopy: { flex: 1, marginLeft: 11 }, detailHint: { color: colors.muted, fontSize: 7, fontWeight: "800", letterSpacing: 0.8 }, ceremonyName: { color: colors.ink, fontSize: 13, fontWeight: "800", marginTop: 3 }, status: { backgroundColor: colors.greenSoft, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 5 }, statusText: { color: colors.green, fontSize: 8, fontWeight: "800" }, rule: { height: 1, backgroundColor: "#EFE7E0", marginVertical: 13 }, detailRow: { minHeight: 42, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#F1EBE6" }, lastDetail: { borderBottomWidth: 0 }, index: { width: 22, height: 22, borderRadius: 7, backgroundColor: "#F3EEE9", alignItems: "center", justifyContent: "center" }, indexText: { color: "#9B8F86", fontSize: 7, fontWeight: "800" }, detailLabel: { width: 64, color: colors.muted, fontSize: 9, fontWeight: "700", marginLeft: 9 }, detailValue: { flex: 1, color: "#4E4640", fontSize: 10, lineHeight: 15, fontWeight: "700", textAlign: "right" },
  otpCard: { backgroundColor: "#8F2020", borderWidth: 3, borderColor: "#FFCF66", borderRadius: 22, padding: 20, marginTop: 12, marginBottom: 8, alignItems: "center", shadowColor: "#6B1010", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 10 }, otpLiveBadge: { backgroundColor: "#FFCF66", borderRadius: 20, paddingHorizontal: 13, paddingVertical: 6 }, otpLiveText: { color: "#641313", fontSize: 10, fontWeight: "900", letterSpacing: 1.2 }, otpLabel: { color: "#FFFFFF", fontSize: 13, fontWeight: "900", letterSpacing: 1.5, marginTop: 13 }, otpCode: { color: "#FFFFFF", fontSize: 44, lineHeight: 54, fontWeight: "900", letterSpacing: 10, marginTop: 4 }, otpTimer: { color: "#FFDF91", fontSize: 14, fontWeight: "900", marginTop: 5 }, otpHint: { color: "#FFE9E4", fontSize: 12, lineHeight: 18, fontWeight: "700", textAlign: "center", marginTop: 9 },
  reminder: { flexDirection: "row", alignItems: "center", backgroundColor: "#F0EDEA", borderRadius: 12, padding: 12, marginTop: 14 }, reminderMark: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: "#A99B90", color: "#81746B", textAlign: "center", textAlignVertical: "center", fontSize: 9, fontWeight: "800" }, reminderCopy: { flex: 1, marginLeft: 10 }, reminderTitle: { color: "#5E554F", fontSize: 9, fontWeight: "800" }, reminderText: { color: colors.muted, fontSize: 8, lineHeight: 13, marginTop: 2 }, homeButton: { height: 51, borderRadius: 12, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 20 }, homeText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" }, homeArrow: { color: "#FFFFFF", fontSize: 22, marginLeft: 9, marginTop: -2 },
});
