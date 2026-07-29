import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import useLiveRefresh from "../hooks/useLiveRefresh";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000/api";
const tabs = ["Upcoming", "Awaiting", "Completed", "Cancelled"];

export default function BookingsScreen({ navigation }) {
  const { i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [bookings, setBookings] = useState([]);
  const [tab, setTab] = useState("Upcoming");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const [token, userId] = await Promise.all([AsyncStorage.getItem("user-app-token"), AsyncStorage.getItem("user-id")]);
      if (!token || !userId) throw new Error();
      const response = await fetch(`${API_URL}/bookings/user/${userId}?limit=100`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await response.json();
      setBookings(response.ok && json.success ? json.data || [] : []);
    } catch (_) { setBookings([]); } finally { setLoading(false); setRefreshing(false); }
  }, []);
  useLiveRefresh(load, 10000);

  const visible = useMemo(() => bookings.filter((item) => tab === "Upcoming" ? item.status === "confirmed" : tab === "Awaiting" ? item.status === "pending" : tab === "Completed" ? item.status === "completed" : ["cancelled", "expired"].includes(item.status)), [bookings, tab]);
  const open = (booking) => {
    if (booking.status === "completed") navigation.navigate("RateExperience", { booking });
    else if (booking.status === "confirmed") navigation.navigate("BookingConfirmed", { booking });
    else if (booking.status === "pending" && booking.prepaid_status === "paid") navigation.navigate("WaitingForPandit", { bookingId: booking.id, poojaName: booking.name_en });
    else if (booking.status === "pending") navigation.navigate("ConfirmBooking", { pooja: { id: booking.pooja_type_id, name: booking.name_en, base_price: booking.total_price }, bookingDate: booking.booking_date, bookingTime: booking.booking_time, address: booking.address });
  };

  return <View style={[s.screen, { paddingTop: insets.top + 14 }]}><View style={s.header}><Text style={s.heading}>My Bookings</Text><Text style={s.subtitle}>Manage all your ceremony bookings</Text></View><View style={s.tabs}>{tabs.map((item) => <TouchableOpacity key={item} style={[s.tab, tab === item && s.activeTab]} onPress={() => setTab(item)}><Text style={[s.tabText, tab === item && s.activeText]}>{item}</Text></TouchableOpacity>)}</View>{loading ? <View style={s.center}><ActivityIndicator color="#913B3B" /></View> : <FlatList data={visible} keyExtractor={(item) => String(item.id)} contentContainerStyle={s.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#913B3B" />} ListEmptyComponent={<Text style={s.empty}>No {tab.toLowerCase()} bookings.</Text>} renderItem={({ item }) => <TouchableOpacity style={s.card} onPress={() => open(item)}><View style={s.top}><View style={s.icon}><Text style={s.spark}>✦</Text></View><View style={s.copy}><Text style={s.name}>{i18n.language === "hi" ? item.name_hi || item.name_en : item.name_en}</Text>{item.name_hi && i18n.language !== "hi" ? <Text style={s.hindi}>{item.name_hi}</Text> : null}</View><Text style={s.status}>{item.status}</Text></View><View style={s.rule} /><Text style={s.meta}>▣ {new Date(item.booking_date).toLocaleDateString("en-IN")}   ◷ {item.booking_time}</Text><Text numberOfLines={1} style={s.meta}>● {item.address}</Text>{item.confirmed_pandit?.name ? <View style={s.pandit}><Text style={s.panditName}>ॐ  {item.confirmed_pandit.name}</Text><Text style={s.confirmed}>● Confirmed</Text></View> : null}<View style={s.bottom}><View><Text style={s.price}>₹{Number(item.total_price).toLocaleString("en-IN")}</Text><Text style={s.paid}>{Number(item.prepaid_amount) > 0 ? `₹${Number(item.prepaid_amount).toLocaleString("en-IN")} paid` : "Payment pending"}</Text></View><Text style={s.details}>{item.status === "pending" && item.prepaid_status !== "paid" ? "Pay Now" : "View Details"}</Text></View></TouchableOpacity>} />}</View>;
}
const s = StyleSheet.create({ screen: { flex: 1, backgroundColor: "#FAF7F2" }, header: { paddingHorizontal: 18 }, heading: { color: "#2D2824", fontSize: 24, fontWeight: "800" }, subtitle: { color: "#91877E", fontSize: 11, marginTop: 5 }, tabs: { height: 52, flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#E8DDD2", marginTop: 10 }, tab: { flex: 1, alignItems: "center", justifyContent: "center" }, activeTab: { borderBottomWidth: 2, borderBottomColor: "#913B3B" }, tabText: { color: "#92887F", fontSize: 11, fontWeight: "700" }, activeText: { color: "#913B3B" }, center: { flex: 1, alignItems: "center", justifyContent: "center" }, list: { padding: 17, flexGrow: 1 }, card: { borderWidth: 1, borderColor: "#E7DBD0", backgroundColor: "white", borderRadius: 14, padding: 14, marginBottom: 12 }, top: { flexDirection: "row", alignItems: "center" }, icon: { width: 38, height: 38, borderRadius: 10, backgroundColor: "#F7DEDB", alignItems: "center", justifyContent: "center" }, spark: { color: "#913B3B", fontSize: 19 }, copy: { flex: 1, marginLeft: 10 }, name: { color: "#342E2A", fontWeight: "800", fontSize: 13 }, hindi: { color: "#968C83", fontSize: 9, marginTop: 3 }, status: { color: "#27845D", backgroundColor: "#E9F7EF", borderRadius: 10, padding: 6, overflow: "hidden", fontSize: 9, textTransform: "capitalize" }, rule: { height: 1, backgroundColor: "#E9DED4", marginVertical: 10 }, meta: { color: "#8F857C", fontSize: 10, marginBottom: 7 }, pandit: { height: 38, backgroundColor: "#F5F1EB", borderRadius: 9, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 10 }, panditName: { color: "#756C64", fontSize: 10 }, confirmed: { color: "#27845D", fontSize: 9 }, bottom: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: 12 }, price: { color: "#342E2A", fontSize: 18, fontWeight: "800" }, paid: { color: "#9B9188", fontSize: 9, marginTop: 3 }, details: { color: "#913B3B", backgroundColor: "#FBE9E6", borderWidth: 1, borderColor: "#DDB5B1", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, overflow: "hidden", fontSize: 10, fontWeight: "700" }, empty: { textAlign: "center", color: "#91877E", marginTop: 70 } });
