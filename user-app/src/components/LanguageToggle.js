import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LANGUAGE_STORAGE_KEY } from "../i18n";

export const LanguageToggle = () => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language || "en";

  const handleToggle = async () => {
    const nextLang = currentLang === "en" ? "hi" : "en";
    await i18n.changeLanguage(nextLang);
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, nextLang);
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handleToggle} activeOpacity={0.7}>
      <Text style={styles.text}>🌐 {currentLang === "en" ? "EN" : "हिं"}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#f7efe5",
    borderWidth: 1,
    borderColor: "#d97706",
    marginRight: 12,
    minHeight: 38,
    minWidth: 64,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6a1b1a",
  },
});
