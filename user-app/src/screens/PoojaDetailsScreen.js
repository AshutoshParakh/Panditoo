import React from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

const getSamagriIcon = (itemName) => {
  const name = itemName.toLowerCase();
  if (name.includes("water") || name.includes("gangajal") || name.includes("जल")) return "💧";
  if (name.includes("rice") || name.includes("akshat") || name.includes("चावल") || name.includes("अक्षत")) return "🍚";
  if (name.includes("flower") || name.includes("phool") || name.includes("पुष्प") || name.includes("फूल") || name.includes("माला")) return "🌸";
  if (name.includes("diya") || name.includes("dhoop") || name.includes("oil") || name.includes("दीपक") || name.includes("धूप") || name.includes("तेल")) return "🪔";
  if (name.includes("coconut") || name.includes("nariyal") || name.includes("नारियल")) return "🥥";
  if (name.includes("honey") || name.includes("madhu") || name.includes("शहद")) return "🍯";
  if (name.includes("sandalwood") || name.includes("chandan") || name.includes("चंदन")) return "🪵";
  if (name.includes("sweet") || name.includes("prasad") || name.includes("भोग") || name.includes("प्रसाद") || name.includes("मिठाई")) return "🍬";
  if (name.includes("leaf") || name.includes("leaves") || name.includes("पत्ता") || name.includes("पत्ते") || name.includes("पान")) return "🍃";
  if (name.includes("havan") || name.includes("कुंड") || name.includes("लकड़ी") || name.includes("wood")) return "🔥";
  if (name.includes("book") || name.includes("पुस्तक") || name.includes("कथा")) return "📖";
  return "🔸";
};

export default function PoojaDetailsScreen({ route, navigation }) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || "en";
  const { pooja } = route.params || {};

  if (!pooja) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No pooja details provided.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Split samagri_list into "Pandit will bring" and "You need to arrange"
  const samagriList = Array.isArray(pooja.samagri_list) ? pooja.samagri_list : [];
  const panditSamagri = samagriList.filter((item) => item.provided_by === "pandit");
  const userSamagri = samagriList.filter((item) => item.provided_by === "user");

  const renderSamagriItem = (item, index) => {
    const itemName = currentLang === "hi" ? (item.item_name_hi || item.item_name_en) : (item.item_name_en || item.item_name_hi);
    const icon = getSamagriIcon(itemName);

    return (
      <View key={index} style={styles.samagriRow}>
        <Text style={styles.samagriIcon}>{icon}</Text>
        <View style={styles.samagriTextCol}>
          <Text style={styles.samagriItemName}>{itemName}</Text>
          <Text style={styles.samagriQty}>{item.quantity}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.poojaName}>{pooja.name}</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaBadge}>
              <Text style={styles.metaLabel}>{t("poojaDetails.duration")}</Text>
              <Text style={styles.metaVal}>
                {pooja.duration_minutes} {currentLang === "hi" ? "मिनट" : "mins"}
              </Text>
            </View>
            <View style={[styles.metaBadge, styles.goldBadge]}>
              <Text style={styles.metaLabel}>{t("poojaDetails.price")}</Text>
              <Text style={styles.metaValPrice}>₹{pooja.base_price}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("poojaDetails.description")}</Text>
          <Text style={styles.descriptionText}>{pooja.description}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("poojaDetails.samagri")}</Text>

          {/* Pandit Brings Section */}
          <View style={styles.samagriBox}>
            <View style={[styles.subHeader, styles.panditSubHeader]}>
              <Text style={styles.subHeaderIcon}>👜</Text>
              <Text style={styles.subHeaderTitle}>{t("poojaDetails.panditBrings")}</Text>
            </View>
            <View style={styles.samagriList}>
              {panditSamagri.length > 0 ? (
                panditSamagri.map((item, idx) => renderSamagriItem(item, idx))
              ) : (
                <Text style={styles.emptySamagriText}>{t("poojaDetails.noSamagri")}</Text>
              )}
            </View>
          </View>

          {/* User Arranges Section */}
          <View style={[styles.samagriBox, styles.userSamagriBox]}>
            <View style={[styles.subHeader, styles.userSubHeader]}>
              <Text style={styles.subHeaderIcon}>🛒</Text>
              <Text style={styles.subHeaderTitle}>{t("poojaDetails.userArranges")}</Text>
            </View>
            <View style={styles.samagriList}>
              {userSamagri.length > 0 ? (
                userSamagri.map((item, idx) => renderSamagriItem(item, idx))
              ) : (
                <Text style={styles.emptySamagriText}>{t("poojaDetails.noSamagri")}</Text>
              )}
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.bookButton}
          activeOpacity={0.8}
          onPress={() => navigation.navigate("SelectDateTime", { pooja })}
        >
          <Text style={styles.bookButtonText}>{t("poojaDetails.bookButton")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7efe5",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    color: "#b91c1c",
    fontWeight: "600",
  },
  header: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e3d5c5",
    shadowColor: "#6a1b1a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 16,
  },
  poojaName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#6a1b1a",
  },
  metaRow: {
    flexDirection: "row",
    gap: 12,
  },
  metaBadge: {
    flex: 1,
    backgroundColor: "#f7efe5",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  goldBadge: {
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  metaLabel: {
    fontSize: 12,
    color: "#a08f80",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  metaVal: {
    fontSize: 16,
    fontWeight: "700",
    color: "#5f4b3a",
  },
  metaValPrice: {
    fontSize: 18,
    fontWeight: "800",
    color: "#d97706",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#6a1b1a",
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 16,
    color: "#5f4b3a",
    lineHeight: 24,
  },
  samagriBox: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e3d5c5",
    overflow: "hidden",
    marginBottom: 16,
  },
  userSamagriBox: {
    borderColor: "#e3d5c5",
  },
  subHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#fcf9f5",
    borderBottomWidth: 1,
    borderBottomColor: "#f0e3d5",
    gap: 8,
  },
  panditSubHeader: {
    backgroundColor: "#fef3c7",
    borderBottomColor: "#fde68a",
  },
  userSubHeader: {
    backgroundColor: "#fcf1f1",
    borderBottomColor: "#fee2e2",
  },
  subHeaderIcon: {
    fontSize: 18,
  },
  subHeaderTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#6a1b1a",
  },
  samagriList: {
    padding: 12,
    gap: 12,
  },
  samagriRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    gap: 10,
  },
  samagriIcon: {
    fontSize: 22,
  },
  samagriTextCol: {
    flex: 1,
  },
  samagriItemName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#3a2d21",
  },
  samagriQty: {
    fontSize: 13,
    color: "#a08f80",
    fontWeight: "600",
    marginTop: 1,
  },
  emptySamagriText: {
    fontSize: 14,
    color: "#a08f80",
    fontStyle: "italic",
    padding: 8,
  },
  bookButton: {
    height: 54,
    backgroundColor: "#d97706",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#d97706",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
    marginTop: 10,
  },
  bookButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
});
