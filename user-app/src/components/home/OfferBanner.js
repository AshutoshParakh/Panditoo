import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors } from "../../theme/homeTheme";

export default function OfferBanner({ offer, onPress }) {
  if (!offer) return null;
  const value = offer.offer_type === "percent" ? `${Number(offer.offer_value)}% OFF` : `POOJAS FROM ₹${Number(offer.offer_value).toLocaleString("en-IN")}`;
  return <TouchableOpacity activeOpacity={0.88} onPress={onPress} style={s.card}><View style={s.badge}><Text style={s.badgeText}>LIMITED-TIME OFFER · 100% ONLINE</Text></View><Text style={s.value}>{value}</Text><Text style={s.title}>{offer.title}</Text>{offer.subtitle ? <Text style={s.subtitle}>{offer.subtitle}</Text> : null}<Text style={s.action}>View eligible poojas  →</Text></TouchableOpacity>;
}

const s = StyleSheet.create({ card:{backgroundColor:"#7B241C",borderRadius:19,padding:17,marginTop:12,marginBottom:4,overflow:"hidden"},badge:{alignSelf:"flex-start",backgroundColor:"#FFD976",borderRadius:20,paddingHorizontal:9,paddingVertical:5},badgeText:{color:"#5D1B16",fontSize:8,fontWeight:"900",letterSpacing:.7},value:{color:"#FFF2C8",fontSize:25,fontWeight:"900",marginTop:11},title:{color:"#FFF",fontSize:16,fontWeight:"900",marginTop:3},subtitle:{color:"#F5CEC9",fontSize:10,lineHeight:15,marginTop:5},action:{color:"#FFD976",fontSize:10,fontWeight:"900",marginTop:12} });
