import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import SectionTitle from "./SectionTitle";
import { colors } from "../../theme/homeTheme";

export default function PopularPoojas({ poojas, onSelect, onViewAll }) {
  const items = poojas.slice(0, 7);
  return <View style={s.section}><SectionTitle title="Popular Poojas" hindi="सभी पूजाएं और अनुष्ठान" onViewAll={onViewAll} />{items.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.list}>{items.map((item) => <TouchableOpacity key={item.id} style={s.item} onPress={() => onSelect(item)}><View style={s.image}><Text style={s.icon}>ॐ</Text></View><Text numberOfLines={1} style={s.name}>{item.name}</Text>{item.name_hi ? <Text numberOfLines={1} style={s.hindi}>{item.name_hi}</Text> : null}</TouchableOpacity>)}</ScrollView> : <Text style={s.empty}>No poojas available right now.</Text>}</View>;
}
const s = StyleSheet.create({ section: { marginBottom: 24 }, list: { gap: 12 }, item: { width: 76, alignItems: "center" }, image: { width: 52, height: 52, borderRadius: 12, backgroundColor: "#EDF1EC", borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }, icon: { color: colors.primary, fontSize: 25 }, name: { color: colors.ink, fontSize: 10, marginTop: 6, width: 76, textAlign: "center" }, hindi: { color: colors.muted, fontSize: 8, marginTop: 3, width: 76, textAlign: "center" }, empty: { color: colors.muted, fontSize: 12 } });
