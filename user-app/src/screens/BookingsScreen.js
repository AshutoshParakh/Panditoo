import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000/api";

export default function BookingsScreen({ navigation }) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language || "en";
  const focused = useIsFocused();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchBookings = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [token, userId] = await Promise.all([AsyncStorage.getItem("user-app-token"), AsyncStorage.getItem("user-id")]);
      if (!token || !userId) throw new Error("Please log in to view bookings.");
      const response = await fetch(`${API_URL}/bookings/user/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.message || "Unable to load bookings.");
      setBookings((json.data || []).sort((a, b) => new Date(b.booking_date) - new Date(a.booking_date)));
    } catch (requestError) { setBookings([]); setError(requestError.message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (focused) fetchBookings(); }, [focused, fetchBookings]);

  const openBooking = (booking) => {
    if (booking.status === "completed") navigation.navigate("RateExperience", { booking });
    else if (booking.status === "confirmed") navigation.navigate("BookingConfirmed", { booking });
    else if (booking.status === "pending" && booking.prepaid_status === "paid") navigation.navigate("WaitingForPandit", { bookingId: booking.id, poojaName: currentLang === "hi" ? booking.name_hi : booking.name_en });
    else if (booking.status === "pending") navigation.navigate("ConfirmBooking", { pooja: { id: booking.pooja_type_id, name: currentLang === "hi" ? booking.name_hi : booking.name_en, base_price: booking.total_price }, bookingDate: booking.booking_date, bookingTime: booking.booking_time, address: booking.address });
  };

  const statusColor = (status) => status === "confirmed" ? "#047857" : status === "completed" ? "#1d4ed8" : status === "cancelled" ? "#b91c1c" : "#b45309";
  const renderItem = ({ item }) => <TouchableOpacity style={s.card} onPress={() => openBooking(item)}><View style={s.row}><Text style={s.title}>{currentLang === "hi" ? item.name_hi || item.name_en : item.name_en}</Text><Text style={[s.status, { color: statusColor(item.status) }]}>{item.status}</Text></View><Text style={s.detail}>{new Date(item.booking_date).toLocaleDateString()} at {item.booking_time}</Text>{item.confirmed_pandit?.name ? <Text style={s.detail}>{item.confirmed_pandit.name}</Text> : null}{item.total_price != null ? <Text style={s.detail}>₹{item.total_price}</Text> : null}</TouchableOpacity>;

  if (loading) return <SafeAreaView style={s.center}><ActivityIndicator color="#6a1b1a" /></SafeAreaView>;
  return <SafeAreaView style={s.container}><FlatList data={bookings} keyExtractor={(item) => String(item.id)} renderItem={renderItem} contentContainerStyle={s.list} ListEmptyComponent={<View style={s.empty}><Text style={s.emptyText}>{error || "No bookings found yet"}</Text>{error ? <TouchableOpacity onPress={fetchBookings}><Text style={s.retry}>Try again</Text></TouchableOpacity> : null}</View>} /></SafeAreaView>;
}

const s = StyleSheet.create({ container: { flex: 1, backgroundColor: "#f7efe5" }, center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f7efe5" }, list: { padding: 20, flexGrow: 1 }, card: { backgroundColor: "white", borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: "#e3d5c5" }, row: { flexDirection: "row", alignItems: "flex-start" }, title: { flex: 1, color: "#6a1b1a", fontSize: 16, fontWeight: "700" }, status: { fontWeight: "700", textTransform: "capitalize", marginLeft: 8 }, detail: { color: "#5f4b3a", marginTop: 7 }, empty: { flex: 1, alignItems: "center", justifyContent: "center" }, emptyText: { color: "#a08f80", textAlign: "center" }, retry: { color: "#6a1b1a", fontWeight: "700", marginTop: 14 } });
