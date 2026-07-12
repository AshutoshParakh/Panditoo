import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000/api";

const fetchWithTimeout = async (url, options, timeout = 10000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

export default function LoginScreen({ navigation }) {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [testMode, setTestMode] = useState(false);

  const handleSendOtp = async () => {
    setError("");
    if (phone.length !== 10) {
      setError(t("login.invalidPhone"));
      return;
    }
    setLoading(true);
    try {
      const res = await fetchWithTimeout(`${API_URL}/auth/pandit/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOtpSent(true);
      } else {
        // Fallback for easy testing
        setError(data.message || "Failed to send OTP. Test mode enabled.");
        setOtpSent(true);
        setTestMode(true);
      }
    } catch (err) {
      console.warn("Pandit Auth send-otp failed, using fallback:", err.message);
      setError("Server connection failed. Test mode enabled.");
      setOtpSent(true);
      setTestMode(true);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError("");
    if (otp.length !== 6) {
      setError(t("login.invalidOtp"));
      return;
    }
    setLoading(true);
    try {
      // In test mode without backend running, we can mock a new or existing user
      if (testMode) {
        // Simple mock behavior: if number ends in '00', it's a new user, otherwise it's existing.
        // Or if it's 10 digits and correct, navigate.
        setTimeout(() => {
          setLoading(false);
          const isNew = phone.endsWith("0") || phone.endsWith("00");
          if (isNew) {
            navigation.navigate("ProfileSetup", { phone });
          } else {
            // For testing, mock a registered pandit login
            // We direct them to Main which checks if pandit profile details exist
            navigation.navigate("ProfileSetup", { phone });
          }
        }, 1000);
        return;
      }

      const result = await login(phone, otp);
      setLoading(false);
      if (result.isNewUser) {
        navigation.navigate("ProfileSetup", { phone: result.phone });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: "Main" }],
        });
      }
    } catch (err) {
      setError(err.message || "Invalid OTP. Please try again.");
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.appIcon}>🕉️</Text>
            <Text style={styles.title}>{t("login.title")}</Text>
            <Text style={styles.subtitle}>{t("login.subtitle")}</Text>
          </View>

          <View style={styles.card}>
            {!otpSent ? (
              <>
                <Text style={styles.label}>{t("login.phoneLabel")}</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.prefix}>+91</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t("login.phonePlaceholder")}
                    placeholderTextColor="#a08f80"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={phone}
                    onChangeText={(txt) => setPhone(txt.replace(/[^0-9]/g, ""))}
                    editable={!loading}
                  />
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <TouchableOpacity
                  style={styles.button}
                  onPress={handleSendOtp}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.buttonText}>{t("login.sendOtp")}</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.otpSection}>
                <Text style={styles.label}>{t("login.otpLabel")}</Text>
                <TextInput
                  style={[styles.input, styles.otpInput]}
                  placeholder={t("login.otpPlaceholder")}
                  placeholderTextColor="#a08f80"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={(txt) => setOtp(txt.replace(/[^0-9]/g, ""))}
                  editable={!loading}
                />

                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                {testMode ? (
                  <Text style={styles.testNote}>{t("login.testModeNote")}</Text>
                ) : null}

                <TouchableOpacity
                  style={[styles.button, styles.verifyBtn]}
                  onPress={handleVerifyOtp}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.buttonText}>{t("login.verifyOtp")}</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.changePhoneBtn}
                  onPress={() => {
                    setOtpSent(false);
                    setOtp("");
                    setError("");
                    setTestMode(false);
                  }}
                  disabled={loading}
                >
                  <Text style={styles.changePhoneText}>
                    {t("login.changePhone")}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff7ed",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  appIcon: {
    fontSize: 60,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#7c2d12",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#78350f",
    marginTop: 6,
    textAlign: "center",
    opacity: 0.8,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#7c2d12",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
    color: "#431407",
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fcfaf7",
    borderWidth: 1.5,
    borderColor: "#fed7aa",
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 20,
    height: 60,
  },
  prefix: {
    fontSize: 20,
    fontWeight: "700",
    color: "#ea580c",
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    color: "#431407",
    height: "100%",
  },
  otpInput: {
    backgroundColor: "#fcfaf7",
    borderWidth: 1.5,
    borderColor: "#fed7aa",
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 60,
    fontSize: 24,
    textAlign: "center",
    letterSpacing: 8,
    marginBottom: 16,
  },
  button: {
    height: 56,
    backgroundColor: "#d97706",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#d97706",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
    marginTop: 8,
  },
  verifyBtn: {
    backgroundColor: "#7c2d12",
    shadowColor: "#7c2d12",
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
  },
  errorText: {
    fontSize: 14,
    color: "#dc2626",
    fontWeight: "600",
    marginBottom: 16,
  },
  testNote: {
    fontSize: 12,
    color: "#d97706",
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 16,
    backgroundColor: "#fffbeb",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fef3c7",
  },
  otpSection: {
    gap: 6,
  },
  changePhoneBtn: {
    marginTop: 20,
    alignSelf: "center",
    padding: 8,
  },
  changePhoneText: {
    fontSize: 14,
    color: "#7c2d12",
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});
