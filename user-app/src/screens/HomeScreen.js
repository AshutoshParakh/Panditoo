import React, { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import useLiveRefresh from "../hooks/useLiveRefresh";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000/api";

export default function HomeScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [poojas, setPoojas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const response = await fetch(`${API_URL}/pooja-types?lang=${i18n.language || "en"}`);
      const json = await response.json();
      setPoojas(response.ok && json.success ? json.data || [] : []);
    } catch (_) { setPoojas([]); } finally { setLoading(false); setRefreshing(false); }
  }, [i18n.language]);
  useLiveRefresh(load);

  return <View style={[s.screen, { paddingTop: insets.top + 12 }]}><View style={s.header}><Text style={s.title}>{t("home.title")}</Text><Text style={s.subtitle}>{t("home.subtitle")}</Text><TouchableOpacity style={s.search} onPress={() => navigation.navigate("ExploreTab")}><Text style={s.searchText}>⌕  Search poojas</Text></TouchableOpacity></View>{loading ? <View style={s.center}><ActivityIndicator color="#913B3B" /></View> : <FlatList data={poojas} keyExtractor={(item) => String(item.id)} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#913B3B" />} contentContainerStyle={s.list} ListEmptyComponent={<Text style={s.empty}>No ceremonies available right now.</Text>} renderItem={({ item }) => <TouchableOpacity style={s.card} onPress={() => navigation.navigate("PoojaDetails", { pooja: item })}><View style={s.icon}><Text style={s.om}>ॐ</Text></View><View style={s.copy}><Text style={s.name}>{item.name}</Text><Text numberOfLines={2} style={s.description}>{item.description}</Text><Text style={s.duration}>◷ {item.duration_minutes} mins</Text></View><Text style={s.price}>₹{Number(item.base_price).toLocaleString("en-IN")}</Text></TouchableOpacity>} />}</View>;
}
const s = StyleSheet.create({ screen: { flex: 1, backgroundColor: "#FAF7F2" }, header: { paddingHorizontal: 18 }, title: { color: "#2D2824", fontSize: 24, fontWeight: "800" }, subtitle: { color: "#91877E", fontSize: 12, marginTop: 4 }, search: { height: 44, backgroundColor: "#F3EEE7", borderRadius: 11, justifyContent: "center", paddingHorizontal: 14, marginTop: 15 }, searchText: { color: "#9A9087", fontSize: 12 }, center: { flex: 1, alignItems: "center", justifyContent: "center" }, list: { padding: 18, flexGrow: 1 }, card: { backgroundColor: "white", borderWidth: 1, borderColor: "#E7DBD0", borderRadius: 14, padding: 13, flexDirection: "row", alignItems: "center", marginBottom: 11 }, icon: { width: 48, height: 48, borderRadius: 12, backgroundColor: "#F7DEDB", alignItems: "center", justifyContent: "center" }, om: { color: "#913B3B", fontSize: 23 }, copy: { flex: 1, marginHorizontal: 12 }, name: { color: "#342E2A", fontWeight: "800", fontSize: 13 }, description: { color: "#8B8178", fontSize: 10, marginTop: 4 }, duration: { color: "#998F86", fontSize: 9, marginTop: 5 }, price: { color: "#913B3B", fontWeight: "800", fontSize: 12 }, empty: { color: "#91877E", textAlign: "center", marginTop: 60 } });
