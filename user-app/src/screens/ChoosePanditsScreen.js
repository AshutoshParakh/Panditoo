import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { colors, shadow } from "../theme/homeTheme";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000/api";
const SORTS = ["recommended", "nearest", "experience"];

export default function ChoosePanditsScreen({ route, navigation }) {
  const { i18n } = useTranslation();
  const hindi = i18n.language === "hi";
  const { pooja, bookingDate, bookingTime, latitude, longitude, address } = route.params || {};
  const [pandits, setPandits] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [sort, setSort] = useState("recommended");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchNearbyPandits = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true); setError("");
    try {
      const response = await fetch(`${API_URL}/pandits/nearby?lat=${encodeURIComponent(latitude)}&lng=${encodeURIComponent(longitude)}&radius=50`);
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.message || "Unable to find pandits.");
      setPandits(Array.isArray(json.data) ? json.data : []);
    } catch (requestError) { setPandits([]); setError(requestError.message || (hindi ? "पंडित खोज नहीं सके।" : "Unable to find nearby pandits.")); }
    finally { setLoading(false); setRefreshing(false); }
  }, [hindi, latitude, longitude]);

  useEffect(() => { fetchNearbyPandits(); }, [fetchNearbyPandits]);

  const visiblePandits = useMemo(() => [...pandits].sort((a, b) => {
    if (sort === "nearest") return Number(a.distance_km || 999) - Number(b.distance_km || 999);
    if (sort === "experience") return Number(b.experience_years || 0) - Number(a.experience_years || 0);
    return Number(b.rating || 0) - Number(a.rating || 0) || Number(a.distance_km || 999) - Number(b.distance_km || 999);
  }), [pandits, sort]);

  const togglePandit = (id) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 10 ? [...current, id] : current);
  const selectRecommended = () => setSelectedIds(visiblePandits.slice(0, Math.min(3, visiblePandits.length)).map((item) => item.id));
  const handleContinue = () => navigation.navigate("ConfirmBooking", { pooja, bookingDate, bookingTime, address, latitude, longitude, selectedPanditIds: selectedIds, selectedPandits: pandits.filter((item) => selectedIds.includes(item.id)) });
  const sortLabel = (value) => ({ recommended: hindi ? "सुझाए गए" : "Recommended", nearest: hindi ? "सबसे पास" : "Nearest", experience: hindi ? "अनुभव" : "Experience" }[value]);

  const renderPandit = ({ item, index }) => {
    const selected = selectedIds.includes(item.id);
    const disabled = !selected && selectedIds.length >= 10;
    const specializations = Array.isArray(item.specializations) ? item.specializations.slice(0, 3) : [];
    return (
      <TouchableOpacity activeOpacity={0.76} disabled={disabled} style={[s.card, selected && s.selectedCard, disabled && s.disabledCard]} onPress={() => togglePandit(item.id)}>
        {index === 0 && sort === "recommended" ? <View style={s.bestBadge}><Text style={s.bestText}>{hindi ? "श्रेष्ठ मिलान" : "BEST MATCH"}</Text></View> : null}
        <View style={s.cardTop}>
          <View style={s.avatar}><Text style={s.avatarText}>{String(item.name || "P").charAt(0).toUpperCase()}</Text>{item.is_verified !== false ? <View style={s.verifyBadge}><Text style={s.verifyText}>✓</Text></View> : null}</View>
          <View style={s.panditCopy}><View style={s.nameRow}><Text numberOfLines={1} style={s.name}>{item.name || "Pandit"}</Text>{item.is_verified !== false ? <Text style={s.verifiedLabel}>{hindi ? "सत्यापित" : "Verified"}</Text> : null}</View><Text style={s.experience}>{item.experience_years != null ? `${item.experience_years} ${hindi ? "वर्ष का अनुभव" : "years experience"}` : (hindi ? "अनुभवी पंडित" : "Experienced pandit")}</Text></View>
          <View style={[s.checkbox, selected && s.checked]}><Text style={[s.checkboxText, selected && s.checkboxTextChecked]}>{selected ? "✓" : "+"}</Text></View>
        </View>

        <View style={s.metrics}>
          <View style={s.metric}><Text style={s.metricValue}>{item.rating != null ? `★ ${Number(item.rating).toFixed(1)}` : "New"}</Text><Text style={s.metricLabel}>{item.total_ratings_count ? `${item.total_ratings_count} ${hindi ? "रेटिंग" : "ratings"}` : (hindi ? "रेटिंग" : "Rating")}</Text></View>
          <View style={s.metricRule} />
          <View style={s.metric}><Text style={s.metricValue}>{item.distance_km != null ? `${Number(item.distance_km).toFixed(1)} km` : "Nearby"}</Text><Text style={s.metricLabel}>{hindi ? "आपसे दूरी" : "From your location"}</Text></View>
          <View style={s.metricRule} />
          <View style={s.metric}><Text style={s.metricValue}>{item.service_radius_km ? `${item.service_radius_km} km` : "50 km"}</Text><Text style={s.metricLabel}>{hindi ? "सेवा क्षेत्र" : "Service radius"}</Text></View>
        </View>

        {specializations.length ? <View style={s.tags}>{specializations.map((itemName, tagIndex) => <View key={`${itemName}-${tagIndex}`} style={s.tag}><Text numberOfLines={1} style={s.tagText}>{itemName}</Text></View>)}</View> : null}
        <View style={s.cardBottom}><Text numberOfLines={1} style={s.locationText}>{item.address || (hindi ? "आपके क्षेत्र में उपलब्ध" : "Available in your area")}</Text><Text style={[s.selectText, selected && s.selectTextActive]}>{selected ? (hindi ? "चुना गया" : "Selected") : (hindi ? "चुनें" : "Select")}</Text></View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.screen}>
      <FlatList
        data={visiblePandits}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderPandit}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchNearbyPandits(true)} tintColor={colors.primary} />}
        ListHeaderComponent={<View><View style={s.intro}><Text style={s.eyebrow}>{hindi ? "सत्यापित पंडित" : "VERIFIED PANDITS"}</Text><Text style={s.title}>{hindi ? "अपना पंडित चुनें" : "Choose your pandit"}</Text><Text style={s.subtitle}>{hindi ? "जल्दी पुष्टि के लिए एक से अधिक पंडित चुन सकते हैं।" : "Select more than one pandit for a faster confirmation."}</Text></View><View style={s.locationStrip}><View style={s.locationMark}><Text style={s.locationMarkText}>⌖</Text></View><View style={s.locationCopy}><Text style={s.locationLabel}>{hindi ? "पूजा स्थल" : "CEREMONY LOCATION"}</Text><Text numberOfLines={1} style={s.location}>{address}</Text></View><Text style={s.nearbyCount}>{pandits.length} {hindi ? "पास" : "nearby"}</Text></View><View style={s.toolbar}><View style={s.sorts}>{SORTS.map((item) => <TouchableOpacity key={item} style={[s.sort, sort === item && s.activeSort]} onPress={() => setSort(item)}><Text style={[s.sortText, sort === item && s.activeSortText]}>{sortLabel(item)}</Text></TouchableOpacity>)}</View>{pandits.length >= 2 ? <TouchableOpacity style={s.autoSelect} onPress={selectRecommended}><Text style={s.autoSelectText}>{hindi ? "श्रेष्ठ 3 चुनें" : "Select top 3"}</Text></TouchableOpacity> : null}</View></View>}
        ListEmptyComponent={loading ? <View style={s.state}><ActivityIndicator color={colors.primary} /><Text style={s.stateText}>{hindi ? "आस-पास पंडित खोज रहे हैं..." : "Finding verified pandits nearby..."}</Text></View> : <View style={s.state}><Text style={s.emptyTitle}>{hindi ? "कोई पंडित नहीं मिला" : "No pandits found nearby"}</Text><Text style={s.stateText}>{error || (hindi ? "स्थान बदलकर दोबारा कोशिश करें।" : "Try another location or refresh the list.")}</Text><TouchableOpacity onPress={() => fetchNearbyPandits()}><Text style={s.retry}>{hindi ? "दोबारा कोशिश करें" : "Try again"}</Text></TouchableOpacity></View>}
        ListFooterComponent={<View style={s.spacer} />}
      />
      <View style={s.footer}><View style={s.selectedCopy}><Text style={s.selectedLabel}>{hindi ? "चुने गए पंडित" : "SELECTED PANDITS"}</Text><Text style={s.selectedValue}>{selectedIds.length}<Text style={s.selectedLimit}> / 10</Text></Text></View><TouchableOpacity disabled={!selectedIds.length} style={[s.continueButton, !selectedIds.length && s.continueDisabled]} onPress={handleContinue}><Text style={s.continueText}>{hindi ? "बुकिंग जांचें" : "Review booking"}</Text><Text style={s.arrow}>›</Text></TouchableOpacity></View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8F5F0" }, list: { paddingHorizontal: 17 }, intro: { paddingTop: 5, paddingBottom: 14 }, eyebrow: { color: colors.primary, fontSize: 8, fontWeight: "800", letterSpacing: 1.4 }, title: { color: colors.ink, fontSize: 26, lineHeight: 33, fontWeight: "800", marginTop: 5 }, subtitle: { color: colors.muted, fontSize: 10, lineHeight: 16, marginTop: 4 },
  locationStrip: { height: 57, borderRadius: 13, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5DAD1", paddingHorizontal: 11, flexDirection: "row", alignItems: "center" }, locationMark: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#F0E5E1", alignItems: "center", justifyContent: "center" }, locationMarkText: { color: colors.primary, fontSize: 18 }, locationCopy: { flex: 1, marginLeft: 9 }, locationLabel: { color: colors.muted, fontSize: 7, fontWeight: "800", letterSpacing: 0.8 }, location: { color: "#504741", fontSize: 9, fontWeight: "700", marginTop: 3 }, nearbyCount: { color: colors.green, backgroundColor: colors.greenSoft, overflow: "hidden", borderRadius: 9, paddingHorizontal: 7, paddingVertical: 5, fontSize: 8, fontWeight: "800" },
  toolbar: { marginTop: 13, marginBottom: 4 }, sorts: { flexDirection: "row", gap: 6 }, sort: { height: 31, borderRadius: 16, borderWidth: 1, borderColor: "#E1D6CC", backgroundColor: "#FBF9F6", paddingHorizontal: 11, alignItems: "center", justifyContent: "center" }, activeSort: { backgroundColor: colors.primary, borderColor: colors.primary }, sortText: { color: "#81766E", fontSize: 8, fontWeight: "700" }, activeSortText: { color: "#FFFFFF" }, autoSelect: { alignSelf: "flex-end", marginTop: 9 }, autoSelectText: { color: colors.primary, fontSize: 8, fontWeight: "800" },
  card: { backgroundColor: "#FFFFFF", borderRadius: 17, borderWidth: 1, borderColor: "#E6DCD3", padding: 14, marginTop: 10, overflow: "hidden", ...shadow }, selectedCard: { borderColor: "#A85651", backgroundColor: "#FFFBF9" }, disabledCard: { opacity: 0.55 }, bestBadge: { position: "absolute", top: 0, left: 0, backgroundColor: "#E8D6B9", borderBottomRightRadius: 10, paddingHorizontal: 9, paddingVertical: 5 }, bestText: { color: "#7C5825", fontSize: 6, fontWeight: "800", letterSpacing: 0.6 }, cardTop: { flexDirection: "row", alignItems: "center", marginTop: 4 }, avatar: { width: 49, height: 49, borderRadius: 25, backgroundColor: "#EEE4DD", alignItems: "center", justifyContent: "center" }, avatarText: { color: colors.primary, fontSize: 17, fontWeight: "800" }, verifyBadge: { position: "absolute", right: -1, bottom: -1, width: 17, height: 17, borderRadius: 9, backgroundColor: colors.green, borderWidth: 2, borderColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }, verifyText: { color: "#FFFFFF", fontSize: 7, fontWeight: "800" }, panditCopy: { flex: 1, marginLeft: 11 }, nameRow: { flexDirection: "row", alignItems: "center" }, name: { color: colors.ink, fontSize: 13, fontWeight: "800", maxWidth: "68%" }, verifiedLabel: { color: colors.green, fontSize: 7, fontWeight: "800", backgroundColor: colors.greenSoft, overflow: "hidden", borderRadius: 7, paddingHorizontal: 5, paddingVertical: 3, marginLeft: 6 }, experience: { color: colors.muted, fontSize: 8, marginTop: 4 }, checkbox: { width: 28, height: 28, borderRadius: 9, borderWidth: 1, borderColor: "#D6CAC0", alignItems: "center", justifyContent: "center" }, checked: { backgroundColor: colors.primary, borderColor: colors.primary }, checkboxText: { color: "#9B8E84", fontSize: 15, fontWeight: "600" }, checkboxTextChecked: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  metrics: { minHeight: 51, borderRadius: 11, backgroundColor: "#F6F2EE", flexDirection: "row", alignItems: "center", marginTop: 13, paddingVertical: 8 }, metric: { flex: 1, alignItems: "center" }, metricValue: { color: "#514842", fontSize: 10, fontWeight: "800" }, metricLabel: { color: colors.muted, fontSize: 6, marginTop: 3 }, metricRule: { width: 1, height: 25, backgroundColor: "#DFD6CE" }, tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 }, tag: { maxWidth: "46%", borderRadius: 8, backgroundColor: "#F2EAE5", paddingHorizontal: 7, paddingVertical: 5 }, tagText: { color: "#746960", fontSize: 7, fontWeight: "700" }, cardBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 11 }, locationText: { flex: 1, color: colors.muted, fontSize: 7, marginRight: 10 }, selectText: { color: colors.primary, fontSize: 8, fontWeight: "800" }, selectTextActive: { color: colors.green },
  state: { alignItems: "center", paddingTop: 90, paddingHorizontal: 25 }, stateText: { color: colors.muted, fontSize: 10, lineHeight: 16, textAlign: "center", marginTop: 10 }, emptyTitle: { color: colors.ink, fontSize: 14, fontWeight: "800" }, retry: { color: colors.primary, fontSize: 10, fontWeight: "800", marginTop: 14 }, spacer: { height: 100 },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, minHeight: 81, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#E4DAD1", paddingHorizontal: 18, paddingVertical: 11, flexDirection: "row", alignItems: "center", ...shadow }, selectedCopy: { flex: 1 }, selectedLabel: { color: colors.muted, fontSize: 7, fontWeight: "800", letterSpacing: 0.8 }, selectedValue: { color: colors.ink, fontSize: 20, fontWeight: "800", marginTop: 2 }, selectedLimit: { color: colors.muted, fontSize: 10 }, continueButton: { minWidth: 185, height: 50, borderRadius: 12, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center" }, continueDisabled: { backgroundColor: "#CEC4BC" }, continueText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" }, arrow: { color: "#FFFFFF", fontSize: 22, marginLeft: 8, marginTop: -2 },
});
