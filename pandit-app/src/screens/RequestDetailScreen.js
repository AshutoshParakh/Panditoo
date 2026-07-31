import React, { useState } from "react";
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { colors, money, shadow } from "../theme";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000/api";

export default function RequestDetailScreen({ route, navigation }) {
  const request = route.params?.request || {};
  const { token } = useAuth();
  const { i18n } = useTranslation();
  const hindi = i18n.language === "hi";
  const [loading, setLoading] = useState(false);
  const pooja = hindi ? request.pooja_name_hi || request.pooja_name_en : request.pooja_name_en || request.pooja_name_hi;
  const distance = Number(request.distance_km) < 0.1 ? "< 0.1 km" : `${Number(request.distance_km).toFixed(1)} km`;
  const areaParts = String(request.address || "—").split(",");
  const area = areaParts.length > 2 ? areaParts.slice(-2).join(", ").trim() : request.address || "—";
  const materials = (request.samagri_list || []).filter((item) => item.brought_by === "pandit" || item.provided_by === "pandit");

  const respond = async (interested) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/bookings/${request.booking_id}/pandit-response`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ response: interested ? "interested" : "not_interested" }) });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.message || "Unable to record your response");
      if (interested) navigation.replace("BookingWon", { booking: request });
      else navigation.goBack();
    } catch (error) {
      Alert.alert(hindi ? "उत्तर नहीं भेजा गया" : "Response not sent", error.message);
    } finally {
      setLoading(false);
    }
  };

  return <SafeAreaView style={s.screen}><ScrollView contentContainerStyle={s.content}>
    <Text style={s.eyebrow}>{hindi ? "पूजा अनुरोध" : "POOJA REQUEST"}</Text>
    <Text style={s.title}>{pooja || "Pooja"}</Text>
    <Text style={s.reference}>#{String(request.booking_id || "").slice(0, 8).toUpperCase()}</Text>
    <View style={s.card}>
      <Detail label={hindi ? "ग्राहक" : "Customer"} value={request.user_name || "—"} />
      <Detail label={hindi ? "तारीख" : "Date"} value={request.booking_date ? new Date(request.booking_date).toLocaleDateString(hindi ? "hi-IN" : "en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"} />
      <Detail label={hindi ? "समय" : "Time"} value={String(request.booking_time || "—").slice(0, 5)} />
      <Detail label={hindi ? "दूरी" : "Distance"} value={distance} />
      <Detail label={hindi ? "अनुमानित क्षेत्र" : "Approximate area"} value={area} />
      <Detail label={hindi ? "आपकी आय" : "Your payout"} value={money(request.pandit_payout_amount)} accent />
    </View>
    <View style={s.card}><Text style={s.materialTitle}>{hindi ? "आपको लाने वाली सामग्री" : "Materials you need to bring"}</Text>{materials.length ? materials.map((item, index) => <Text key={index} style={s.material}>• {(hindi ? item.item_hi : item.item_en) || item.item_en || item.item_hi}</Text>) : <Text style={s.empty}>{hindi ? "सभी सामग्री ग्राहक देंगे" : "All materials are provided by the customer"}</Text>}</View>
    <Text style={s.privacy}>{hindi ? "पूरा पता केवल अनुरोध स्वीकार होने के बाद दिखेगा।" : "The exact address is revealed only after you accept."}</Text>
    <View style={s.actions}><TouchableOpacity disabled={loading} style={s.reject} onPress={() => respond(false)}><Text style={s.rejectText}>{hindi ? "अस्वीकार" : "Reject"}</Text></TouchableOpacity><TouchableOpacity disabled={loading} style={s.accept} onPress={() => respond(true)}>{loading ? <ActivityIndicator color="#FFF" /> : <Text style={s.acceptText}>{hindi ? "स्वीकार करें" : "Accept request"}</Text>}</TouchableOpacity></View>
  </ScrollView></SafeAreaView>;
}

const Detail = ({ label, value, accent }) => <View style={s.row}><Text style={s.label}>{label}</Text><Text style={[s.value, accent && s.accent]}>{value}</Text></View>;

const s = StyleSheet.create({ screen:{flex:1,backgroundColor:colors.bg},content:{padding:18,paddingBottom:34},eyebrow:{fontSize:10,fontWeight:"900",letterSpacing:1.4,color:colors.primary},title:{fontSize:27,fontWeight:"900",color:colors.ink,marginTop:8},reference:{fontSize:11,color:colors.muted,marginTop:5},card:{backgroundColor:colors.surface,borderRadius:18,borderWidth:1,borderColor:colors.border,padding:17,marginTop:16,...shadow},row:{minHeight:48,flexDirection:"row",alignItems:"center",justifyContent:"space-between",borderBottomWidth:1,borderBottomColor:"#EEE7E1"},label:{fontSize:11,fontWeight:"700",color:colors.muted},value:{maxWidth:"62%",fontSize:13,fontWeight:"800",color:colors.ink,textAlign:"right"},accent:{color:colors.green,fontSize:17},materialTitle:{fontSize:12,fontWeight:"900",color:colors.ink,marginBottom:8},material:{fontSize:12,lineHeight:23,color:colors.muted},empty:{fontSize:12,color:colors.muted},privacy:{fontSize:11,lineHeight:17,color:colors.muted,textAlign:"center",marginTop:15},actions:{flexDirection:"row",gap:10,marginTop:20},reject:{flex:1,height:52,borderRadius:14,borderWidth:1,borderColor:"#D4C7BD",alignItems:"center",justifyContent:"center"},rejectText:{fontSize:13,fontWeight:"900",color:"#665B53"},accept:{flex:1.4,height:52,borderRadius:14,backgroundColor:colors.green,alignItems:"center",justifyContent:"center"},acceptText:{fontSize:13,fontWeight:"900",color:"#FFF"} });
