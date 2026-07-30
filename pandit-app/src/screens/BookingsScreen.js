import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Linking, Platform, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { colors, money, shadow } from "../theme";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000/api";

export default function BookingsScreen({ navigation }) {
  const { i18n } = useTranslation();
  const hindi = i18n.language === "hi";
  const { token, pandit } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [tab, setTab] = useState("upcoming");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [error, setError] = useState("");

  const fetchBookings = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true); setError("");
    try {
      const response = await fetch(`${API_URL}/bookings/pandit/bookings`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.message || "Unable to load bookings.");
      setBookings((json.data || []).sort((a, b) => new Date(b.booking_date) - new Date(a.booking_date)));
    } catch (requestError) { setBookings([]); setError(requestError.message || "Unable to load bookings."); }
    finally { setLoading(false); setRefreshing(false); }
  }, [token]);

  useFocusEffect(useCallback(() => { if (pandit) fetchBookings(); }, [fetchBookings, pandit]));
  const visible = useMemo(() => bookings.filter((item) => tab === "completed" ? item.booking_status === "completed" : item.booking_status !== "completed"), [bookings, tab]);

  const completeBooking = (booking) => Alert.alert(hindi ? "पूजा पूर्ण करें?" : "Mark ceremony complete?", hindi ? "केवल पूजा संपन्न होने के बाद पुष्टि करें।" : "Confirm only after the ceremony has been completed.", [{ text: hindi ? "रद्द करें" : "Cancel", style: "cancel" }, { text: hindi ? "पूर्ण हुई" : "Yes, completed", onPress: async () => {
    setActionId(booking.booking_id);
    try { const response = await fetch(`${API_URL}/bookings/${booking.booking_id}/complete`, { method: "POST", headers: { Authorization: `Bearer ${token}` } }); const json = await response.json(); if (!response.ok || !json.success) throw new Error(json.message || "Unable to update booking."); setBookings((current) => current.map((item) => item.booking_id === booking.booking_id ? { ...item, booking_status: "completed" } : item)); }
    catch (requestError) { Alert.alert(hindi ? "अपडेट नहीं हुआ" : "Update failed", requestError.message); } finally { setActionId(null); }
  } }]);
  const call = (phone) => phone ? Linking.openURL(`tel:${phone}`).catch(() => {}) : Alert.alert(hindi ? "नंबर उपलब्ध नहीं" : "Phone unavailable");
  const directions = (item) => {
    const query = item.latitude && item.longitude ? `${item.latitude},${item.longitude}` : item.address;
    const url = Platform.select({ ios: `maps:0,0?q=${encodeURIComponent(query)}`, android: `geo:0,0?q=${encodeURIComponent(query)}` });
    Linking.openURL(url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`).catch(() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`));
  };

  const renderBooking = ({ item }) => {
    const completed = item.booking_status === "completed";
    const name = hindi ? item.pooja_name_hi || item.pooja_name_en : item.pooja_name_en || item.pooja_name_hi;
    const date = new Date(item.booking_date).toLocaleDateString(hindi ? "hi-IN" : "en-IN", { weekday: "short", day: "2-digit", month: "short" });
    return <TouchableOpacity activeOpacity={0.78} style={s.card} onPress={() => navigation.navigate("BookingDetail", { bookingId: item.booking_id })}>
      <View style={s.cardTop}><View style={s.omBox}><Text style={s.om}>ॐ</Text></View><View style={s.titleCopy}><Text numberOfLines={1} style={s.cardTitle}>{name}</Text><Text style={s.reference}>#{String(item.booking_id).slice(0, 8).toUpperCase()}</Text></View><View style={[s.status, completed ? s.statusDone : s.statusUpcoming]}><Text style={[s.statusText, completed ? s.doneText : s.upcomingText]}>{completed ? (hindi ? "पूर्ण" : "Completed") : (hindi ? "आगामी" : "Upcoming")}</Text></View></View>
      <View style={s.schedule}><View><Text style={s.scheduleLabel}>{hindi ? "तारीख" : "DATE"}</Text><Text style={s.scheduleValue}>{date}</Text></View><View style={s.scheduleRule} /><View><Text style={s.scheduleLabel}>{hindi ? "समय" : "TIME"}</Text><Text style={s.scheduleValue}>{String(item.booking_time || "—").slice(0, 5)}</Text></View><View style={s.scheduleRule} /><View><Text style={s.scheduleLabel}>{hindi ? "आपकी आय" : "YOUR PAYOUT"}</Text><Text style={s.payout}>{money(item.pandit_payout_amount)}</Text></View></View>
      <View style={s.customer}><View style={s.avatar}><Text style={s.avatarText}>{String(item.user_name || "C").charAt(0)}</Text></View><View style={s.customerCopy}><Text style={s.customerLabel}>{hindi ? "भक्त" : "CUSTOMER"}</Text><Text style={s.customerName}>{item.user_name || (hindi ? "ग्राहक" : "Customer")}</Text><Text numberOfLines={1} style={s.address}>{item.address}</Text></View><Text style={s.chevron}>›</Text></View>
      {!completed ? <View style={s.actions}><TouchableOpacity style={s.outlineButton} onPress={() => call(item.user_phone)}><Text style={s.outlineText}>{hindi ? "कॉल" : "Call"}</Text></TouchableOpacity><TouchableOpacity style={s.outlineButton} onPress={() => directions(item)}><Text style={s.outlineText}>{hindi ? "दिशा" : "Directions"}</Text></TouchableOpacity><TouchableOpacity style={s.completeButton} disabled={actionId === item.booking_id} onPress={() => completeBooking(item)}>{actionId === item.booking_id ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={s.completeText}>{hindi ? "पूजा पूर्ण" : "Mark complete"}</Text>}</TouchableOpacity></View> : null}
    </TouchableOpacity>;
  };

  return <SafeAreaView style={s.screen}><FlatList data={visible} keyExtractor={(item) => String(item.booking_id)} renderItem={renderBooking} showsVerticalScrollIndicator={false} contentContainerStyle={s.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchBookings(true)} tintColor={colors.primary} />} ListHeaderComponent={<View><View style={s.header}><Text style={s.eyebrow}>{hindi ? "कार्य सूची" : "WORK SCHEDULE"}</Text><Text style={s.heading}>{hindi ? "मेरी बुकिंग" : "My bookings"}</Text><Text style={s.subtitle}>{hindi ? "अपनी आगामी और पूर्ण पूजाएं प्रबंधित करें।" : "Manage your upcoming and completed ceremonies."}</Text></View><View style={s.tabs}>{["upcoming", "completed"].map((item) => <TouchableOpacity key={item} style={[s.tab, tab === item && s.activeTab]} onPress={() => setTab(item)}><Text style={[s.tabText, tab === item && s.activeTabText]}>{item === "upcoming" ? (hindi ? "आगामी" : "Upcoming") : (hindi ? "पूर्ण" : "Completed")}</Text><Text style={[s.tabCount, tab === item && s.activeTabText]}>{bookings.filter((booking) => item === "completed" ? booking.booking_status === "completed" : booking.booking_status !== "completed").length}</Text></TouchableOpacity>)}</View></View>} ListEmptyComponent={loading ? <View style={s.state}><ActivityIndicator color={colors.primary} /></View> : <View style={s.state}><Text style={s.emptyTitle}>{hindi ? "कोई बुकिंग नहीं" : "No bookings here"}</Text><Text style={s.stateText}>{error || (hindi ? "नई बुकिंग यहां दिखाई देगी।" : "New bookings will appear here.")}</Text>{error ? <TouchableOpacity onPress={() => fetchBookings()}><Text style={s.retry}>Try again</Text></TouchableOpacity> : null}</View>} /></SafeAreaView>;
}

const s = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.bg }, list: { paddingHorizontal: 17, paddingBottom: 28, flexGrow: 1 }, header: { paddingTop: 7, paddingBottom: 15 }, eyebrow: { color: colors.primary, fontSize: 8, fontWeight: "800", letterSpacing: 1.4 }, heading: { color: colors.ink, fontSize: 27, fontWeight: "800", marginTop: 5 }, subtitle: { color: colors.muted, fontSize: 10, marginTop: 4 }, tabs: { height: 43, borderRadius: 12, backgroundColor: "#EDE7E1", padding: 4, flexDirection: "row", marginBottom: 5 }, tab: { flex: 1, borderRadius: 9, flexDirection: "row", alignItems: "center", justifyContent: "center" }, activeTab: { backgroundColor: colors.surface, ...shadow }, tabText: { color: colors.muted, fontSize: 10, fontWeight: "800" }, activeTabText: { color: colors.primary }, tabCount: { color: colors.muted, fontSize: 8, fontWeight: "800", marginLeft: 6 }, card: { backgroundColor: colors.surface, borderRadius: 17, borderWidth: 1, borderColor: colors.border, padding: 14, marginTop: 11, ...shadow }, cardTop: { flexDirection: "row", alignItems: "center" }, omBox: { width: 43, height: 43, borderRadius: 11, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }, om: { color: colors.primary, fontSize: 20 }, titleCopy: { flex: 1, marginLeft: 10 }, cardTitle: { color: colors.ink, fontSize: 13, fontWeight: "800" }, reference: { color: colors.muted, fontSize: 7, marginTop: 3 }, status: { borderRadius: 9, paddingHorizontal: 8, paddingVertical: 5 }, statusDone: { backgroundColor: colors.greenSoft }, statusUpcoming: { backgroundColor: colors.blueSoft }, statusText: { fontSize: 7, fontWeight: "800" }, doneText: { color: colors.green }, upcomingText: { color: colors.blue }, schedule: { minHeight: 57, borderRadius: 11, backgroundColor: "#F5F1ED", flexDirection: "row", alignItems: "center", justifyContent: "space-around", marginTop: 13, paddingHorizontal: 6 }, scheduleLabel: { color: colors.muted, fontSize: 6, fontWeight: "800", letterSpacing: 0.6 }, scheduleValue: { color: "#504842", fontSize: 9, fontWeight: "800", marginTop: 4 }, payout: { color: colors.green, fontSize: 11, fontWeight: "800", marginTop: 3 }, scheduleRule: { width: 1, height: 29, backgroundColor: "#DDD4CC" }, customer: { flexDirection: "row", alignItems: "center", marginTop: 13 }, avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#EEE6DF", alignItems: "center", justifyContent: "center" }, avatarText: { color: colors.primary, fontSize: 11, fontWeight: "800" }, customerCopy: { flex: 1, marginLeft: 9 }, customerLabel: { color: colors.muted, fontSize: 6, fontWeight: "800" }, customerName: { color: colors.ink, fontSize: 10, fontWeight: "800", marginTop: 2 }, address: { color: colors.muted, fontSize: 7, marginTop: 2 }, chevron: { color: "#9D9188", fontSize: 20 }, actions: { flexDirection: "row", gap: 7, marginTop: 13, borderTopWidth: 1, borderTopColor: "#EFE8E2", paddingTop: 12 }, outlineButton: { height: 37, minWidth: 60, borderRadius: 10, borderWidth: 1, borderColor: "#DCCFC5", alignItems: "center", justifyContent: "center", paddingHorizontal: 10 }, outlineText: { color: "#625851", fontSize: 8, fontWeight: "800" }, completeButton: { flex: 1, height: 37, borderRadius: 10, backgroundColor: colors.green, alignItems: "center", justifyContent: "center" }, completeText: { color: "#FFFFFF", fontSize: 8, fontWeight: "800" }, state: { alignItems: "center", paddingTop: 100 }, emptyTitle: { color: colors.ink, fontSize: 14, fontWeight: "800" }, stateText: { color: colors.muted, fontSize: 9, textAlign: "center", marginTop: 7 }, retry: { color: colors.primary, fontSize: 10, fontWeight: "800", marginTop: 13 } });
