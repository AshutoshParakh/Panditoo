import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { colors, shadow } from "../theme/homeTheme";

const formatDuration = (minutes, hindi) => {
  const value = Number(minutes || 60);
  if (value < 60) return `${value} ${hindi ? "मिनट" : "minutes"}`;
  const hours = value / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} ${hindi ? "घंटे" : hours === 1 ? "hour" : "hours"}`;
};

const SamagriCard = ({ title, note, items, hindi, accent }) => (
  <View style={s.materialCard}>
    <View style={[s.materialAccent, { backgroundColor: accent }]} />
    <View style={s.materialHeader}>
      <View style={s.materialHeading}><Text style={s.materialTitle}>{title}</Text><Text style={s.materialNote}>{note}</Text></View>
      <Text style={s.itemCount}>{items.length}</Text>
    </View>
    {items.length ? items.map((item, index) => {
      const name = hindi ? item.item_name_hi || item.item_name_en : item.item_name_en || item.item_name_hi;
      return <View key={`${name}-${index}`} style={[s.materialRow, index === items.length - 1 && s.lastRow]}><View style={s.check}><Text style={s.checkText}>✓</Text></View><Text style={s.itemName}>{name}</Text>{item.quantity ? <Text style={s.quantity}>{item.quantity}</Text> : null}</View>;
    }) : <Text style={s.noItems}>{hindi ? "कोई विशेष सामग्री आवश्यक नहीं" : "No specific items required"}</Text>}
  </View>
);

export default function PoojaDetailsScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { i18n } = useTranslation();
  const hindi = i18n.language === "hi";
  const pooja = route.params?.pooja;

  if (!pooja) return <View style={[s.screen, s.center]}><Text style={s.error}>{hindi ? "पूजा का विवरण उपलब्ध नहीं है।" : "Pooja details are unavailable."}</Text></View>;

  const name = hindi ? pooja.name_hi || pooja.name : pooja.name_en || pooja.name;
  const alternateName = hindi ? pooja.name_en : pooja.name_hi;
  const description = hindi ? pooja.description_hi || pooja.description : pooja.description_en || pooja.description;
  const items = Array.isArray(pooja.samagri_list) ? pooja.samagri_list : [];
  const panditItems = items.filter((item) => item.provided_by === "pandit");
  const userItems = items.filter((item) => item.provided_by !== "pandit");

  return (
    <View style={s.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.content, { paddingTop: insets.top + 14 }]}>
        <View style={s.topBar}><TouchableOpacity style={s.back} onPress={navigation.goBack}><Text style={s.backText}>‹</Text></TouchableOpacity><Text style={s.topTitle}>{hindi ? "पूजा विवरण" : "Ceremony details"}</Text><View style={s.back} /></View>
        <View style={s.hero}>
          <View style={s.heroPattern}><Text style={s.heroOm}>ॐ</Text></View>
          <Text style={s.eyebrow}>{hindi ? "वैदिक पूजा" : "Vedic ceremony"}</Text>
          <Text style={s.title}>{name}</Text>
          {alternateName ? <Text style={s.alternate}>{alternateName}</Text> : null}
          <View style={s.heroRule} />
          <Text style={s.heroNote}>{hindi ? "अनुभवी एवं सत्यापित पंडित द्वारा संपूर्ण विधि-विधान से" : "Performed with complete rituals by an experienced, verified pandit"}</Text>
        </View>

        <View style={s.summary}>
          <View style={s.summaryItem}><Text style={s.summaryLabel}>{hindi ? "अवधि" : "DURATION"}</Text><Text style={s.summaryValue}>{formatDuration(pooja.duration_minutes, hindi)}</Text></View>
          <View style={s.divider} />
          <View style={s.summaryItem}><Text style={s.summaryLabel}>{hindi ? "सेवा शुल्क" : "STARTING FROM"}</Text><Text style={s.summaryPrice}>₹{Number(pooja.base_price || 0).toLocaleString("en-IN")}</Text></View>
        </View>

        <View style={s.section}><Text style={s.sectionKicker}>{hindi ? "पूजा के बारे में" : "ABOUT THE CEREMONY"}</Text><Text style={s.description}>{description || (hindi ? "यह पूजा पारंपरिक वैदिक विधि से संपन्न की जाती है।" : "This ceremony is performed according to traditional Vedic rituals.")}</Text></View>

        <View style={s.assurance}><Text style={s.assuranceMark}>✓</Text><View style={s.assuranceCopy}><Text style={s.assuranceTitle}>{hindi ? "विश्वसनीय सेवा" : "A considered, transparent service"}</Text><Text style={s.assuranceText}>{hindi ? "बुकिंग से पहले शुल्क और आवश्यक सामग्री की पूरी जानकारी" : "Clear pricing and material requirements before you book"}</Text></View></View>

        <View style={s.section}><Text style={s.sectionKicker}>{hindi ? "आवश्यक सामग्री" : "MATERIALS & PREPARATION"}</Text><Text style={s.sectionIntro}>{hindi ? "तैयारी आसान रखने के लिए सामग्री को दो भागों में बांटा गया है।" : "Everything is clearly divided so you can prepare without uncertainty."}</Text></View>
        <SamagriCard title={hindi ? "पंडित जी साथ लाएंगे" : "Provided by the pandit"} note={hindi ? "आपको व्यवस्था करने की आवश्यकता नहीं" : "Included with the service"} items={panditItems} hindi={hindi} accent="#4F8068" />
        <SamagriCard title={hindi ? "आपको तैयार रखना है" : "Please arrange beforehand"} note={hindi ? "पूजा शुरू होने से पहले" : "Keep ready before the ceremony"} items={userItems} hindi={hindi} accent={colors.primary} />
        <View style={{ height: 98 }} />
      </ScrollView>
      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}><View><Text style={s.footerLabel}>{hindi ? "कुल शुल्क आरंभ" : "Starting at"}</Text><Text style={s.footerPrice}>₹{Number(pooja.base_price || 0).toLocaleString("en-IN")}</Text></View><TouchableOpacity activeOpacity={0.82} style={s.bookButton} onPress={() => navigation.navigate("SelectDateTime", { pooja: { ...pooja, name, description } })}><Text style={s.bookText}>{hindi ? "तिथि और समय चुनें" : "Choose date & time"}</Text><Text style={s.bookArrow}>›</Text></TouchableOpacity></View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8F5F0" }, content: { paddingHorizontal: 18 }, center: { alignItems: "center", justifyContent: "center", padding: 24 }, error: { color: colors.muted, fontSize: 14 },
  topBar: { height: 46, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }, back: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E8DED4" }, backText: { color: colors.ink, fontSize: 31, lineHeight: 32, marginTop: -3 }, topTitle: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  hero: { minHeight: 250, borderRadius: 20, backgroundColor: "#5E2528", padding: 24, overflow: "hidden", justifyContent: "flex-end", ...shadow }, heroPattern: { position: "absolute", right: -18, top: -22, width: 155, height: 155, borderRadius: 78, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }, heroOm: { color: "rgba(255,255,255,0.10)", fontSize: 84 }, eyebrow: { color: "#E7C89C", fontSize: 10, letterSpacing: 1.7, fontWeight: "800", textTransform: "uppercase" }, title: { color: "#FFFFFF", fontSize: 27, lineHeight: 34, fontWeight: "800", marginTop: 8, maxWidth: "88%" }, alternate: { color: "#E9D7D0", fontSize: 13, marginTop: 5 }, heroRule: { width: 34, height: 2, backgroundColor: "#C89A63", marginTop: 17, marginBottom: 12 }, heroNote: { color: "#E4D5CF", fontSize: 11, lineHeight: 17, maxWidth: "85%" },
  summary: { backgroundColor: "#FFFFFF", borderRadius: 16, marginTop: 14, flexDirection: "row", alignItems: "center", paddingVertical: 17, borderWidth: 1, borderColor: "#E9E0D7", ...shadow }, summaryItem: { flex: 1, paddingHorizontal: 18 }, divider: { width: 1, height: 37, backgroundColor: "#E9E0D7" }, summaryLabel: { color: colors.muted, fontSize: 9, fontWeight: "800", letterSpacing: 1 }, summaryValue: { color: colors.ink, fontSize: 15, fontWeight: "800", marginTop: 5 }, summaryPrice: { color: colors.primary, fontSize: 18, fontWeight: "800", marginTop: 3 },
  section: { marginTop: 28 }, sectionKicker: { color: colors.primary, fontSize: 11, fontWeight: "800", letterSpacing: 1.2 }, description: { color: "#514942", fontSize: 14, lineHeight: 23, marginTop: 11 }, sectionIntro: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 8 },
  assurance: { marginTop: 22, borderRadius: 14, backgroundColor: "#EDF3EF", padding: 15, flexDirection: "row", alignItems: "center" }, assuranceMark: { width: 30, height: 30, borderRadius: 15, color: "#3E755B", backgroundColor: "#DCEAE2", textAlign: "center", textAlignVertical: "center", fontSize: 14, fontWeight: "800" }, assuranceCopy: { flex: 1, marginLeft: 12 }, assuranceTitle: { color: "#315C49", fontSize: 12, fontWeight: "800" }, assuranceText: { color: "#648071", fontSize: 10, lineHeight: 15, marginTop: 2 },
  materialCard: { backgroundColor: "#FFFFFF", borderRadius: 16, marginTop: 13, borderWidth: 1, borderColor: "#E9E0D7", overflow: "hidden" }, materialAccent: { height: 3 }, materialHeader: { padding: 16, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#F0E9E2" }, materialHeading: { flex: 1 }, materialTitle: { color: colors.ink, fontSize: 14, fontWeight: "800" }, materialNote: { color: colors.muted, fontSize: 10, marginTop: 3 }, itemCount: { minWidth: 28, height: 28, borderRadius: 14, backgroundColor: "#F2EDE7", color: "#6E635B", textAlign: "center", textAlignVertical: "center", fontSize: 11, fontWeight: "800" }, materialRow: { minHeight: 49, flexDirection: "row", alignItems: "center", marginHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#F3EDE8" }, lastRow: { borderBottomWidth: 0 }, check: { width: 19, height: 19, borderRadius: 10, backgroundColor: "#F0EBE6", alignItems: "center", justifyContent: "center" }, checkText: { color: "#71675F", fontSize: 10, fontWeight: "800" }, itemName: { flex: 1, color: "#463F39", fontSize: 12, fontWeight: "600", marginLeft: 10 }, quantity: { color: colors.muted, fontSize: 11 }, noItems: { color: colors.muted, fontSize: 11, padding: 16 },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#E7DDD4", paddingTop: 12, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", ...shadow }, footerLabel: { color: colors.muted, fontSize: 9, fontWeight: "700", textTransform: "uppercase" }, footerPrice: { color: colors.ink, fontSize: 19, fontWeight: "800", marginTop: 2 }, bookButton: { height: 50, minWidth: 205, borderRadius: 12, backgroundColor: colors.primary, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "center" }, bookText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" }, bookArrow: { color: "#FFFFFF", fontSize: 23, marginLeft: 10, marginTop: -2 },
});
