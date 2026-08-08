import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config/api";

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

  const handleSendOtp = async () => {
    setError("");
    if (phone.length !== 10) {
      setError(t("login.invalidPhone"));
      return;
    }
    setLoading(true);
    try {
      console.log(`[PanditApp] Sending OTP request to: ${API_URL}/auth/pandit/send-otp`);
      const res = await fetchWithTimeout(`${API_URL}/auth/pandit/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOtpSent(true);
        const currentOtp = data.otp || data.debugOtp;
        if (currentOtp) {
          console.log(`\n========================================`);
          console.log(`📲 RECEIVED OTP FROM SERVER: ${currentOtp}`);
          console.log(`========================================\n`);
          setError(`✓ OTP Sent! Debug OTP is: ${currentOtp}`);
        }
      } else {
        setError(data.message || "Failed to send OTP. Please try again.");
      }
    } catch (err) {
      console.warn("[PanditApp] send-otp failed:", err.message);
      setError(`Connection failed (${API_URL}). Ensure device & computer are on same Wi-Fi.`);
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
      const result = await login(phone, otp);
      setLoading(false);
      if (result && result.isNewUser) {
        navigation.navigate("ProfileSetup", { phone: result.phone || phone });
      }
      // If result.isNewUser is false, AuthContext updates token & pandit state,
      // automatically transitioning AppNavigator to the Main Dashboard screen.
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
            <View style={styles.brandPill}><Text style={styles.brandMark}>ॐ</Text><Text style={styles.brandName}>PANDITOO PARTNER</Text></View>
            <Text style={styles.welcome}>Your sacred services,{"\n"}beautifully managed.</Text>
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
          <View style={styles.trustRow}><Text style={styles.trustText}>✓ Secure OTP</Text><Text style={styles.trustDot}>•</Text><Text style={styles.trustText}>Verified partner access</Text></View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  brandPill: { flexDirection: "row", alignItems: "center", backgroundColor: "#7C2929", borderRadius: 22, paddingHorizontal: 13, paddingVertical: 8, marginBottom: 20 },
  brandMark: { color: "#FFD88A", fontSize: 19, fontWeight: "900", marginRight: 8 },
  brandName: { color: "#FFFFFF", fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  welcome: { color: "#332822", fontSize: 30, lineHeight: 37, fontWeight: "900", textAlign: "center", marginBottom: 19 },
  trustRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 18 },
  trustText: { color: "#786B62", fontSize: 11, fontWeight: "700" },
  trustDot: { color: "#B9AAA0", marginHorizontal: 9 },
  container: {
    flex: 1,
    backgroundColor: "#F7F1EA",
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
    marginBottom: 20,
  },
  appIcon: {
    fontSize: 60,
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
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
    borderRadius: 20,
    padding: 24,
    shadowColor: "#7c2d12",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#E7D7C8",
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
    backgroundColor: "#8F3030",
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
