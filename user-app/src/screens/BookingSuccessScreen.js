import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { colors, shadow } from "../theme/homeTheme";

export default function BookingSuccessScreen({ route, navigation }) {
  const { i18n } = useTranslation();
  const hindi = i18n.language === "hi";
  const { pooja, bookingDate, bookingTime, address, selectedPanditCount } = route.params || {};
  const goHome = () => navigation.reset({ index: 0, routes: [{ name: "Main" }] });

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.content}>
        <View style={s.hero}>
          <View style={s.iconRing}><View style={s.iconCircle}><Text style={s.sendMark}>✓</Text></View></View>
          <Text style={s.eyebrow}>{hindi ? "अनुरोध भेजा गया" : "REQUEST SENT"}</Text>
          <Text style={s.title}>{hindi ? "आपकी बुकिंग प्रक्रिया में है" : "Your booking is in progress"}</Text>
          <Text style={s.subtitle}>{hindi ? `${selectedPanditCount || "चयनित"} पंडितों को अनुरोध भेज दिया गया है। स्वीकृति मिलते ही आपको सूचित किया जाएगा।` : `Your request has been shared with ${selectedPanditCount || "the selected"} pandits. We’ll notify you as soon as one accepts.`}</Text>
        </View>

        <View style={s.timeline}><View style={s.timelineItem}><View style={s.done}><Text style={s.doneText}>✓</Text></View><View style={s.timelineCopy}><Text style={s.timelineTitle}>{hindi ? "अनुरोध प्राप्त हुआ" : "Request received"}</Text><Text style={s.timelineText}>{hindi ? "आपकी जानकारी सुरक्षित है" : "Your details have been recorded securely"}</Text></View></View><View style={s.line} /><View style={s.timelineItem}><View style={s.active}><View style={s.activeDot} /></View><View style={s.timelineCopy}><Text style={s.timelineTitle}>{hindi ? "पंडित की स्वीकृति की प्रतीक्षा" : "Awaiting pandit acceptance"}</Text><Text style={s.timelineText}>{hindi ? "आमतौर पर कुछ ही मिनट लगते हैं" : "This usually takes only a few minutes"}</Text></View></View></View>

        <View style={s.summaryCard}>
          <View style={s.summaryTop}><View style={s.omBox}><Text style={s.om}>ॐ</Text></View><View style={s.summaryCopy}><Text style={s.label}>{hindi ? "चयनित पूजा" : "CEREMONY"}</Text><Text style={s.poojaName}>{pooja?.name || (hindi ? "पूजा" : "Pooja")}</Text></View></View>
          <View style={s.rule} />
          <Row number="01" label={hindi ? "तारीख और समय" : "Date & time"} value={`${bookingDate || "—"}  ·  ${bookingTime || "—"}`} />
          <Row number="02" label={hindi ? "पूजा स्थल" : "Location"} value={address || "—"} last />
        </View>

        <View style={s.notice}><Text style={s.noticeMark}>i</Text><Text style={s.noticeText}>{hindi ? "खोज बैकग्राउंड में जारी रहेगी। आप निश्चिंत होकर होम पर जा सकते हैं।" : "The search continues in the background, so you can safely return home."}</Text></View>
      </View>
      <View style={s.footer}><TouchableOpacity style={s.button} onPress={goHome} activeOpacity={0.8}><Text style={s.buttonText}>{hindi ? "होम पर जाएं" : "Continue to home"}</Text><Text style={s.arrow}>›</Text></TouchableOpacity></View>
    </SafeAreaView>
  );
}

const Row = ({ number, label, value, last }) => <View style={[s.row, last && s.last]}><View style={s.number}><Text style={s.numberText}>{number}</Text></View><View style={s.rowCopy}><Text style={s.rowLabel}>{label}</Text><Text numberOfLines={3} style={s.rowValue}>{value}</Text></View></View>;
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8F5F0" }, content: { flex: 1, paddingHorizontal: 20 }, hero: { alignItems: "center", paddingTop: 25 }, iconRing: { width: 84, height: 84, borderRadius: 42, borderWidth: 1, borderColor: "#D5BDB8", alignItems: "center", justifyContent: "center" }, iconCircle: { width: 62, height: 62, borderRadius: 31, backgroundColor: "#F0E0DE", alignItems: "center", justifyContent: "center" }, sendMark: { color: colors.primary, fontSize: 26, fontWeight: "800" }, eyebrow: { color: colors.primary, fontSize: 9, fontWeight: "800", letterSpacing: 1.4, marginTop: 16 }, title: { color: colors.ink, fontSize: 24, lineHeight: 31, fontWeight: "800", textAlign: "center", marginTop: 7 }, subtitle: { color: colors.muted, fontSize: 11, lineHeight: 18, textAlign: "center", marginTop: 7, paddingHorizontal: 9 },
  timeline: { width: "100%", backgroundColor: "#FFFFFF", borderRadius: 15, borderWidth: 1, borderColor: "#E7DDD4", padding: 15, marginTop: 23 }, timelineItem: { flexDirection: "row", alignItems: "center" }, done: { width: 25, height: 25, borderRadius: 13, backgroundColor: colors.greenSoft, alignItems: "center", justifyContent: "center" }, doneText: { color: colors.green, fontSize: 10, fontWeight: "800" }, active: { width: 25, height: 25, borderRadius: 13, borderWidth: 1, borderColor: "#D5ABA6", alignItems: "center", justifyContent: "center" }, activeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary }, timelineCopy: { flex: 1, marginLeft: 10 }, timelineTitle: { color: "#4D453F", fontSize: 10, fontWeight: "800" }, timelineText: { color: colors.muted, fontSize: 8, marginTop: 2 }, line: { width: 1, height: 16, backgroundColor: "#E1D8D0", marginLeft: 12, marginVertical: 3 },
  summaryCard: { backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E7DDD4", padding: 15, marginTop: 13, ...shadow }, summaryTop: { flexDirection: "row", alignItems: "center" }, omBox: { width: 42, height: 42, borderRadius: 11, backgroundColor: "#F1E7E1", alignItems: "center", justifyContent: "center" }, om: { color: colors.primary, fontSize: 20 }, summaryCopy: { flex: 1, marginLeft: 11 }, label: { color: colors.muted, fontSize: 7, fontWeight: "800", letterSpacing: 1 }, poojaName: { color: colors.ink, fontSize: 13, fontWeight: "800", marginTop: 3 }, rule: { height: 1, backgroundColor: "#EFE7E0", marginVertical: 13 }, row: { flexDirection: "row", alignItems: "center", paddingBottom: 12, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: "#F1EBE6" }, last: { paddingBottom: 0, marginBottom: 0, borderBottomWidth: 0 }, number: { width: 25, height: 25, borderRadius: 7, backgroundColor: "#F3EEE9", alignItems: "center", justifyContent: "center" }, numberText: { color: "#998D84", fontSize: 7, fontWeight: "800" }, rowCopy: { flex: 1, marginLeft: 10 }, rowLabel: { color: colors.muted, fontSize: 8, fontWeight: "700" }, rowValue: { color: "#4D453F", fontSize: 10, lineHeight: 15, fontWeight: "700", marginTop: 3 }, notice: { flexDirection: "row", alignItems: "center", backgroundColor: "#F0EDEA", borderRadius: 11, padding: 11, marginTop: 13 }, noticeMark: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: "#A99B90", color: "#81746B", fontSize: 9, fontWeight: "800", textAlign: "center", textAlignVertical: "center" }, noticeText: { flex: 1, color: "#776C64", fontSize: 8, lineHeight: 13, marginLeft: 9 },
  footer: { paddingHorizontal: 20, paddingBottom: 10 }, button: { height: 51, borderRadius: 12, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center" }, buttonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" }, arrow: { color: "#FFFFFF", fontSize: 22, marginLeft: 9, marginTop: -2 },
});
