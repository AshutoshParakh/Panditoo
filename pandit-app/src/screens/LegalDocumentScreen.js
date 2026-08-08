import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { LEGAL_DOCUMENTS } from "../legal/policies";

export default function LegalDocumentScreen({ route }) {
  const document = LEGAL_DOCUMENTS[route.params?.type] || LEGAL_DOCUMENTS.terms;
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
    <Text style={styles.title}>{document.title}</Text>
    <Text style={styles.meta}>Effective {document.effectiveDate} · Version {document.version}</Text>
    <Text style={styles.intro}>Please read this document carefully. It applies to your use of Panditoo Partner services in India.</Text>
    {document.sections.map(([heading, body], index) => <View key={heading} style={styles.section}><Text style={styles.heading}>{index + 1}. {heading}</Text><Text style={styles.body}>{body}</Text></View>)}
  </ScrollView>;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: "#FFF7ED" }, content: { padding: 20, paddingBottom: 48 }, title: { color: "#7C2D12", fontSize: 27, fontWeight: "800" }, meta: { color: "#81766D", fontSize: 12, marginTop: 6 }, intro: { color: "#4A423C", fontSize: 14, lineHeight: 21, marginTop: 18, padding: 14, backgroundColor: "#FFFFFF", borderRadius: 12, borderWidth: 1, borderColor: "#F0D5BD" }, section: { marginTop: 22 }, heading: { color: "#332D29", fontSize: 17, fontWeight: "800", marginBottom: 7 }, body: { color: "#5C534C", fontSize: 14, lineHeight: 22 } });
