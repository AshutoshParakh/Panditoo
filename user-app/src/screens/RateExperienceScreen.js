import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import { colors, shadow } from "../theme/homeTheme";

import { API_URL } from "../config/api";
const labels = { 1: "Needs improvement", 2: "Fair", 3: "Good", 4: "Very good", 5: "Excellent" };

export default function RateExperienceScreen({ route, navigation }) {
  const { i18n } = useTranslation();
  const hindi = i18n.language === "hi";
  const booking = route.params?.booking;
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { AsyncStorage.getItem("user-app-token").then(setToken); }, []);

  const submit = async () => {
    if (!booking?.id || !token) { setError(hindi ? "बुकिंग या लॉगिन की जानकारी उपलब्ध नहीं है।" : "Booking or login details are unavailable."); return; }
    setLoading(true); setError("");
    try {
      const response = await fetch(`${API_URL}/ratings`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ booking_id: booking.id, rating, comment: comment.trim() }) });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.message || "Unable to submit rating.");
      Alert.alert(hindi ? "धन्यवाद" : "Thank you", hindi ? "आपकी प्रतिक्रिया दर्ज हो गई है।" : "Your feedback has been submitted.", [{ text: "OK", onPress: () => navigation.goBack() }]);
    } catch (requestError) { setError(requestError.message || "Unable to submit rating."); } finally { setLoading(false); }
  };

  const name = hindi ? booking?.name_hi || booking?.name_en : booking?.name_en || booking?.name_hi;
  return (
    <SafeAreaView style={s.screen}><ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <View style={s.intro}><Text style={s.eyebrow}>{hindi ? "आपकी प्रतिक्रिया" : "YOUR FEEDBACK"}</Text><Text style={s.heading}>{hindi ? "पूजा का अनुभव कैसा रहा?" : "How was your ceremony?"}</Text><Text style={s.subtitle}>{hindi ? "आपकी प्रतिक्रिया बेहतर सेवा देने में मदद करती है।" : "Your feedback helps us maintain a trusted service."}</Text></View>
      <View style={s.ceremony}><View style={s.omBox}><Text style={s.om}>ॐ</Text></View><View style={s.ceremonyCopy}><Text style={s.label}>{hindi ? "पूर्ण पूजा" : "COMPLETED CEREMONY"}</Text><Text style={s.name}>{name || (hindi ? "पूजा" : "Completed booking")}</Text>{booking?.confirmed_pandit?.name ? <Text style={s.pandit}>{hindi ? "पंडित" : "Pandit"}: {booking.confirmed_pandit.name}</Text> : null}</View><View style={s.complete}><Text style={s.completeText}>✓</Text></View></View>
      <View style={s.ratingCard}><Text style={s.ratingQuestion}>{hindi ? "अपनी रेटिंग चुनें" : "Select your rating"}</Text><View style={s.stars}>{[1, 2, 3, 4, 5].map((value) => <TouchableOpacity key={value} style={[s.starButton, value <= rating && s.starActive]} onPress={() => setRating(value)}><Text style={[s.star, value <= rating && s.starTextActive]}>★</Text></TouchableOpacity>)}</View><Text style={s.ratingLabel}>{hindi ? ["", "सुधार जरूरी", "ठीक", "अच्छा", "बहुत अच्छा", "उत्कृष्ट"][rating] : labels[rating]}</Text><View style={s.rule} /><Text style={s.inputLabel}>{hindi ? "कुछ और बताना चाहेंगे?" : "Anything else you’d like to share?"}</Text><TextInput style={s.input} value={comment} onChangeText={setComment} placeholder={hindi ? "अपना अनुभव लिखें (वैकल्पिक)" : "Share your experience (optional)"} placeholderTextColor="#A69B92" multiline maxLength={500} /><Text style={s.counter}>{comment.length}/500</Text>{error ? <View style={s.errorBox}><Text style={s.error}>{error}</Text></View> : null}</View>
      <TouchableOpacity style={[s.button, loading && s.disabled]} onPress={submit} disabled={loading}>{loading ? <ActivityIndicator color="#FFFFFF" /> : <><Text style={s.buttonText}>{hindi ? "प्रतिक्रिया भेजें" : "Submit feedback"}</Text><Text style={s.arrow}>›</Text></>}</TouchableOpacity><Text style={s.note}>{hindi ? "आपकी प्रतिक्रिया सार्वजनिक रूप से आपके नाम के बिना दिखाई जाएगी।" : "Your feedback may be shown publicly without your personal details."}</Text>
    </ScrollView></SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8F5F0" }, content: { paddingHorizontal: 19, paddingBottom: 30 }, intro: { paddingTop: 14, paddingBottom: 20 }, eyebrow: { color: colors.primary, fontSize: 9, fontWeight: "800", letterSpacing: 1.4 }, heading: { color: colors.ink, fontSize: 26, lineHeight: 33, fontWeight: "800", marginTop: 7 }, subtitle: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 5 }, ceremony: { backgroundColor: "#FFFFFF", borderRadius: 15, borderWidth: 1, borderColor: "#E7DDD4", padding: 13, flexDirection: "row", alignItems: "center" }, omBox: { width: 43, height: 43, borderRadius: 11, backgroundColor: "#F1E7E1", alignItems: "center", justifyContent: "center" }, om: { color: colors.primary, fontSize: 20 }, ceremonyCopy: { flex: 1, marginLeft: 11 }, label: { color: colors.muted, fontSize: 7, fontWeight: "800", letterSpacing: 0.8 }, name: { color: colors.ink, fontSize: 12, fontWeight: "800", marginTop: 3 }, pandit: { color: colors.muted, fontSize: 8, marginTop: 3 }, complete: { width: 23, height: 23, borderRadius: 12, backgroundColor: colors.greenSoft, alignItems: "center", justifyContent: "center" }, completeText: { color: colors.green, fontSize: 9, fontWeight: "800" },
  ratingCard: { backgroundColor: "#FFFFFF", borderRadius: 17, borderWidth: 1, borderColor: "#E7DDD4", padding: 17, marginTop: 14, ...shadow }, ratingQuestion: { color: colors.ink, fontSize: 13, fontWeight: "800", textAlign: "center" }, stars: { flexDirection: "row", justifyContent: "center", gap: 8, marginTop: 18 }, starButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#F2EDE8", alignItems: "center", justifyContent: "center" }, starActive: { backgroundColor: "#F4E3C8" }, star: { color: "#C8BDB4", fontSize: 21 }, starTextActive: { color: "#B77A29" }, ratingLabel: { color: "#9A6527", fontSize: 10, fontWeight: "800", textAlign: "center", marginTop: 10 }, rule: { height: 1, backgroundColor: "#EFE7E0", marginVertical: 18 }, inputLabel: { color: "#544B45", fontSize: 10, fontWeight: "800", marginBottom: 8 }, input: { minHeight: 105, borderWidth: 1, borderColor: "#E5DAD1", backgroundColor: "#FBF9F6", borderRadius: 12, padding: 12, color: colors.ink, fontSize: 11, lineHeight: 17, textAlignVertical: "top" }, counter: { color: "#AAA097", fontSize: 8, textAlign: "right", marginTop: 5 }, errorBox: { backgroundColor: "#FBEDEC", borderRadius: 9, padding: 9, marginTop: 10 }, error: { color: "#A34C49", fontSize: 9 },
  button: { height: 51, borderRadius: 12, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 17 }, disabled: { opacity: 0.7 }, buttonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" }, arrow: { color: "#FFFFFF", fontSize: 22, marginLeft: 9, marginTop: -2 }, note: { color: colors.muted, fontSize: 8, lineHeight: 13, textAlign: "center", marginTop: 9, paddingHorizontal: 25 },
});
