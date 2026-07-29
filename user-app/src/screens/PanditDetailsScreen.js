import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme/homeTheme";

export default function PanditDetailsScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const pandit = route.params?.pandit;
  if (!pandit) return <View style={s.center}><Text style={s.muted}>Pandit details are unavailable.</Text></View>;
  const book = () => navigation.navigate("Main", { screen: "ExploreTab", params: { searchQuery: pandit.specializations?.[0] || "" } });
  return <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 24 }]}><View style={s.avatar}><Text style={s.om}>ॐ</Text></View><Text style={s.name}>{pandit.name}</Text>{pandit.is_verified ? <Text style={s.verified}>✓ Verified pandit</Text> : null}<View style={s.card}>{pandit.rating != null ? <Text style={s.row}>Rating: {pandit.rating} ({pandit.total_ratings_count || 0} reviews)</Text> : null}{pandit.experience_years != null ? <Text style={s.row}>Experience: {pandit.experience_years} years</Text> : null}{pandit.languages?.length ? <Text style={s.row}>Languages: {pandit.languages.join(", ")}</Text> : null}{pandit.specializations?.length ? <Text style={s.row}>Specializations: {pandit.specializations.join(", ")}</Text> : null}</View><TouchableOpacity style={s.button} onPress={book}><Text style={s.buttonText}>Choose a Pooja</Text></TouchableOpacity></ScrollView>;
}
const s = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.bg }, content: { padding: 20, alignItems: "center" }, center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }, avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.soft, alignItems: "center", justifyContent: "center", marginTop: 18 }, om: { color: colors.primary, fontSize: 38 }, name: { color: colors.ink, fontSize: 23, fontWeight: "800", marginTop: 14 }, verified: { color: colors.green, fontWeight: "700", marginTop: 6 }, card: { width: "100%", backgroundColor: "white", borderWidth: 1, borderColor: colors.border, borderRadius: 15, padding: 18, marginTop: 24 }, row: { color: colors.ink, marginBottom: 12 }, muted: { color: colors.muted }, button: { width: "100%", height: 48, backgroundColor: colors.primary, borderRadius: 24, alignItems: "center", justifyContent: "center", marginTop: 20 }, buttonText: { color: "white", fontWeight: "700" } });
