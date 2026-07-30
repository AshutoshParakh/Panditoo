import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import SectionTitle from "./SectionTitle";
import { colors, shadow } from "../../theme/homeTheme";

const duration = (minutes) => {
  const value = Number(minutes || 60);
  return value >= 60 ? `${Number.isInteger(value / 60) ? value / 60 : (value / 60).toFixed(1)} hr` : `${value} min`;
};

export default function PopularPoojas({ poojas, onSelect, onViewAll }) {
  const items = poojas.slice(0, 7);
  return (
    <View style={s.section}>
      <SectionTitle title="Popular Poojas" hindi="सभी पूजाएं और अनुष्ठान" onViewAll={onViewAll} />
      {items.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.list}>{items.map((item, index) => (
        <TouchableOpacity key={item.id} activeOpacity={0.78} style={s.card} onPress={() => onSelect(item)}>
          <View style={s.visual}><Text style={s.index}>{String(index + 1).padStart(2, "0")}</Text><Text style={s.om}>ॐ</Text><View style={s.line} /></View>
          <View style={s.copy}><Text numberOfLines={1} style={s.name}>{item.name}</Text>{item.name_hi ? <Text numberOfLines={1} style={s.hindi}>{item.name_hi}</Text> : null}<View style={s.meta}><Text style={s.duration}>{duration(item.duration_minutes)}</Text><Text style={s.price}>₹{Number(item.base_price || 0).toLocaleString("en-IN")}</Text></View></View>
        </TouchableOpacity>
      ))}</ScrollView> : <Text style={s.empty}>No poojas available right now.</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  section: { marginBottom: 25 }, list: { gap: 12, paddingBottom: 3 }, card: { width: 174, minHeight: 174, backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: "hidden", ...shadow },
  visual: { height: 82, backgroundColor: "#F1E9E2", alignItems: "center", justifyContent: "center" }, index: { position: "absolute", top: 9, left: 11, color: "#B3A297", fontSize: 8, fontWeight: "800", letterSpacing: 1 }, om: { color: colors.primary, fontSize: 29 }, line: { position: "absolute", bottom: 0, width: 32, height: 2, backgroundColor: "#B67B55" },
  copy: { padding: 12 }, name: { color: colors.ink, fontSize: 13, fontWeight: "800" }, hindi: { color: colors.muted, fontSize: 9, marginTop: 3 }, meta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 }, duration: { color: colors.muted, fontSize: 9, fontWeight: "600" }, price: { color: colors.primary, fontSize: 11, fontWeight: "800" }, empty: { color: colors.muted, fontSize: 12 },
});
