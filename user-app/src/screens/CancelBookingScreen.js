import React, { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { API_URL } from "../config/api";
const REASONS = [["change_of_plan", "Change in plan"], ["pandit_asked_to_cancel", "Pandit asked me to cancel"], ["wrong_date_or_location", "Wrong date or location"], ["duplicate_booking", "Booked by mistake / duplicate"], ["other", "Other reason"]];

export default function CancelBookingScreen({ route, navigation }) {
  const booking = route.params?.booking || {};
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const paid = Number(booking.prepaid_amount || 0);
  const total = Number(booking.total_price || 0);
  const blockedMessage = booking.status !== "pending" ? "We don’t allow cancellation after a pandit has accepted the request." : booking.prepaid_status === "paid" && total > 0 && paid >= total ? "Fully paid bookings cannot be cancelled in the app. Please contact support if you need help." : "";

  const submit = async () => {
    if (!reason) return Alert.alert("Reason required", "Please select why you are cancelling.");
    if (reason === "other" && note.trim().length < 3) return Alert.alert("Tell us more", "Please write your reason.");
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem("user-app-token");
      const response = await fetch(`${API_URL}/bookings/${booking.id}/cancel`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ reason, note: note.trim() }) });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.message || "Unable to cancel booking.");
      Alert.alert("Booking cancelled", paid > 0 ? `The prepaid amount of ₹${paid.toLocaleString("en-IN")} is non-refundable.` : "Your request has been cancelled.", [{ text: "OK", onPress: () => navigation.navigate("Main", { screen: "BookingsTab" }) }]);
    } catch (error) { Alert.alert("Cancellation unavailable", error.message); }
    finally { setSaving(false); }
  };

  if (blockedMessage) return <View style={s.blocked}><Text style={s.blockedIcon}>!</Text><Text style={s.title}>Cancellation unavailable</Text><Text style={s.copy}>{blockedMessage}</Text><TouchableOpacity style={s.secondary} onPress={() => navigation.goBack()}><Text style={s.secondaryText}>Go Back</Text></TouchableOpacity></View>;
  return <ScrollView style={s.screen} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled"><Text style={s.title}>Why are you cancelling?</Text><Text style={s.copy}>Your feedback helps us improve the booking experience.</Text>{paid > 0 ? <View style={s.warning}><Text style={s.warningTitle}>Prepayment is non-refundable</Text><Text style={s.warningText}>₹{paid.toLocaleString("en-IN")} ({Math.round((paid / total) * 100)}% of the booking value) will not be refunded when you cancel.</Text></View> : null}<View style={s.card}>{REASONS.map(([value, label]) => <TouchableOpacity key={value} style={s.reason} onPress={() => setReason(value)}><View style={[s.radio, reason === value && s.radioActive]}>{reason === value ? <View style={s.dot} /> : null}</View><Text style={s.reasonText}>{label}</Text></TouchableOpacity>)}</View><Text style={s.label}>Anything else you’d like us to know?</Text><TextInput style={s.input} value={note} onChangeText={setNote} multiline maxLength={500} placeholder="Write your point here (optional)" textAlignVertical="top" /><Text style={s.counter}>{note.length}/500</Text><TouchableOpacity style={[s.cancel, (!reason || saving) && s.disabled]} onPress={submit} disabled={!reason || saving}>{saving ? <ActivityIndicator color="white" /> : <Text style={s.cancelText}>Confirm Cancellation</Text>}</TouchableOpacity></ScrollView>;
}

const s = StyleSheet.create({ screen:{flex:1,backgroundColor:"#FAF7F2"},content:{padding:20,paddingBottom:40},title:{fontSize:25,lineHeight:32,fontWeight:"800",color:"#302A26"},copy:{fontSize:14,lineHeight:21,color:"#7C7169",marginTop:7,textAlign:"center"},warning:{backgroundColor:"#FFF1E2",borderWidth:1,borderColor:"#E7B879",borderRadius:14,padding:14,marginTop:20},warningTitle:{fontSize:15,fontWeight:"800",color:"#8A4C16"},warningText:{fontSize:13,lineHeight:19,color:"#855D37",marginTop:5},card:{backgroundColor:"white",borderWidth:1,borderColor:"#E7DDD4",borderRadius:15,paddingHorizontal:14,marginTop:18},reason:{minHeight:57,flexDirection:"row",alignItems:"center",borderBottomWidth:1,borderBottomColor:"#F0E8E1"},radio:{width:22,height:22,borderRadius:11,borderWidth:2,borderColor:"#B8AAA0",alignItems:"center",justifyContent:"center"},radioActive:{borderColor:"#913B3B"},dot:{width:10,height:10,borderRadius:5,backgroundColor:"#913B3B"},reasonText:{fontSize:14,color:"#514842",fontWeight:"600",marginLeft:12},label:{fontSize:14,fontWeight:"700",color:"#514842",marginTop:21,marginBottom:8},input:{minHeight:105,borderWidth:1,borderColor:"#DDD1C7",borderRadius:13,backgroundColor:"white",padding:13,fontSize:14,color:"#332D29"},counter:{textAlign:"right",fontSize:11,color:"#9A8E84",marginTop:5},cancel:{height:52,borderRadius:13,backgroundColor:"#A33F3F",alignItems:"center",justifyContent:"center",marginTop:18},cancelText:{color:"white",fontSize:15,fontWeight:"800"},disabled:{opacity:.5},blocked:{flex:1,backgroundColor:"#FAF7F2",alignItems:"center",justifyContent:"center",padding:30},blockedIcon:{width:54,height:54,borderRadius:27,backgroundColor:"#F7E1DF",color:"#A33F3F",fontSize:30,fontWeight:"800",textAlign:"center",textAlignVertical:"center",marginBottom:18},secondary:{height:48,borderWidth:1,borderColor:"#A33F3F",borderRadius:24,paddingHorizontal:30,alignItems:"center",justifyContent:"center",marginTop:25},secondaryText:{color:"#913B3B",fontSize:14,fontWeight:"800"} });
