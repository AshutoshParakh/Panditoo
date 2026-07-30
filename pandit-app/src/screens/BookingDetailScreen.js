import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Linking, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { colors, money, shadow } from "../theme";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000/api";

export default function BookingDetailScreen({ route, navigation }) {
  const { bookingId } = route.params;
  const { i18n } = useTranslation();
  const { token } = useAuth();
  const hindi = i18n.language === "hi";
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState({});

  const fetchBooking = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/bookings/pandit/bookings/${bookingId}`, { headers: { Authorization: `Bearer ${token}` } });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.message || "Unable to load booking");
      setBooking(payload.data);
      const stored = await AsyncStorage.getItem(`samagri_checklist:${bookingId}`);
      if (stored) setChecked(JSON.parse(stored));
    } catch (error) {
      Alert.alert("Booking unavailable", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooking();
    const refreshTimer = setInterval(fetchBooking, 60 * 1000);
    return () => clearInterval(refreshTimer);
  }, [bookingId]);

  const samagri = useMemo(() => {
    if (!booking?.samagri_list) return [];
    try { return typeof booking.samagri_list === "string" ? JSON.parse(booking.samagri_list) : booking.samagri_list; }
    catch { return []; }
  }, [booking]);

  const toggleItem = async (index) => {
    const next = { ...checked, [index]: !checked[index] };
    setChecked(next);
    await AsyncStorage.setItem(`samagri_checklist:${bookingId}`, JSON.stringify(next));
  };

  const directions = () => {
    if (!booking?.address) return;
    const query = encodeURIComponent(booking.address);
    const nativeUrl = Platform.select({ ios: `maps:0,0?q=${query}`, android: `geo:0,0?q=${query}` });
    Linking.openURL(nativeUrl).catch(() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`));
  };

  const callCustomer = () => {
    if (booking?.user_phone) Linking.openURL(`tel:${booking.user_phone}`);
  };

  const whatsappCustomer = () => {
    if (!booking?.user_phone) return;
    let phone = String(booking.user_phone).replace(/\D/g, "");
    if (phone.length === 10) phone = `91${phone}`;
    Linking.openURL(`https://wa.me/${phone}`).catch(() => Alert.alert("WhatsApp unavailable", "Could not open WhatsApp on this device."));
  };

  const completeBooking = () => Alert.alert("Complete ceremony?", "Confirm only after the pooja has been completed successfully.", [
    { text: "Not yet", style: "cancel" },
    { text: "Confirm completion", onPress: async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/bookings/${bookingId}/complete`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload.message || "Could not update booking");
        setBooking((current) => ({ ...current, booking_status: "completed" }));
      } catch (error) { Alert.alert("Update failed", error.message); }
      finally { setLoading(false); }
    } },
  ]);

  if (loading && !booking) return <View style={s.state}><ActivityIndicator size="large" color={colors.primary} /><Text style={s.stateText}>Loading booking detailsâ€¦</Text></View>;
  if (!booking) return <View style={s.state}><Text style={s.stateTitle}>Booking not found</Text><TouchableOpacity onPress={() => navigation.goBack()}><Text style={s.retry}>Go back</Text></TouchableOpacity></View>;

  const status = String(booking.booking_status || "pending").toLowerCase();
  const completed = status === "completed";
  const pending = status === "pending";
  const pooja = (hindi ? booking.pooja_name_hi : booking.pooja_name_en) || booking.pooja_name_en || "Pooja ceremony";
  const date = new Date(booking.booking_date);
  const validDate = !Number.isNaN(date.getTime());
  const canComplete = validDate && new Date().setHours(0, 0, 0, 0) >= new Date(date).setHours(0, 0, 0, 0);
  const coordinates = Number.isFinite(Number(booking.latitude)) && Number.isFinite(Number(booking.longitude)) ? { latitude: Number(booking.latitude), longitude: Number(booking.longitude) } : null;

  if (completed) return (
    <SafeAreaView style={s.screen}><ScrollView contentContainerStyle={s.completedPage}>
      <View style={s.completedHero}><View style={s.completedIcon}><Text style={s.check}>âœ“</Text></View><Text style={s.overline}>CEREMONY COMPLETED</Text><Text style={s.completedTitle}>{pooja}</Text><Text style={s.completedSub}>A concise record of your completed service.</Text></View>
      <View style={s.summaryCard}>
        <Summary label="CUSTOMER" value={booking.user_name || "Customer"} />
        <View style={s.rule} />
        <Summary label="YOUR EARNING" value={money(booking.pandit_payout_amount)} accent />
        <View style={s.rule} />
        <Summary label="CUSTOMER RATING" value={booking.customer_rating ? `â˜… ${Number(booking.customer_rating).toFixed(1)}` : "Not rated yet"} />
      </View>
      <TouchableOpacity style={s.secondaryButton} onPress={() => navigation.goBack()}><Text style={s.secondaryText}>Back to bookings</Text></TouchableOpacity>
    </ScrollView></SafeAreaView>
  );

  return (
    <SafeAreaView style={s.screen}><ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.hero}>
        <View style={s.heroTop}><Text style={s.overline}>BOOKING DETAILS</Text><View style={[s.badge, pending ? s.pendingBadge : s.confirmedBadge]}><Text style={[s.badgeText, pending ? s.pendingText : s.confirmedText]}>{pending ? "PENDING" : "CONFIRMED"}</Text></View></View>
        <Text style={s.title}>{pooja}</Text><Text style={s.reference}>Booking #{booking.booking_id || bookingId}</Text>
        <View style={s.schedule}><Summary label="DATE" value={validDate ? date.toLocaleDateString(hindi ? "hi-IN" : "en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "â€”"} /><View style={s.verticalRule} /><Summary label="TIME" value={booking.booking_time?.slice(0, 5) || "â€”"} /><View style={s.verticalRule} /><Summary label="EARNING" value={money(booking.pandit_payout_amount)} accent /></View>
      </View>

      {pending ? <View style={s.pendingCard}><Text style={s.pendingCardTitle}>Awaiting booking confirmation</Text><Text style={s.pendingCardText}>This request is kept separate from confirmed work. Full ceremony controls become available after confirmation.</Text></View> : null}

      <View style={s.card}><Text style={s.cardLabel}>CUSTOMER</Text><Text style={s.customerName}>{booking.user_name || "Customer"}</Text>{booking.user_phone && !pending ? <><Text style={{fontSize:16,fontWeight:"800",color:colors.ink,marginTop:6}}>{booking.user_phone}</Text><View style={{flexDirection:"row",gap:10,marginTop:15}}><TouchableOpacity style={{flex:1,height:46,borderRadius:12,borderWidth:1,borderColor:colors.primary,alignItems:"center",justifyContent:"center"}} onPress={callCustomer}><Text style={{fontSize:13,fontWeight:"800",color:colors.primary}}>Call customer</Text></TouchableOpacity><TouchableOpacity style={{flex:1,height:46,borderRadius:12,backgroundColor:colors.green,alignItems:"center",justifyContent:"center"}} onPress={whatsappCustomer}><Text style={{fontSize:13,fontWeight:"800",color:"#FFF"}}>WhatsApp</Text></TouchableOpacity></View><View style={{backgroundColor:colors.greenSoft,borderRadius:10,padding:10,marginTop:11}}><Text style={{fontSize:11,fontWeight:"700",color:colors.green,textAlign:"center"}}>Contact unlocked for travel coordination</Text></View></> : <View style={s.privacy}><Text style={s.privacyIcon}>âŒ¾</Text><Text style={s.privacyText}>Mobile number and WhatsApp unlock 3 hours before the scheduled ceremony.</Text></View>}</View>

      {!pending && <><View style={s.card}><Text style={s.cardLabel}>CEREMONY LOCATION</Text><Text style={s.address}>{booking.address || "Address will be shared before the ceremony."}</Text>{coordinates && <View style={s.mapWrap}><MapView style={s.map} initialRegion={{ ...coordinates, latitudeDelta: 0.012, longitudeDelta: 0.012 }} scrollEnabled={false} zoomEnabled={false}><Marker coordinate={coordinates} /></MapView></View>}<TouchableOpacity style={s.directionsButton} onPress={directions}><Text style={s.directionsText}>Open directions</Text></TouchableOpacity></View>
      <View style={s.card}><Text style={s.cardLabel}>SAMAGRI CHECKLIST</Text><Text style={s.cardHint}>Tap an item as you prepare it.</Text>{samagri.length ? samagri.map((item, index) => <TouchableOpacity key={`${index}-${item.item_en || "item"}`} style={s.item} onPress={() => toggleItem(index)}><View style={[s.checkbox, checked[index] && s.checkboxDone]}><Text style={s.tick}>{checked[index] ? "âœ“" : ""}</Text></View><View style={s.itemCopy}><Text style={[s.itemName, checked[index] && s.itemNameDone]}>{(hindi ? item.item_hi : item.item_en) || item.item_en}</Text><Text style={s.owner}>{item.brought_by === "user" ? "Customer will arrange" : "You will arrange"}</Text></View></TouchableOpacity>) : <Text style={s.emptyText}>No samagri items listed.</Text>}</View>
      {canComplete ? <TouchableOpacity style={s.completeButton} onPress={completeBooking} disabled={loading}><Text style={s.completeText}>{loading ? "Updatingâ€¦" : "Mark ceremony completed"}</Text></TouchableOpacity> : <View style={s.dateNotice}><Text style={s.dateNoticeText}>Completion will unlock on the scheduled ceremony date.</Text></View>}</>}
    </ScrollView></SafeAreaView>
  );
}

function Summary({ label, value, accent }) { return <View style={s.summary}><Text style={s.summaryLabel}>{label}</Text><Text style={[s.summaryValue, accent && s.accent]} numberOfLines={2}>{value}</Text></View>; }

const s = StyleSheet.create({
  screen:{flex:1,backgroundColor:colors.bg},content:{padding:18,paddingBottom:36},state:{flex:1,alignItems:"center",justifyContent:"center",backgroundColor:colors.bg,padding:24},stateTitle:{fontSize:20,fontWeight:"800",color:colors.ink},stateText:{fontSize:14,color:colors.muted,marginTop:12},retry:{fontSize:14,fontWeight:"800",color:colors.primary,marginTop:18},hero:{backgroundColor:colors.surface,borderRadius:22,padding:20,borderWidth:1,borderColor:colors.border,...shadow},heroTop:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},overline:{fontSize:10,fontWeight:"900",letterSpacing:1.5,color:colors.primary},badge:{paddingHorizontal:10,paddingVertical:6,borderRadius:10},pendingBadge:{backgroundColor:colors.goldSoft},confirmedBadge:{backgroundColor:colors.blueSoft},badgeText:{fontSize:9,fontWeight:"900",letterSpacing:.5},pendingText:{color:colors.gold},confirmedText:{color:colors.blue},title:{fontSize:25,fontWeight:"900",color:colors.ink,marginTop:14},reference:{fontSize:12,color:colors.muted,marginTop:5},schedule:{minHeight:74,borderRadius:14,backgroundColor:"#F4F0EC",flexDirection:"row",alignItems:"center",marginTop:20,paddingHorizontal:10},summary:{flex:1,alignItems:"center"},summaryLabel:{fontSize:9,fontWeight:"900",letterSpacing:.7,color:colors.muted,textAlign:"center"},summaryValue:{fontSize:13,fontWeight:"800",color:colors.ink,marginTop:6,textAlign:"center"},accent:{color:colors.green},verticalRule:{width:1,height:34,backgroundColor:"#D9D0C8"},pendingCard:{backgroundColor:colors.goldSoft,borderRadius:17,padding:17,marginTop:14,borderWidth:1,borderColor:"#E8D1AA"},pendingCardTitle:{fontSize:15,fontWeight:"900",color:"#765021"},pendingCardText:{fontSize:13,lineHeight:20,color:"#87663D",marginTop:5},card:{backgroundColor:colors.surface,borderRadius:19,padding:18,borderWidth:1,borderColor:colors.border,marginTop:14,...shadow},cardLabel:{fontSize:10,fontWeight:"900",letterSpacing:1.2,color:colors.primary},cardHint:{fontSize:13,color:colors.muted,marginTop:6,marginBottom:4},customerName:{fontSize:20,fontWeight:"850",color:colors.ink,marginTop:9},privacy:{flexDirection:"row",backgroundColor:"#F2EFEB",borderRadius:13,padding:12,marginTop:14,alignItems:"center"},privacyIcon:{fontSize:18,color:colors.primary,marginRight:9},privacyText:{flex:1,fontSize:12,lineHeight:18,fontWeight:"600",color:colors.muted},address:{fontSize:15,lineHeight:22,fontWeight:"650",color:colors.ink,marginTop:9},mapWrap:{height:170,borderRadius:14,overflow:"hidden",marginTop:15},map:{...StyleSheet.absoluteFillObject},directionsButton:{height:47,borderRadius:12,alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:colors.primary,marginTop:13},directionsText:{fontSize:14,fontWeight:"850",color:colors.primary},item:{flexDirection:"row",alignItems:"center",paddingVertical:13,borderBottomWidth:1,borderBottomColor:"#EEE8E2"},checkbox:{width:25,height:25,borderRadius:7,borderWidth:2,borderColor:colors.primary,alignItems:"center",justifyContent:"center"},checkboxDone:{backgroundColor:colors.primary},tick:{fontSize:15,fontWeight:"900",color:"#FFF"},itemCopy:{flex:1,marginLeft:12},itemName:{fontSize:15,fontWeight:"750",color:colors.ink},itemNameDone:{textDecorationLine:"line-through",color:colors.muted},owner:{fontSize:11,color:colors.muted,marginTop:3},emptyText:{fontSize:13,color:colors.muted,marginTop:14},completeButton:{height:55,borderRadius:15,backgroundColor:colors.green,alignItems:"center",justifyContent:"center",marginTop:18,...shadow},completeText:{fontSize:15,fontWeight:"900",color:"#FFF"},dateNotice:{backgroundColor:colors.goldSoft,borderRadius:14,padding:15,marginTop:18},dateNoticeText:{fontSize:13,fontWeight:"700",textAlign:"center",color:colors.gold},completedPage:{padding:20,paddingTop:44,paddingBottom:40},completedHero:{alignItems:"center"},completedIcon:{width:62,height:62,borderRadius:31,backgroundColor:colors.greenSoft,alignItems:"center",justifyContent:"center",marginBottom:18},check:{fontSize:30,fontWeight:"900",color:colors.green},completedTitle:{fontSize:27,fontWeight:"900",color:colors.ink,textAlign:"center",marginTop:12},completedSub:{fontSize:13,lineHeight:20,color:colors.muted,textAlign:"center",marginTop:8},summaryCard:{backgroundColor:colors.surface,borderRadius:20,padding:20,borderWidth:1,borderColor:colors.border,marginTop:28,...shadow},rule:{height:1,backgroundColor:"#EEE7E1",marginVertical:18},secondaryButton:{height:50,borderRadius:14,borderWidth:1,borderColor:colors.border,alignItems:"center",justifyContent:"center",marginTop:18},secondaryText:{fontSize:14,fontWeight:"850",color:colors.ink}
});

