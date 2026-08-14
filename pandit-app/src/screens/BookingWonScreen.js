import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { colors, shadow } from "../theme";

const safeFormatDate = (dateVal, hindi = false) => {
  if (!dateVal) return "—";
  try {
    const str = String(dateVal).trim();
    let d;
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const parts = str.split("-");
      d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    } else {
      d = new Date(str);
    }
    if (isNaN(d.getTime())) return str;
    const monthsEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthsHi = ["जनवरी", "फरवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"];
    const daysEn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const daysHi = ["रवि", "सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि"];
    const day = d.getDate();
    const monthStr = hindi ? monthsHi[d.getMonth()] : monthsEn[d.getMonth()];
    const dayOfWeekStr = hindi ? daysHi[d.getDay()] : daysEn[d.getDay()];
    return `${dayOfWeekStr}, ${day} ${monthStr} ${d.getFullYear()}`;
  } catch (_) {
    return String(dateVal || "—");
  }
};

const safeMoney = (amount) => {
  try {
    const num = Math.round(Number(amount || 0));
    return `₹${num.toLocaleString("en-US")}`;
  } catch (_) {
    return "₹0";
  }
};

export default function BookingWonScreen({ route, navigation }) {
  const { i18n } = useTranslation();
  const hindi = i18n.language === "hi";
  const booking = route.params?.booking || {};
  const name = hindi ? booking.pooja_name_hi || booking.pooja_name_en : booking.pooja_name_en || booking.pooja_name_hi;
  const date = safeFormatDate(booking.booking_date, hindi);
  const done = () => {
    try {
      navigation.reset({ index: 0, routes: [{ name: "Main", state: { routes: [{ name: "MyBookings" }] } }] });
    } catch (_) {
      navigation.navigate("Main");
    }
  };
  return (
    <SafeAreaView style={s.screen}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <View style={s.checkRing}>
            <View style={s.check}>
              <Text style={s.checkText}>✓</Text>
            </View>
          </View>
          <Text style={s.eyebrow}>{hindi ? "बुकिंग पक्की हुई" : "BOOKING CONFIRMED"}</Text>
          <Text style={s.title}>{hindi ? "यह पूजा आपकी है" : "You’ve secured this pooja"}</Text>
          <Text style={s.subtitle}>
            {hindi ? "ग्राहक को पुष्टि भेज दी गई है। नीचे पूजा का विवरण देखें।" : "The customer has been notified. Everything you need is organised below."}
          </Text>
        </View>
        <View style={s.card}>
          <View style={s.cardTop}>
            <View style={s.om}>
              <Text style={s.omText}>ॐ</Text>
            </View>
            <View style={s.cardCopy}>
              <Text style={s.label}>CEREMONY</Text>
              <Text style={s.pooja}>{name || "Pooja ceremony"}</Text>
            </View>
            <View style={s.live}>
              <Text style={s.liveText}>CONFIRMED</Text>
            </View>
          </View>
          <View style={s.rule} />
          <Detail number="01" label={hindi ? "तारीख और समय" : "Date & time"} value={`${date} · ${String(booking.booking_time || "—").slice(0, 5)}`} />
          <Detail number="02" label={hindi ? "ग्राहक" : "Customer"} value={booking.user_name || "Customer"} />
          <Detail number="03" label={hindi ? "पूजा स्थान" : "Location"} value={booking.address || "Address will appear in My Bookings"} last />
        </View>
        <View style={s.payout}>
          <View>
            <Text style={s.payoutLabel}>{hindi ? "आपकी कमाई" : "YOUR PAYOUT"}</Text>
            <Text style={s.payoutHint}>{hindi ? "पूजा पूरी होने के बाद" : "After ceremony completion"}</Text>
          </View>
          <Text style={s.amount}>{safeMoney(booking.pandit_payout_amount)}</Text>
        </View>
        <View style={s.note}>
          <Text style={s.noteMark}>i</Text>
          <Text style={s.noteText}>
            {hindi ? "ग्राहक संपर्क और पूजा OTP मेरी बुकिंग में सुरक्षित रूप से मिलेगा।" : "Customer coordination and ceremony OTP will be securely available in My Bookings."}
          </Text>
        </View>
        <TouchableOpacity style={s.button} onPress={done}>
          <Text style={s.buttonText}>{hindi ? "मेरी बुकिंग खोलें" : "Open My Bookings"}</Text>
          <Text style={s.arrow}>›</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
const Detail=({number,label,value,last})=><View style={[s.detail,!last&&s.detailRule]}><View style={s.number}><Text style={s.numberText}>{number}</Text></View><View style={s.detailCopy}><Text style={s.detailLabel}>{label}</Text><Text style={s.detailValue}>{value}</Text></View></View>;
const s=StyleSheet.create({screen:{flex:1,backgroundColor:colors.bg},content:{padding:19,paddingBottom:34},hero:{alignItems:"center",paddingTop:12,paddingBottom:23},checkRing:{width:82,height:82,borderRadius:41,borderWidth:1,borderColor:"#ACCFBC",alignItems:"center",justifyContent:"center"},check:{width:62,height:62,borderRadius:31,backgroundColor:colors.greenSoft,alignItems:"center",justifyContent:"center"},checkText:{color:colors.green,fontSize:29,fontWeight:"900"},eyebrow:{color:colors.green,fontSize:10,fontWeight:"900",letterSpacing:1.4,marginTop:16},title:{color:colors.ink,fontSize:28,lineHeight:35,fontWeight:"900",textAlign:"center",marginTop:6},subtitle:{color:colors.muted,fontSize:13,lineHeight:20,textAlign:"center",marginTop:7,paddingHorizontal:12},card:{backgroundColor:colors.surface,borderRadius:18,borderWidth:1,borderColor:colors.border,padding:16,...shadow},cardTop:{flexDirection:"row",alignItems:"center"},om:{width:47,height:47,borderRadius:13,backgroundColor:colors.primarySoft,alignItems:"center",justifyContent:"center"},omText:{color:colors.primary,fontSize:23},cardCopy:{flex:1,marginLeft:12},label:{color:colors.muted,fontSize:8,fontWeight:"900",letterSpacing:1},pooja:{color:colors.ink,fontSize:16,fontWeight:"900",marginTop:3},live:{backgroundColor:colors.greenSoft,borderRadius:9,paddingHorizontal:7,paddingVertical:5},liveText:{color:colors.green,fontSize:8,fontWeight:"900"},rule:{height:1,backgroundColor:"#EEE5DD",marginVertical:14},detail:{flexDirection:"row",alignItems:"flex-start",paddingVertical:10},detailRule:{borderBottomWidth:1,borderBottomColor:"#F0E9E3"},number:{width:27,height:27,borderRadius:8,backgroundColor:"#F2ECE7",alignItems:"center",justifyContent:"center"},numberText:{color:"#998B80",fontSize:8,fontWeight:"800"},detailCopy:{flex:1,marginLeft:11},detailLabel:{color:colors.muted,fontSize:10,fontWeight:"700"},detailValue:{color:"#493F39",fontSize:13,lineHeight:19,fontWeight:"800",marginTop:3},payout:{backgroundColor:"#30241F",borderRadius:17,padding:17,flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginTop:13},payoutLabel:{color:"#E5D7CC",fontSize:9,fontWeight:"900",letterSpacing:1},payoutHint:{color:"#AFA097",fontSize:9,marginTop:4},amount:{color:"#FFD36A",fontSize:27,fontWeight:"900"},note:{flexDirection:"row",alignItems:"center",backgroundColor:"#EEEAE5",borderRadius:13,padding:13,marginTop:13},noteMark:{width:22,height:22,borderRadius:11,borderWidth:1,borderColor:"#9C8D82",color:"#776A61",textAlign:"center",textAlignVertical:"center",fontWeight:"800"},noteText:{flex:1,color:"#70645C",fontSize:11,lineHeight:17,marginLeft:10},button:{height:54,borderRadius:14,backgroundColor:colors.primary,flexDirection:"row",alignItems:"center",justifyContent:"center",marginTop:18},buttonText:{color:"#FFF",fontSize:15,fontWeight:"900"},arrow:{color:"#FFF",fontSize:25,marginLeft:9,marginTop:-2}});
