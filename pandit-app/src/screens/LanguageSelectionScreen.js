import React from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../hooks/useLanguage";
import { setStoredLanguage } from "../i18n";

const { width } = Dimensions.get("window");

export default function LanguageSelectionScreen({ navigation }) {
  const { t } = useTranslation();
  const { language } = useLanguage();

  const handleSelectLanguage = async (lang) => {
    await setStoredLanguage(lang);
    navigation.navigate("Login");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topOrnament}>
        <View style={styles.line} />
        <Text style={styles.ornamentSymbol}>❈</Text>
        <View style={styles.line} />
      </View>

      <View style={styles.content}>
        <Text style={styles.welcomeText}>Swagat Hain! / स्वागत है!</Text>
        <Text style={styles.titleText}>Choose Your Language</Text>
        <Text style={styles.subtitleText}>अपनी पसंदीदा भाषा चुनें</Text>

        <View style={styles.cardContainer}>
          <TouchableOpacity
            style={[
              styles.langCard,
              language === "en" && styles.selectedCard,
            ]}
            onPress={() => handleSelectLanguage("en")}
            activeOpacity={0.85}
          >
            <View style={styles.iconCircle}>
              <Text style={styles.cardIcon}>A</Text>
            </View>
            <Text style={styles.cardLabel}>English</Text>
            <Text style={styles.cardSublabel}>Select English</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.langCard,
              language === "hi" && styles.selectedCard,
            ]}
            onPress={() => handleSelectLanguage("hi")}
            activeOpacity={0.85}
          >
            <View style={[styles.iconCircle, styles.hindiCircle]}>
              <Text style={styles.cardIcon}>अ</Text>
            </View>
            <Text style={styles.cardLabel}>हिंदी</Text>
            <Text style={styles.cardSublabel}>हिंदी भाषा चुनें</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.tagline}>
          devotes se judkar puja sampann karayein {"\n"}
          भक्तों से जुड़ें और पूजा संपन्न कराएं
        </Text>
      </View>

      <View style={styles.bottomOrnament}>
        <Text style={styles.flower}>✿</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff7ed", // Warm rich cream
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 40,
  },
  topOrnament: {
    flexDirection: "row",
    alignItems: "center",
    width: "80%",
    justifyContent: "center",
    marginTop: 20,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#b45309",
    opacity: 0.4,
  },
  ornamentSymbol: {
    fontSize: 20,
    color: "#b45309",
    marginHorizontal: 12,
  },
  content: {
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 24,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#7c2d12",
    marginBottom: 8,
    textAlign: "center",
  },
  titleText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#431407",
    textAlign: "center",
  },
  subtitleText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#78350f",
    marginTop: 4,
    marginBottom: 40,
    textAlign: "center",
  },
  cardContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: 16,
    marginBottom: 40,
  },
  langCard: {
    flex: 1,
    height: 180,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#fed7aa",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#7c2d12",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  selectedCard: {
    borderColor: "#ea580c",
    backgroundColor: "#fff7ed",
    borderWidth: 3,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#ffedd5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  hindiCircle: {
    backgroundColor: "#ffedd5",
  },
  cardIcon: {
    fontSize: 28,
    fontWeight: "700",
    color: "#ea580c",
  },
  cardLabel: {
    fontSize: 20,
    fontWeight: "700",
    color: "#431407",
    marginBottom: 4,
  },
  cardSublabel: {
    fontSize: 12,
    color: "#7c2d12",
    opacity: 0.6,
  },
  tagline: {
    fontSize: 14,
    color: "#7c2d12",
    textAlign: "center",
    lineHeight: 22,
    opacity: 0.8,
    fontStyle: "italic",
  },
  bottomOrnament: {
    marginBottom: 20,
  },
  flower: {
    fontSize: 24,
    color: "#b45309",
    opacity: 0.5,
  },
});
