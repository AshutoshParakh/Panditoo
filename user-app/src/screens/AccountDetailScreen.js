import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import useLiveRefresh from "../hooks/useLiveRefresh";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000/api";
const content = {
  help: "For booking, payment, cancellation, or pandit support, contact the Panditoo support team through your registered phone number or email.",
  about: "Panditoo connects customers with verified pandits for ceremonies and rituals. Booking and payment information is synchronized with our service in real time.",
  terms: "Bookings are subject to pandit availability. Prices, prepayment, cancellation eligibility, and any applicable refunds are shown during the booking process.",
  privacy: "We use your profile, location, booking, and payment information only to provide and support the requested services. Payment credentials are processed securely by Razorpay.",
};

export default function AccountDetailScreen({ route, navigation }) {
  const { type, user: initialUser } = route.params || {};
  const [user, setUser] = useState(initialUser || null);
  const [name, setName] = useState(initialUser?.name || "");
  const [email, setEmail] = useState(initialUser?.email || "");
  const [address, setAddress] = useState(initialUser?.address || "");
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(type === "payments");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!["payments", "addresses", "edit"].includes(type)) return;
    try {
      const token = await AsyncStorage.getItem("user-app-token");
      const response = await fetch(`${API_URL}/${type === "payments" ? "payments/history" : "auth/me"}`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await response.json();
      if (!response.ok || !json.success) return;
      if (type === "payments") setPayments(json.data || []);
      else { setUser(json.user); if (type === "edit") { setName(json.user.name || ""); setEmail(json.user.email || ""); setAddress(json.user.address || ""); } }
    } finally { setLoading(false); }
  }, [type]);
  useLiveRefresh(load);

  const save = async () => {
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem("user-app-token");
      const response = await fetch(`${API_URL}/auth/me`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ name, email, address }) });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.message || "Unable to update profile");
      Alert.alert("Profile updated", "Your changes have been saved.", [{ text: "OK", onPress: () => navigation.goBack() }]);
    } catch (error) { Alert.alert("Update failed", error.message); } finally { setSaving(false); }
  };

  const deleteAccount = () => Alert.alert("Delete account?", "This permanently removes your account and cannot be undone.", [{ text: "Keep Account", style: "cancel" }, { text: "Delete", style: "destructive", onPress: async () => {
    try {
      const token = await AsyncStorage.getItem("user-app-token");
      const response = await fetch(`${API_URL}/auth/me`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.message || "Unable to delete account");
      await AsyncStorage.multiRemove(["user-app-token", "user-id"]);
      navigation.reset({ index: 0, routes: [{ name: "Onboarding" }] });
    } catch (error) { Alert.alert("Delete failed", error.message); }
  } }]);

  if (type === "edit") return <ScrollView style={s.screen} contentContainerStyle={s.content}><Text style={s.label}>Name</Text><TextInput style={s.input} value={name} onChangeText={setName} /><Text style={s.label}>Email</Text><TextInput style={s.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" /><Text style={s.label}>Primary address</Text><TextInput style={[s.input, s.addressInput]} value={address} onChangeText={setAddress} multiline /><TouchableOpacity style={s.button} onPress={save} disabled={saving}>{saving ? <ActivityIndicator color="white" /> : <Text style={s.buttonText}>Save Changes</Text>}</TouchableOpacity></ScrollView>;
  if (type === "addresses") return <View style={s.screen}><View style={s.content}>{user?.address ? <View style={s.card}><Text style={s.cardTitle}>Primary Address</Text><Text style={s.muted}>{user.address}</Text><TouchableOpacity onPress={() => navigation.replace("AccountDetail", { type: "edit", title: "Edit Profile", user })}><Text style={s.link}>Edit address</Text></TouchableOpacity></View> : <Text style={s.empty}>No address saved. Add one from Edit Profile.</Text>}</View></View>;
  if (type === "payments") return <View style={s.screen}>{loading ? <ActivityIndicator style={{ marginTop: 60 }} color="#913B3B" /> : <FlatList data={payments} keyExtractor={(item) => String(item.id)} contentContainerStyle={s.content} ListEmptyComponent={<Text style={s.empty}>No payment transactions found.</Text>} renderItem={({ item }) => <View style={s.card}><View style={s.paymentRow}><Text style={s.cardTitle}>{item.name_en}</Text><Text style={s.amount}>₹{Number(item.amount).toLocaleString("en-IN")}</Text></View><Text style={s.muted}>{new Date(item.created_at).toLocaleDateString("en-IN")} · {item.status}</Text>{item.razorpay_payment_id ? <Text style={s.reference}>{item.razorpay_payment_id}</Text> : null}</View>} />}</View>;
  return <ScrollView style={s.screen} contentContainerStyle={s.content}><View style={s.card}><Text style={s.infoText}>{content[type] || "Information is currently unavailable."}</Text></View>{type === "privacy" ? <View style={s.accountControls}><Text style={s.controlTitle}>Account controls</Text><TouchableOpacity onPress={deleteAccount}><Text style={s.deleteLink}>Delete my account</Text></TouchableOpacity></View> : null}</ScrollView>;
}
const s = StyleSheet.create({ screen: { flex: 1, backgroundColor: "#FAF7F2" }, content: { padding: 18, flexGrow: 1 }, label: { color: "#665D55", fontSize: 12, fontWeight: "700", marginBottom: 7 }, input: { height: 50, borderWidth: 1, borderColor: "#E4D8CD", borderRadius: 11, backgroundColor: "white", paddingHorizontal: 14, color: "#332D29", marginBottom: 17 }, addressInput: { height: 95, paddingTop: 13, textAlignVertical: "top" }, button: { height: 50, borderRadius: 25, backgroundColor: "#913B3B", alignItems: "center", justifyContent: "center", marginTop: 8 }, buttonText: { color: "white", fontWeight: "800" }, card: { backgroundColor: "white", borderWidth: 1, borderColor: "#E7DBD0", borderRadius: 13, padding: 16, marginBottom: 12 }, cardTitle: { color: "#3D3631", fontSize: 14, fontWeight: "800" }, muted: { color: "#8F857C", fontSize: 11, marginTop: 7, textTransform: "capitalize" }, link: { color: "#913B3B", fontWeight: "700", marginTop: 14 }, empty: { color: "#8F857C", textAlign: "center", marginTop: 60 }, paymentRow: { flexDirection: "row", justifyContent: "space-between" }, amount: { color: "#913B3B", fontWeight: "800" }, reference: { color: "#AAA096", fontSize: 9, marginTop: 8 }, infoText: { color: "#625950", fontSize: 13, lineHeight: 21 } });
