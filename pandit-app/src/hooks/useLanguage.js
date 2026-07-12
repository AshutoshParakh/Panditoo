import { useEffect, useState } from "react";
import i18n, { loadStoredLanguage, setStoredLanguage } from "../i18n";

export const useLanguage = () => {
  const [language, setLanguage] = useState(i18n.language || "en");

  useEffect(() => {
    loadStoredLanguage().then(setLanguage).catch(() => setLanguage("en"));
  }, []);

  const toggleLanguage = async () => {
    const nextLanguage = language === "en" ? "hi" : "en";
    await setStoredLanguage(nextLanguage);
    setLanguage(nextLanguage);
  };

  return {
    language,
    toggleLanguage,
  };
};
