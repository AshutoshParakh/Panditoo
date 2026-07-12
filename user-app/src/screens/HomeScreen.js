import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { useTranslation } from "react-i18next";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000/api";

const getEmojiForPooja = (name) => {
  const n = name.toLowerCase();
  if (n.includes("ganesha") || n.includes("गणेश")) return "🕉️";
  if (n.includes("satyanarayan") || n.includes("सत्यनारायण")) return "📖";
  if (n.includes("griha") || n.includes("गृह")) return "🏡";
  if (n.includes("jaap") || n.includes("जाप") || n.includes("mrityunjaya")) return "📿";
  if (n.includes("lakshmi") || n.includes("लक्ष्मी")) return "🪙";
  return "🌸";
};

export default function HomeScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || "en";
  const [poojas, setPoojas] = useState([]);
  const [loading, setLoading] = useState(true);

  const getFallbackPoojas = () => [
    {
      id: "f1",
      name: currentLang === "hi" ? "गणेश पूजा" : "Ganesha Pooja",
      description: currentLang === "hi"
        ? "विघ्नहर्ता भगवान श्री गणेश की कृपा प्राप्त करने के लिए विशेष पूजा।"
        : "A special ritual to invoke the blessings of Lord Ganesha, the remover of obstacles.",
      base_price: 2100,
      duration_minutes: 60,
      samagri_list: [
        { item_name_en: "Gangajal", item_name_hi: "गंगाजल", quantity: "1 bottle", provided_by: "pandit" },
        { item_name_en: "Diya & Oil", item_name_hi: "दीया और तेल", quantity: "1 set", provided_by: "user" },
        { item_name_en: "Coconut", item_name_hi: "नारियल", quantity: "1 piece", provided_by: "user" },
        { item_name_en: "Flowers", item_name_hi: "फूल", quantity: "1 bunch", provided_by: "user" },
      ],
    },
    {
      id: "f2",
      name: currentLang === "hi" ? "सत्यनारायण कथा" : "Satyanarayan Katha",
      description: currentLang === "hi"
        ? "सुख, शांति और समृद्धि के लिए श्री सत्यनारायण व्रत एवं कथा पूजन।"
        : "Vrat and path ritual dedicated to Lord Vishnu for family well-being and prosperity.",
      base_price: 3500,
      duration_minutes: 120,
      samagri_list: [
        { item_name_en: "Pooja Book", item_name_hi: "पूजा पुस्तक", quantity: "1 unit", provided_by: "pandit" },
        { item_name_en: "Sandalwood Paste", item_name_hi: "चंदन", quantity: "1 cup", provided_by: "pandit" },
        { item_name_en: "Banana leaves", item_name_hi: "केले के पत्ते", quantity: "4 pieces", provided_by: "user" },
        { item_name_en: "Sweets (Prasad)", item_name_hi: "प्रसाद", quantity: "500g", provided_by: "user" },
      ],
    },
    {
      id: "f3",
      name: currentLang === "hi" ? "गृह प्रवेश पूजा" : "Griha Pravesh Pooja",
      description: currentLang === "hi"
        ? "नए घर में सुख-शांति और सकारात्मक ऊर्जा के प्रवेश के लिए गृह प्रवेश पूजन।"
        : "Traditional housewarming ceremony to purify the home and invite positive energy.",
      base_price: 5100,
      duration_minutes: 180,
      samagri_list: [
        { item_name_en: "Havan Kund", item_name_hi: "हवन कुंड", quantity: "1 unit", provided_by: "pandit" },
        { item_name_en: "Havan Samagri", item_name_hi: "हवन सामग्री", quantity: "1 kg", provided_by: "pandit" },
        { item_name_en: "Mango Leaves", item_name_hi: "आम के पत्ते", quantity: "11 pieces", provided_by: "user" },
        { item_name_en: "Milk", item_name_hi: "दूध", quantity: "1 litre", provided_by: "user" },
      ],
    },
  ];

  const fetchPoojas = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/pooja-types?lang=${currentLang}`);
      const json = await response.json();
      if (json && json.success && Array.isArray(json.data)) {
        setPoojas(json.data);
      } else {
        setPoojas(getFallbackPoojas());
      }
    } catch (error) {
      console.warn("Failed to fetch poojas, utilizing localized fallback: ", error.message);
      setPoojas(getFallbackPoojas());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPoojas();
  }, [currentLang]);

  const renderPoojaCard = ({ item }) => {
    const emoji = getEmojiForPooja(item.name);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("PoojaDetails", { pooja: item })}
        activeOpacity={0.8}
      >
        <View style={styles.cardLeft}>
          <Text style={styles.emojiIcon}>{emoji}</Text>
          <View style={styles.textContainer}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.duration}>
              ⏱️ {item.duration_minutes} {currentLang === "hi" ? "मिनट" : "mins"}
            </Text>
          </View>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.price}>₹{item.base_price}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.containerInner}>
        <View style={styles.topInfo}>
          <Text style={styles.title}>{t("home.title")}</Text>
          <Text style={styles.subtitle}>{t("home.subtitle")}</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#d97706" />
          </View>
        ) : (
          <FlatList
            data={poojas}
            keyExtractor={(item) => item.id}
            renderItem={renderPoojaCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7efe5",
  },
  containerInner: {
    flex: 1,
    paddingTop: 16,
  },
  topInfo: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#6a1b1a",
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 15,
    color: "#5f4b3a",
    lineHeight: 20,
    marginTop: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e3d5c5",
    shadowColor: "#6a1b1a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    minHeight: 80,
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  emojiIcon: {
    fontSize: 32,
  },
  textContainer: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#6a1b1a",
  },
  duration: {
    fontSize: 14,
    color: "#a08f80",
    fontWeight: "600",
  },
  cardRight: {
    alignItems: "flex-end",
    marginLeft: 12,
  },
  price: {
    fontSize: 20,
    fontWeight: "700",
    color: "#d97706",
  },
});
