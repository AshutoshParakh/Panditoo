import React, { useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { fetchHomeData, getCachedHomeData } from "../services/homeApi";
import { colors, shadow } from "../theme/homeTheme";

export default function ExploreScreen({ navigation, route }) {
  const { i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const cached = getCachedHomeData(i18n.language);
  const [data, setData] = useState(cached || { poojas: [], pandits: [] });
  const [query, setQuery] = useState(route.params?.searchQuery || "");

  useEffect(() => { if (route.params?.searchQuery !== undefined) setQuery(route.params.searchQuery); }, [route.params?.searchQuery]);
  useEffect(() => { let active = true; const existing = getCachedHomeData(i18n.language); if (existing) setData(existing); fetchHomeData(i18n.language).then((result) => { if (active) setData(result); }); return () => { active = false; }; }, [i18n.language]);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    const matches = (values) => values.filter(Boolean).some((value) => String(value).toLowerCase().includes(term));
    const poojas = data.poojas.filter((item) => !term || matches([item.name, item.name_en, item.name_hi, item.description]));
    const pandits = data.pandits.filter((item) => !term || matches([item.name, ...(item.specializations || [])]));
    return [...poojas.map((item) => ({ ...item, resultType: "pooja" })), ...pandits.map((item) => ({ ...item, resultType: "pandit" }))];
  }, [data, query]);

  return <FlatList style={s.screen} contentContainerStyle={[s.content, { paddingTop: insets.top + 12 }]} data={results} keyExtractor={(item) => `${item.resultType}-${item.id}`} ListHeaderComponent={<View><Text style={s.heading}>Explore</Text><TextInput style={s.search} value={query} onChangeText={setQuery} placeholder="Search poojas or pandits" placeholderTextColor={colors.muted} returnKeyType="search" /><Text style={s.sub}>{query ? `${results.length} results` : "Poojas and pandits available near you"}</Text></View>} ListEmptyComponent={<Text style={s.empty}>No matching poojas or pandits found.</Text>} renderItem={({ item }) => <TouchableOpacity style={s.card} onPress={() => item.resultType === "pooja" ? navigation.navigate("PoojaDetails", { pooja: item }) : navigation.navigate("PanditDetails", { pandit: item })}><Text style={s.icon}>ॐ</Text><View style={s.copy}><Text style={s.name}>{item.name}</Text><Text numberOfLines={2} style={s.desc}>{item.resultType === "pooja" ? item.description : [item.specializations?.join(", "), item.experience_years != null ? `${item.experience_years} years experience` : null].filter(Boolean).join(" · ")}</Text></View>{item.resultType === "pooja" && item.base_price != null ? <Text style={s.price}>₹{item.base_price}</Text> : <Text style={s.type}>Pandit</Text>}</TouchableOpacity>} />;
}
const s = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.bg }, content: { paddingHorizontal: 16, paddingBottom: 24 }, heading: { fontSize: 24, fontWeight: "800", color: colors.ink }, search: { height: 46, backgroundColor: "white", borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, color: colors.ink, marginTop: 12 }, sub: { fontSize: 12, color: colors.muted, marginTop: 9, marginBottom: 18 }, card: { backgroundColor: "white", borderRadius: 15, borderWidth: 1, borderColor: colors.border, padding: 13, marginBottom: 11, flexDirection: "row", alignItems: "center", ...shadow }, icon: { width: 43, height: 43, borderRadius: 12, backgroundColor: colors.soft, color: colors.primary, textAlign: "center", textAlignVertical: "center", fontSize: 20 }, copy: { flex: 1, marginHorizontal: 11 }, name: { color: colors.ink, fontSize: 14, fontWeight: "700" }, desc: { color: colors.muted, fontSize: 10, marginTop: 3 }, price: { color: colors.primary, fontWeight: "700", fontSize: 13 }, type: { color: colors.green, fontWeight: "700", fontSize: 11 }, empty: { color: colors.muted, textAlign: "center", marginTop: 50 } });
