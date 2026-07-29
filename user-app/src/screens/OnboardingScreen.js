import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LANGUAGE_STORAGE_KEY } from "../i18n";

export default function OnboardingScreen({ navigation }) {
  const { t, i18n } = useTranslation();

  React.useEffect(() => {
    AsyncStorage.getItem("user-app-token").then((token) => {
      if (token) {
        navigation.reset({
          index: 0,
          routes: [{ name: "Main" }],
        });
      }
    });
  }, []);

  const handleLanguageSelect = async (lang) => {
    await i18n.changeLanguage(lang);
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    navigation.navigate("Login");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.omText}>ॐ</Text>
          <Text style={styles.title}>{t("onboarding.title")}</Text>
          <Text style={styles.subtitle}>{t("onboarding.subtitle")}</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.langButton}
            onPress={() => handleLanguageSelect("en")}
            activeOpacity={0.8}
          >
            <Text style={styles.langButtonText}>English</Text>
            <Text style={styles.langSubText}>Select English language</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.langButton, styles.saffronBtn]}
            onPress={() => handleLanguageSelect("hi")}
            activeOpacity={0.8}
          >
            <Text style={styles.langButtonTextHindi}>हिन्दी</Text>
            <Text style={styles.langSubText}>हिंदी भाषा चुनें</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7efe5",
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "space-between",
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    marginTop: 60,
    gap: 12,
  },
  omText: {
    fontSize: 72,
    color: "#d97706",
    fontWeight: "300",
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#6a1b1a",
    textAlign: "center",
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 18,
    color: "#5f4b3a",
    textAlign: "center",
    lineHeight: 24,
    marginTop: 6,
  },
  buttonContainer: {
    width: "100%",
    gap: 20,
    marginBottom: 60,
  },
  langButton: {
    width: "100%",
    minHeight: 64,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#6a1b1a",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    shadowColor: "#6a1b1a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  saffronBtn: {
    borderColor: "#d97706",
  },
  langButtonText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#6a1b1a",
  },
  langButtonTextHindi: {
    fontSize: 24,
    fontWeight: "700",
    color: "#d97706",
  },
  langSubText: {
    fontSize: 13,
    color: "#7f6b5b",
    marginTop: 2,
  },
});
