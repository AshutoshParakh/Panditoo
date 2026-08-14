import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { API_URL } from "../config/api";
const TABS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "awaiting", label: "Awaiting" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const statusConfig = {
  confirmed: { label: "Confirmed", color: "#27845D", background: "#E9F7EF" },
  pending: { label: "Awaiting", color: "#A76D20", background: "#FFF4DE" },
  completed: { label: "Completed", color: "#536E91", background: "#EDF3FA" },
  cancelled: { label: "Cancelled", color: "#A44747", background: "#FBECEC" },
  expired: { label: "Expired", color: "#776F68", background: "#F0ECE8" },
};

export default function BookingsScreen({ navigation }) {
  const { i18n } = useTranslation();
  const language = i18n.language || "en";
  const focused = useIsFocused();
  const insets = useSafeAreaInsets();
  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [error, setError] = useState("");

  const fetchBookings = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      const [token, userId] = await Promise.all([AsyncStorage.getItem("user-app-token"), AsyncStorage.getItem("user-id")]);
      if (!token || !userId) throw new Error("Please log in to view bookings.");
      const response = await fetch(`${API_URL}/bookings/user/${userId}?limit=100`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.message || "Unable to load bookings.");
      setBookings(json.data || []);
    } catch (requestError) {
      setBookings([]);
      setError(requestError.message || "Unable to load bookings.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!focused) return undefined;
    fetchBookings();
    const timer = setInterval(() => fetchBookings(true), 10000);
    return () => clearInterval(timer);
  }, [focused, fetchBookings]);

  const visibleBookings = useMemo(() => bookings.filter((booking) => {
    if (activeTab === "upcoming") return booking.status === "confirmed";
    if (activeTab === "awaiting") return booking.status === "pending";
    if (activeTab === "completed") return booking.status === "completed";
    return ["cancelled", "expired"].includes(booking.status);
  }), [activeTab, bookings]);

  const openBooking = (booking) => {
    if (booking.status === "completed") return navigation.navigate("RateExperience", { booking });
    if (booking.status === "confirmed") return navigation.navigate("BookingConfirmed", { booking });
    if (booking.status === "pending" && booking.prepaid_status === "paid") return navigation.navigate("WaitingForPandit", { bookingId: booking.id, poojaName: language === "hi" ? booking.name_hi : booking.name_en });
    if (booking.status === "pending") return navigation.navigate("ConfirmBooking", { existingBooking: booking, pooja: { id: booking.pooja_type_id, name: language === "hi" ? booking.name_hi : booking.name_en, base_price: booking.total_price }, bookingDate: booking.booking_date, bookingTime: booking.booking_time, address: booking.address });
  };

  const confirmCancellation = (booking) => navigation.navigate("CancelBooking", { booking });

  const renderBooking = ({ item }) => {
    const baseStatus = statusConfig[item.status] || statusConfig.pending;
    const status = item.service_otp ? { label: "OTP READY", color: "#FFFFFF", background: "#9A2020" } : baseStatus;
    const ceremonyName = language === "hi" ? item.name_hi || item.name_en : item.name_en || item.name_hi;
    const name = item.service_otp ? `OTP ${item.service_otp.code} · ${item.service_otp.phase === "start" ? "START" : "COMPLETE"}` : ceremonyName;
    const date = new Date(item.booking_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const paid = Number(item.prepaid_amount || 0);
    return <View style={s.card}><View style={s.cardHeader}><View style={s.poojaIcon}><Text style={s.spark}>✦</Text></View><View style={s.titleCopy}><Text numberOfLines={1} style={s.cardTitle}>{name}</Text>{item.name_hi && language !== "hi" ? <Text numberOfLines={1} style={s.hindiName}>{item.name_hi}</Text> : null}</View><Text style={[s.status, { color: status.color, backgroundColor: status.background }]}>{status.label}</Text></View><View style={s.rule} /><Text style={s.meta}>▣ {date}    ◷ {item.booking_time}</Text>{item.address ? <Text numberOfLines={1} style={s.meta}>● {item.address}</Text> : null}{item.confirmed_pandit?.name ? <View style={s.panditRow}><View style={s.panditAvatar}><Text style={s.om}>ॐ</Text></View><Text numberOfLines={1} style={s.panditName}>{item.confirmed_pandit.name}</Text><Text style={s.confirmedDot}>● Confirmed</Text></View> : null}<View style={s.priceRow}><View><Text style={s.price}>₹{Number(item.total_price || 0).toLocaleString("en-IN")}</Text>{paid > 0 ? <Text style={s.paid}>₹{paid.toLocaleString("en-IN")} paid · balance payable to pandit</Text> : <Text style={s.paid}>Payment pending</Text>}<Text style={s.reference}>#{String(item.id).slice(0, 8).toUpperCase()}</Text></View><View style={s.actions}>{item.status === "pending" ? <TouchableOpacity style={s.cancelButton} onPress={() => confirmCancellation(item)}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity> : null}{!["cancelled", "expired"].includes(item.status) ? <TouchableOpacity style={s.detailsButton} onPress={() => openBooking(item)}><Text style={s.detailsText}>{item.status === "pending" && item.prepaid_status !== "paid" ? "Pay Now" : "View Details"}</Text></TouchableOpacity> : null}</View></View></View>;
  };

  return <View style={[s.screen, { paddingTop: insets.top }]}><View style={s.header}><View><Text style={s.heading}>My Bookings</Text><Text style={s.subtitle}>Manage all your ceremony bookings</Text></View><TouchableOpacity style={s.language} onPress={() => i18n.changeLanguage(language === "hi" ? "en" : "hi")}><Text style={s.languageText}>{language === "hi" ? "English" : "मेरी बुकिंग"}</Text></TouchableOpacity></View><View style={s.tabs}>{TABS.map((tab) => <TouchableOpacity key={tab.key} style={[s.tab, activeTab === tab.key && s.activeTab]} onPress={() => setActiveTab(tab.key)}><Text style={[s.tabText, activeTab === tab.key && s.activeTabText]}>{tab.label}</Text></TouchableOpacity>)}</View>{loading ? <View style={s.center}><ActivityIndicator color="#8F3030" /></View> : <FlatList data={visibleBookings} keyExtractor={(item) => String(item.id)} renderItem={renderBooking} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchBookings(true)} tintColor="#8F3030" />} contentContainerStyle={s.list} ListEmptyComponent={<View style={s.empty}><Text style={s.emptyTitle}>{error || `No ${activeTab} bookings`}</Text>{error ? <TouchableOpacity onPress={() => fetchBookings()}><Text style={s.retry}>Try again</Text></TouchableOpacity> : null}</View>} />}</View>;
}

const s = StyleSheet.create({ screen: { flex: 1, backgroundColor: "#FAF7F2" }, header: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }, heading: { color: "#2E2925", fontSize: 24, fontWeight: "800" }, subtitle: { color: "#9B9188", fontSize: 12, marginTop: 5 }, language: { borderWidth: 1, borderColor: "#E8DED3", paddingHorizontal: 10, paddingVertical: 8, borderRadius: 18, backgroundColor: "#FFFDF9" }, languageText: { color: "#80766D", fontSize: 10 }, tabs: { height: 48, flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#E9E0D7", paddingHorizontal: 14 }, tab: { flex: 1, alignItems: "center", justifyContent: "center" }, activeTab: { borderBottomWidth: 2, borderBottomColor: "#9B3B3B" }, tabText: { color: "#938980", fontSize: 12, fontWeight: "700" }, activeTabText: { color: "#9B3B3B" }, list: { padding: 17, paddingBottom: 30, flexGrow: 1 }, card: { backgroundColor: "#FFFDFC", borderWidth: 1, borderColor: "#E9DED4", borderRadius: 15, padding: 14, marginBottom: 13, shadowColor: "#6D5040", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 }, cardHeader: { flexDirection: "row", alignItems: "center" }, poojaIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: "#F7D9D6", alignItems: "center", justifyContent: "center" }, spark: { color: "#943C3C", fontSize: 19 }, titleCopy: { flex: 1, marginLeft: 10 }, cardTitle: { color: "#332D29", fontSize: 14, fontWeight: "800" }, hindiName: { color: "#9B9188", fontSize: 9, marginTop: 3 }, status: { overflow: "hidden", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 12, fontSize: 9, fontWeight: "700" }, rule: { height: 1, backgroundColor: "#E9DED4", marginVertical: 10 }, meta: { color: "#8E847B", fontSize: 10, marginBottom: 7 }, panditRow: { minHeight: 39, backgroundColor: "#F5F1EB", borderRadius: 9, flexDirection: "row", alignItems: "center", paddingHorizontal: 9, marginTop: 3 }, panditAvatar: { width: 25, height: 25, borderRadius: 13, backgroundColor: "#E8DED3", alignItems: "center", justifyContent: "center" }, om: { color: "#8F3030", fontSize: 12 }, panditName: { flex: 1, color: "#80766D", fontSize: 10, marginLeft: 8 }, confirmedDot: { color: "#27845D", fontSize: 9, fontWeight: "700" }, priceRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: 13 }, price: { color: "#332D29", fontSize: 19, fontWeight: "800" }, paid: { color: "#9B9188", fontSize: 9, marginTop: 3, maxWidth: 170 }, reference: { color: "#AFA59D", fontSize: 8, marginTop: 5 }, actions: { flexDirection: "row", alignItems: "center", gap: 7 }, cancelButton: { height: 34, minWidth: 60, borderWidth: 1, borderColor: "#E1B7B2", borderRadius: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 }, cancelText: { color: "#A44747", fontSize: 10, fontWeight: "700" }, detailsButton: { height: 36, borderWidth: 1, borderColor: "#D8AAA5", backgroundColor: "#FBE9E6", borderRadius: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 13 }, detailsText: { color: "#943C3C", fontSize: 10, fontWeight: "700" }, center: { flex: 1, alignItems: "center", justifyContent: "center" }, empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 90 }, emptyTitle: { color: "#938980", textAlign: "center" }, retry: { color: "#943C3C", fontWeight: "700", marginTop: 12 } });
