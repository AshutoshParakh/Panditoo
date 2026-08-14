import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import useLiveRefresh from "../hooks/useLiveRefresh";
import { colors, shadow } from "../theme/homeTheme";

import { API_URL } from "../config/api";

const formatDuration = (minutes, hindi) => {
  const value = Number(minutes || 60);
  if (value < 60) return `${value} ${hindi ? "मिनट" : "min"}`;
  const hours = value / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} ${hindi ? "घंटे" : hours === 1 ? "hour" : "hours"}`;
};

export default function ExploreScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { i18n } = useTranslation();
  const hindi = i18n.language === "hi";
  const [poojas, setPoojas] = useState([]);
  const [query, setQuery] = useState(route.params?.searchQuery || "");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { if (route.params?.searchQuery !== undefined) setQuery(route.params.searchQuery); }, [route.params?.searchQuery]);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const [enResponse, hiResponse] = await Promise.all([
        fetch(`${API_URL}/pooja-types?lang=en`),
        fetch(`${API_URL}/pooja-types?lang=hi`),
      ]);
      const [en, hi] = await Promise.all([enResponse.json(), hiResponse.json()]);
      if (!enResponse.ok || !en.success) throw new Error(en.message || "Unable to load poojas");
      const hindiItems = new Map((hi.data || []).map((item) => [item.id, item]));
      setPoojas((en.data || []).map((item) => ({
        ...item,
        name_en: item.name,
        description_en: item.description,
        name_hi: hindiItems.get(item.id)?.name,
        description_hi: hindiItems.get(item.id)?.description,
      })));
    } catch (_) {
      setPoojas([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useLiveRefresh(load);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    return poojas.filter((item) => !term || [item.name_en, item.name_hi, item.description_en, item.description_hi]
      .filter(Boolean).some((value) => String(value).toLowerCase().includes(term)));
  }, [poojas, query]);

  const openPooja = (item) => navigation.navigate("PoojaDetails", {
    pooja: {
      ...item,
      name: hindi ? item.name_hi || item.name_en : item.name_en || item.name_hi,
      description: hindi ? item.description_hi || item.description_en : item.description_en || item.description_hi,
    },
  });

  const renderItem = ({ item, index }) => {
    const name = hindi ? item.name_hi || item.name_en : item.name_en || item.name_hi;
    const translatedName = hindi ? item.name_en : item.name_hi;
    const description = hindi ? item.description_hi || item.description_en : item.description_en || item.description_hi;
    return (
      <TouchableOpacity activeOpacity={0.75} style={s.card} onPress={() => openPooja(item)}>
        <View style={s.monogram}><Text style={s.om}>ॐ</Text><Text style={s.number}>{String(index + 1).padStart(2, "0")}</Text></View>
        <View style={s.cardCopy}>
          <Text numberOfLines={1} style={s.name}>{name}</Text>
          {translatedName ? <Text numberOfLines={1} style={s.translatedName}>{translatedName}</Text> : null}
          <Text numberOfLines={2} style={s.description}>{description || (hindi ? "पारंपरिक विधि से संपन्न पूजा" : "A traditional ceremony performed with complete rituals.")}</Text>
          <View style={s.metaRow}>
            <Text style={s.meta}>{formatDuration(item.duration_minutes, hindi)}</Text>
            <View style={s.dot} />
            <Text style={s.price}>{hindi ? "आरंभ" : "From"}  ₹{Number(item.base_price || 0).toLocaleString("en-IN")}</Text>
          </View>
        </View>
        <Text style={s.chevron}>›</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <FlatList
        data={results}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
        ListHeaderComponent={<View style={s.header}><Text style={s.eyebrow}>{hindi ? "पूजा एवं अनुष्ठान" : "POOJA & CEREMONIES"}</Text><Text style={s.title}>{hindi ? "सही पूजा चुनें" : "Find the right ceremony"}</Text><Text style={s.subtitle}>{hindi ? "आपकी हर शुभ शुरुआत के लिए अनुभवी पंडित" : "Thoughtfully curated rituals led by verified pandits"}</Text><View style={s.search}><Text style={s.searchMark}>⌕</Text><TextInput value={query} onChangeText={setQuery} style={s.input} placeholder={hindi ? "पूजा का नाम खोजें" : "Search by pooja name"} placeholderTextColor="#9B9189" returnKeyType="search" />{query ? <TouchableOpacity onPress={() => setQuery("")}><Text style={s.clear}>×</Text></TouchableOpacity> : null}</View><View style={s.resultHeader}><Text style={s.resultTitle}>{hindi ? "सभी पूजाएं" : "All ceremonies"}</Text><Text style={s.count}>{results.length} {hindi ? "उपलब्ध" : "available"}</Text></View></View>}
        ListEmptyComponent={loading ? <View style={s.center}><ActivityIndicator color={colors.primary} /></View> : <View style={s.empty}><Text style={s.emptyTitle}>{hindi ? "कोई पूजा नहीं मिली" : "No ceremony found"}</Text><Text style={s.emptyText}>{hindi ? "दूसरे नाम से खोजकर देखें।" : "Try searching with a different name."}</Text></View>}
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8F5F0" }, list: { paddingHorizontal: 18, paddingBottom: 32, flexGrow: 1 },
  header: { paddingTop: 24, paddingBottom: 12 }, eyebrow: { color: colors.primary, fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  title: { color: colors.ink, fontSize: 28, lineHeight: 34, fontWeight: "800", marginTop: 7 }, subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 6 },
  search: { height: 52, marginTop: 22, borderRadius: 13, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E8DED4", flexDirection: "row", alignItems: "center", paddingHorizontal: 15, ...shadow },
  searchMark: { color: colors.primary, fontSize: 22 }, input: { flex: 1, height: 52, marginLeft: 10, color: colors.ink, fontSize: 14 }, clear: { color: colors.muted, fontSize: 24, paddingLeft: 10 },
  resultHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 26, marginBottom: 4 }, resultTitle: { color: colors.ink, fontSize: 17, fontWeight: "800" }, count: { color: colors.muted, fontSize: 11, fontWeight: "600" },
  card: { minHeight: 138, backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E9E0D7", marginTop: 12, padding: 14, flexDirection: "row", alignItems: "center", ...shadow },
  monogram: { width: 64, height: 106, borderRadius: 12, backgroundColor: "#F2EAE2", alignItems: "center", justifyContent: "center" }, om: { color: colors.primary, fontSize: 28 }, number: { position: "absolute", bottom: 8, color: "#B7A79A", fontSize: 9, fontWeight: "700", letterSpacing: 1 },
  cardCopy: { flex: 1, marginLeft: 14 }, name: { color: colors.ink, fontSize: 15, fontWeight: "800" }, translatedName: { color: "#9B4A45", fontSize: 11, fontWeight: "600", marginTop: 3 }, description: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 8 },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 10 }, meta: { color: "#71675F", fontSize: 10, fontWeight: "600" }, dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: "#C8BBB0", marginHorizontal: 8 }, price: { color: colors.primary, fontSize: 11, fontWeight: "800" }, chevron: { color: "#A99C92", fontSize: 25, marginLeft: 6 },
  center: { alignItems: "center", paddingTop: 70 }, empty: { alignItems: "center", paddingTop: 65 }, emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: "700" }, emptyText: { color: colors.muted, fontSize: 12, marginTop: 6 },
});
