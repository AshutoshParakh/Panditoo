import React, { useEffect, useRef, useState } from "react";
import { Animated, BackHandler, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import { colors, shadow } from "../theme/homeTheme";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000/api";

export default function WaitingForPanditScreen({ route, navigation }) {
  const { i18n } = useTranslation();
  const hindi = i18n.language === "hi";
  const { bookingId, poojaName } = route.params || {};
  const [notifiedCount, setNotifiedCount] = useState(1);
  const [lastChecked, setLastChecked] = useState(new Date());
  const pulse = useRef(new Animated.Value(0)).current;

  const goToHome = () => navigation.reset({ index: 0, routes: [{ name: "Main" }] });

  useEffect(() => {
    const backSubscription = BackHandler.addEventListener("hardwareBackPress", () => { goToHome(); return true; });
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1700, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 1700, useNativeDriver: true }),
    ]));
    animation.start();

    let active = true;
    let intervalId;
    const poll = async (authToken) => {
      if (!bookingId || !active) return;
      try {
        const response = await fetch(`${API_URL}/bookings/${bookingId}`, { headers: authToken ? { Authorization: `Bearer ${authToken}` } : {} });
        const json = await response.json();
        if (!active || !response.ok || !json.success || !json.data) return;
        setLastChecked(new Date());
        setNotifiedCount(json.data.notified_pandits_count || 1);
        if (json.data.status === "confirmed") navigation.replace("BookingConfirmed", { booking: json.data });
      } catch (error) { console.warn("Polling error:", error.message); }
    };
    AsyncStorage.getItem("user-app-token").then((token) => {
      poll(token);
      intervalId = setInterval(() => poll(token), 5000);
    });
    return () => { active = false; backSubscription.remove(); animation.stop(); if (intervalId) clearInterval(intervalId); };
  }, [bookingId, navigation, pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.08] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] });

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.top}><Text style={s.eyebrow}>{hindi ? "बुकिंग अनुरोध" : "BOOKING REQUEST"}</Text><View style={s.live}><View style={s.liveDot} /><Text style={s.liveText}>{hindi ? "लाइव" : "LIVE"}</Text></View></View>
      <View style={s.content}>
        <View style={s.searchVisual}>
          <Animated.View style={[s.outerPulse, { opacity, transform: [{ scale }] }]} />
          <View style={s.innerCircle}><Text style={s.om}>ॐ</Text></View>
          <View style={[s.orbitDot, s.orbitOne]} /><View style={[s.orbitDot, s.orbitTwo]} /><View style={[s.orbitDot, s.orbitThree]} />
        </View>
        <Text style={s.title}>{hindi ? "उपयुक्त पंडित की खोज जारी है" : "Finding the right pandit"}</Text>
        <Text style={s.subtitle}>{hindi ? `${poojaName || "आपकी पूजा"} के लिए आस-पास के सत्यापित पंडितों से संपर्क किया जा रहा है।` : `We’re contacting verified pandits nearby for ${poojaName || "your ceremony"}.`}</Text>

        <View style={s.progressCard}>
          <View style={s.progressHeader}><Text style={s.progressTitle}>{hindi ? "अनुरोध की स्थिति" : "Request progress"}</Text><Text style={s.progressCount}>{notifiedCount} {hindi ? "पंडित" : "pandits"}</Text></View>
          <View style={s.track}><View style={[s.trackFill, { width: `${Math.min(100, 32 + notifiedCount * 12)}%` }]} /></View>
          <View style={s.step}><View style={s.stepDone}><Text style={s.stepDoneText}>✓</Text></View><View style={s.stepCopy}><Text style={s.stepTitle}>{hindi ? "भुगतान सुरक्षित" : "Payment secured"}</Text><Text style={s.stepText}>{hindi ? "आपकी बुकिंग प्राथमिकता पर है" : "Your request is now prioritised"}</Text></View></View>
          <View style={s.step}><View style={s.stepActive}><View style={s.stepPulse} /></View><View style={s.stepCopy}><Text style={s.stepTitle}>{hindi ? "पंडितों को सूचित किया गया" : "Pandits are being notified"}</Text><Text style={s.stepText}>{hindi ? "पहली स्वीकृति पर तुरंत पुष्टि होगी" : "The first acceptance confirms your booking"}</Text></View></View>
        </View>

        <View style={s.info}><Text style={s.infoMark}>i</Text><Text style={s.infoText}>{hindi ? "आपको ऐप बंद रखने पर भी सूचना मिल जाएगी। आमतौर पर कुछ ही मिनट लगते हैं।" : "You’ll be notified even if you close the app. This usually takes only a few minutes."}</Text></View>
        <Text style={s.checked}>{hindi ? "अभी अपडेट किया गया" : `Last checked ${lastChecked.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}</Text>
      </View>
      <View style={s.footer}><TouchableOpacity style={s.homeButton} onPress={goToHome} activeOpacity={0.78}><Text style={s.homeText}>{hindi ? "होम पर जाएं" : "Continue to home"}</Text><Text style={s.arrow}>›</Text></TouchableOpacity><Text style={s.footerNote}>{hindi ? "खोज बैकग्राउंड में जारी रहेगी" : "The search will continue in the background"}</Text></View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8F5F0" }, top: { paddingHorizontal: 20, paddingTop: 9, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, eyebrow: { color: colors.muted, fontSize: 9, fontWeight: "800", letterSpacing: 1.4 }, live: { flexDirection: "row", alignItems: "center", backgroundColor: colors.greenSoft, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 5 }, liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.green, marginRight: 5 }, liveText: { color: colors.green, fontSize: 8, fontWeight: "800", letterSpacing: 0.8 },
  content: { flex: 1, paddingHorizontal: 21, alignItems: "center" }, searchVisual: { width: 190, height: 190, marginTop: 26, alignItems: "center", justifyContent: "center" }, outerPulse: { position: "absolute", width: 145, height: 145, borderRadius: 73, backgroundColor: "#E8CECB" }, innerCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#DDC9C3", alignItems: "center", justifyContent: "center", ...shadow }, om: { color: colors.primary, fontSize: 40 }, orbitDot: { position: "absolute", width: 10, height: 10, borderRadius: 5, backgroundColor: "#B77867", borderWidth: 2, borderColor: "#F8F5F0" }, orbitOne: { top: 23, right: 36 }, orbitTwo: { bottom: 31, left: 27 }, orbitThree: { bottom: 18, right: 52 },
  title: { color: colors.ink, fontSize: 24, lineHeight: 31, fontWeight: "800", textAlign: "center", marginTop: 2 }, subtitle: { color: colors.muted, fontSize: 12, lineHeight: 19, textAlign: "center", marginTop: 9, paddingHorizontal: 13 },
  progressCard: { width: "100%", backgroundColor: "#FFFFFF", borderRadius: 17, borderWidth: 1, borderColor: "#E8DED5", padding: 16, marginTop: 25, ...shadow }, progressHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, progressTitle: { color: colors.ink, fontSize: 12, fontWeight: "800" }, progressCount: { color: colors.primary, fontSize: 10, fontWeight: "800" }, track: { height: 4, borderRadius: 2, backgroundColor: "#EEE7E1", marginTop: 13, marginBottom: 14, overflow: "hidden" }, trackFill: { height: 4, borderRadius: 2, backgroundColor: colors.primary }, step: { flexDirection: "row", alignItems: "center", marginTop: 10 }, stepDone: { width: 25, height: 25, borderRadius: 13, backgroundColor: colors.greenSoft, alignItems: "center", justifyContent: "center" }, stepDoneText: { color: colors.green, fontSize: 10, fontWeight: "800" }, stepActive: { width: 25, height: 25, borderRadius: 13, borderWidth: 1, borderColor: "#D8AAA4", alignItems: "center", justifyContent: "center" }, stepPulse: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary }, stepCopy: { flex: 1, marginLeft: 10 }, stepTitle: { color: "#4A423C", fontSize: 10, fontWeight: "800" }, stepText: { color: colors.muted, fontSize: 8, marginTop: 2 },
  info: { width: "100%", flexDirection: "row", alignItems: "center", backgroundColor: "#F2EEE9", borderRadius: 12, padding: 12, marginTop: 14 }, infoMark: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: "#AA9B90", color: "#84776D", textAlign: "center", textAlignVertical: "center", fontSize: 9, fontWeight: "800" }, infoText: { flex: 1, color: "#71675F", fontSize: 9, lineHeight: 14, marginLeft: 9 }, checked: { color: "#A2978F", fontSize: 8, marginTop: 12 },
  footer: { paddingHorizontal: 20, paddingBottom: 10, alignItems: "center" }, homeButton: { width: "100%", height: 51, borderRadius: 12, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center" }, homeText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" }, arrow: { color: "#FFFFFF", fontSize: 23, marginLeft: 10, marginTop: -2 }, footerNote: { color: colors.muted, fontSize: 8, marginTop: 8 },
});
