import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import hi from "./locales/hi.json";

export const LANGUAGE_STORAGE_KEY = "user-app-language";

const resources = {
  en: { translation: en },
  hi: { translation: hi },
};

i18n.use(initReactI18next).init({
  compatibilityJSON: "v3",
  resources,
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export const setStoredLanguage = async (language) => {
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  await i18n.changeLanguage(language);
};

export const loadStoredLanguage = async () => {
  const storedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (storedLanguage) {
    await i18n.changeLanguage(storedLanguage);
    return storedLanguage;
  }

  return i18n.language;
};

export default i18n;
