import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useLiveRefresh from "../hooks/useLiveRefresh";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000/api";
const categories = ["All", "Home Ceremonies", "Family Rituals", "Festivals"];
const categoryWords = {
  "Home Ceremonies": ["griha", "vastu", "house", "home"],
  "Family Rituals": ["satyanarayan", "marriage", "wedding", "naam", "birthday", "family"],
  Festivals: ["diwali", "lakshmi", "ganesh", "navratri", "festival"],
};

export default function ExploreScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const [poojas, setPoojas] = useState([]);
  const [query, setQuery] = useState(route.params?.searchQuery || "");
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => { if (route.params?.searchQuery !== undefined) setQuery(route.params.searchQuery); }, [route.params?.searchQuery]);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const [enResponse, hiResponse] = await Promise.all([fetch(`${API_URL}/pooja-types?lang=en`), fetch(`${API_URL}/pooja-types?lang=hi`)]);
      const [en, hi] = await Promise.all([enResponse.json(), hiResponse.json()]);
      if (!enResponse.ok || !en.success) throw new Error(en.message || "Unable to load poojas");
      const hindi = new Map((hi.data || []).map((item) => [item.id, item]));
      setPoojas((en.data || []).map((item) => ({ ...item, name_en: item.name, description_en: item.description, name_hi: hindi.get(item.id)?.name, description_hi: hindi.get(item.id)?.description })));
    } catch (_) {
      setPoojas([]);
    } finally { setLoading(false); setRefreshing(false); }
  }, []);
  useLiveRefresh(load);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    return poojas.filter((item) => {
      const text = `${item.name_en || ""} ${item.name_hi || ""} ${item.description_en || ""}`.toLowerCase();
      const searchMatch = !term || text.includes(term);
      const categoryMatch = category === "All" || categoryWords[category].some((word) => text.includes(word));
      return searchMatch && categoryMatch;
    });
  }, [category, poojas, query]);

  const renderItem = ({ item }) => <TouchableOpacity style={s.card} onPress={() => navigation.navigate("PoojaDetails", { pooja: { ...item, name: item.name_en, description: item.description_en } })}><View style={s.image}><Text style={s.imageText}>ॐ</Text></View><View style={s.copy}><Text style={s.name}>{item.name_en}</Text>{item.name_hi ? <Text style={s.hindi}>{item.name_hi}</Text> : null}<Text numberOfLines={2} style={s.description}>{item.description_en}</Text><View style={s.bottom}><Text style={s.duration}>◷ {Math.max(1, Math.round(Number(item.duration_minutes || 60) / 60))}–{Math.max(2, Math.round(Number(item.duration_minutes || 60) / 60) + 1)} hrs</Text><Text style={s.price}>From ₹{Number(item.base_price).toLocaleString("en-IN")}</Text></View></View><Text style={s.chevron}>›</Text></TouchableOpacity>;

  return <View style={[s.screen, { paddingTop: insets.top }]}><View style={s.header}><Text style={s.title}>Explore Poojas</Text><Text style={s.titleHindi}>पूजाएं खोजें</Text><View style={s.search}><Text style={s.searchIcon}>⌕</Text><TextInput value={query} onChangeText={setQuery} style={s.input} placeholder="Search poojas in English or हिंदी" placeholderTextColor="#A49A91" /></View><FlatList horizontal data={categories} keyExtractor={(item) => item} showsHorizontalScrollIndicator={false} contentContainerStyle={s.categories} renderItem={({ item }) => <TouchableOpacity style={[s.category, category === item && s.categoryActive]} onPress={() => setCategory(item)}><Text style={[s.categoryText, category === item && s.categoryTextActive]}>{item}</Text></TouchableOpacity>} /><Text style={s.count}>{results.length} ceremonies found</Text></View>{loading ? <View style={s.center}><ActivityIndicator color="#913B3B" /></View> : <FlatList data={results} keyExtractor={(item) => String(item.id)} renderItem={renderItem} contentContainerStyle={s.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#913B3B" />} ListEmptyComponent={<Text style={s.empty}>No matching ceremonies found.</Text>} />}</View>;
}

const s = StyleSheet.create({ screen: { flex: 1, backgroundColor: "#FAF7F2" }, header: { paddingTop: 15 }, title: { color: "#2E2925", fontSize: 24, fontWeight: "800", paddingHorizontal: 11 }, titleHindi: { color: "#948A81", fontSize: 11, marginTop: 4, paddingHorizontal: 11 }, search: { height: 45, marginHorizontal: 11, marginTop: 15, borderRadius: 10, backgroundColor: "#F6F1E9", flexDirection: "row", alignItems: "center", paddingHorizontal: 13 }, searchIcon: { color: "#9A9087", fontSize: 21 }, input: { flex: 1, height: 45, color: "#332D29", fontSize: 12, marginLeft: 9 }, categories: { paddingHorizontal: 11, gap: 7, paddingTop: 9 }, category: { height: 32, borderRadius: 17, borderWidth: 1, borderColor: "#E5D9CD", paddingHorizontal: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#FBF8F3" }, categoryActive: { backgroundColor: "#913B3B", borderColor: "#913B3B" }, categoryText: { color: "#837970", fontSize: 11 }, categoryTextActive: { color: "white", fontWeight: "700" }, count: { color: "#9B9188", fontSize: 10, margin: 11 }, list: { paddingHorizontal: 11, paddingBottom: 25 }, card: { minHeight: 125, borderRadius: 14, borderWidth: 1, borderColor: "#E8DCD1", backgroundColor: "#FFFDFC", marginBottom: 10, padding: 10, flexDirection: "row", alignItems: "center" }, image: { width: 76, height: 104, borderRadius: 10, backgroundColor: "#EEF2F7", alignItems: "center", justifyContent: "center" }, imageText: { color: "#9BAABE", fontSize: 30 }, copy: { flex: 1, marginLeft: 12 }, name: { color: "#342E2A", fontSize: 13, fontWeight: "800" }, hindi: { color: "#92877E", fontSize: 9, marginTop: 3 }, description: { color: "#81776E", fontSize: 10, lineHeight: 15, marginTop: 7 }, bottom: { flexDirection: "row", alignItems: "center", marginTop: 7 }, duration: { color: "#92877E", fontSize: 9 }, price: { color: "#9A3F3F", fontSize: 10, fontWeight: "800", marginLeft: 10 }, chevron: { color: "#91877E", fontSize: 22, marginLeft: 3 }, center: { flex: 1, alignItems: "center", justifyContent: "center" }, empty: { textAlign: "center", color: "#948A81", marginTop: 50 } });
