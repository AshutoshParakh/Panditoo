import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000/api";

export default function RateExperienceScreen({ route, navigation }) {
  const booking = route.params?.booking;
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { AsyncStorage.getItem("user-app-token").then(setToken); }, []);

  const submit = async () => {
    if (!booking?.id || !token) { setError("Booking or login details are unavailable."); return; }
    setLoading(true); setError("");
    try {
      const response = await fetch(`${API_URL}/ratings`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ booking_id: booking.id, rating, comment: comment.trim() }) });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.message || "Unable to submit rating.");
      Alert.alert("Thank You", "Your rating was submitted.", [{ text: "OK", onPress: () => navigation.goBack() }]);
    } catch (requestError) { setError(requestError.message || "Unable to submit rating."); } finally { setLoading(false); }
  };

  return <SafeAreaView style={s.container}><ScrollView contentContainerStyle={s.content}><Text style={s.heading}>Rate Your Experience</Text><View style={s.card}><Text style={s.title}>{booking?.name_en || "Completed booking"}</Text>{booking?.confirmed_pandit?.name ? <Text style={s.muted}>Pandit: {booking.confirmed_pandit.name}</Text> : null}<View style={s.stars}>{[1, 2, 3, 4, 5].map((value) => <TouchableOpacity key={value} onPress={() => setRating(value)}><Text style={[s.star, value > rating && s.inactive]}>★</Text></TouchableOpacity>)}</View><TextInput style={s.input} value={comment} onChangeText={setComment} placeholder="Share your experience (optional)" placeholderTextColor="#a08f80" multiline />{error ? <Text style={s.error}>{error}</Text> : null}<TouchableOpacity style={s.button} onPress={submit} disabled={loading}>{loading ? <ActivityIndicator color="white" /> : <Text style={s.buttonText}>Submit Rating</Text>}</TouchableOpacity></View></ScrollView></SafeAreaView>;
}
const s = StyleSheet.create({ container: { flex: 1, backgroundColor: "#f7efe5" }, content: { padding: 20 }, heading: { color: "#6a1b1a", fontSize: 22, fontWeight: "800", marginBottom: 18 }, card: { backgroundColor: "white", borderRadius: 16, padding: 18, borderWidth: 1, borderColor: "#e3d5c5" }, title: { color: "#3a2d21", fontSize: 17, fontWeight: "700" }, muted: { color: "#a08f80", marginTop: 6 }, stars: { flexDirection: "row", justifyContent: "center", marginVertical: 24 }, star: { color: "#d97706", fontSize: 38, marginHorizontal: 4 }, inactive: { color: "#e3d5c5" }, input: { minHeight: 110, borderWidth: 1, borderColor: "#e3d5c5", borderRadius: 12, padding: 12, textAlignVertical: "top", color: "#3a2d21" }, error: { color: "#b91c1c", marginTop: 12 }, button: { height: 50, backgroundColor: "#6a1b1a", borderRadius: 25, alignItems: "center", justifyContent: "center", marginTop: 18 }, buttonText: { color: "white", fontWeight: "700" } });
