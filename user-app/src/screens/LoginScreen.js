import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";

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
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [source, setSource] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const applyLink = (url) => {
      const match = String(url || "").match(/[?&]ref=([^&]+)/i);
      if (match) setReferralCode(decodeURIComponent(match[1]).toUpperCase().replace(/[^A-Z0-9_-]/g, ""));
    };
    Linking.getInitialURL().then(applyLink).catch(() => {});
    const subscription = Linking.addEventListener("url", ({ url }) => applyLink(url));
    return () => subscription.remove();
  }, []);

  const handleSendOtp = async () => {
    setError("");
    if (phone.length !== 10) {
      setError(t("login.invalidPhone"));
      return;
    }
    setLoading(true);
    try {
      const res = await fetchWithTimeout(`${API_URL}/auth/user/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOtpSent(true);
      } else {
        setError(data.message || "Failed to send OTP. Please try again.");
      }
    } catch (err) {
      console.warn("Auth send-otp failed:", err.message);
      setError("Server connection failed. Please try again.");
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
      const res = await fetchWithTimeout(`${API_URL}/auth/user/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.isNewUser) {
          setError("Your phone number is not registered. Please complete registration below.");
          setIsRegistering(true);
        } else if (data.token) {
          await AsyncStorage.setItem("user-app-token", data.token);
          if (data.user && data.user.id) {
            await AsyncStorage.setItem("user-id", data.user.id);
          }
          navigation.reset({
            index: 0,
            routes: [{ name: "Main" }],
          });
        }
      } else {
        setError(data.message || "Invalid or expired OTP. Please try again.");
      }
    } catch (err) {
      console.warn("Auth verify-otp failed:", err.message);
      setError("Failed to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError("");
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetchWithTimeout(`${API_URL}/auth/user/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email, address, source, referral_code: referralCode.trim() || undefined }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.token) {
        await AsyncStorage.setItem("user-app-token", data.token);
        if (data.user && data.user.id) {
          await AsyncStorage.setItem("user-id", data.user.id);
        }
        navigation.reset({
          index: 0,
          routes: [{ name: "Main" }],
        });
      } else {
        setError(data.message || "Registration failed.");
      }
    } catch (err) {
      console.warn("Auth register failed:", err.message);
      setError("Registration request failed. Try again.");
    } finally {
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
          <TouchableOpacity accessibilityLabel="Go back" style={styles.back} onPress={() => navigation.goBack()}><Text style={styles.backText}>‹</Text></TouchableOpacity>
          <View style={styles.header}>
            <View style={styles.brand}><Text style={styles.brandOm}>ॐ</Text><Text style={styles.brandText}>PANDITOO</Text></View>
            {!isRegistering ? <Text style={styles.welcome}>Begin your ceremony{"\n"}with confidence.</Text> : null}
            <Text style={styles.title}>
              {isRegistering ? "Create Profile" : t("login.title")}
            </Text>
            <Text style={styles.subtitle}>{isRegistering ? "Just a few details to complete your account." : "Sign in securely with your mobile number."}</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.stepRow}><Text style={styles.step}>{isRegistering ? "FINAL STEP" : otpSent ? "STEP 2 OF 2" : "STEP 1 OF 2"}</Text><Text style={styles.secure}>✓ SECURE</Text></View>
            {!isRegistering ? (
              <>
                <Text style={styles.label}>{t("login.phoneLabel")}</Text>
                <View style={styles.phoneBox}><Text style={styles.prefix}>+91</Text><View style={styles.verticalRule}/><TextInput
                  style={styles.phoneInput}
                  placeholder={t("login.phonePlaceholder")}
                  placeholderTextColor="#a08f80"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={phone}
                  onChangeText={(txt) => setPhone(txt.replace(/[^0-9]/g, ""))}
                  editable={!otpSent && !loading}
                /></View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                {!otpSent ? (
                  <TouchableOpacity
                    style={styles.button}
                    onPress={handleSendOtp}
                    disabled={loading}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.buttonText}>
                      {loading ? t("login.sending") : t("login.sendOtp")}
                    </Text>
                  </TouchableOpacity>
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

                    <TouchableOpacity
                      style={[styles.button, styles.verifyBtn]}
                      onPress={handleVerifyOtp}
                      disabled={loading}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.buttonText}>
                        {loading ? t("login.verifying") : t("login.verifyOtp")}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.changePhoneBtn}
                      onPress={() => {
                        setOtpSent(false);
                        setOtp("");
                        setError("");
                      }}
                      disabled={loading}
                    >
                      <Text style={styles.changePhoneText}>
                        ← Change Phone Number
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.otpSection}>
                <Text style={styles.label}>Register Details</Text>

                <Text style={styles.subLabel}>Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your name"
                  placeholderTextColor="#a08f80"
                  value={name}
                  onChangeText={setName}
                  editable={!loading}
                />

                <Text style={styles.subLabel}>Email (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#a08f80"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  editable={!loading}
                />

                <Text style={styles.subLabel}>Address (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your address"
                  placeholderTextColor="#a08f80"
                  value={address}
                  onChangeText={setAddress}
                  editable={!loading}
                />

                <Text style={styles.subLabel}>How did you hear about us? (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Google, Friend, Advertisement, etc."
                  placeholderTextColor="#a08f80"
                  value={source}
                  onChangeText={setSource}
                  editable={!loading}
                />

                <Text style={styles.subLabel}>Referral code (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Example: TEMPLE01"
                  placeholderTextColor="#a08f80"
                  autoCapitalize="characters"
                  value={referralCode}
                  onChangeText={(value) => setReferralCode(value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
                  editable={!loading}
                />

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <TouchableOpacity
                  style={[styles.button, styles.verifyBtn]}
                  onPress={handleRegister}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Text style={styles.buttonText}>
                    {loading ? "Registering..." : "Complete Registration"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.changePhoneBtn}
                  onPress={() => {
                    setIsRegistering(false);
                    setOtpSent(false);
                    setOtp("");
                    setName("");
                    setEmail("");
                    setAddress("");
                    setSource("");
                    setReferralCode("");
                    setError("");
                  }}
                  disabled={loading}
                >
                  <Text style={styles.changePhoneText}>
                    ← Back to Login
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          <View style={styles.trustRow}><Text style={styles.trustText}>Verified pandits</Text><Text style={styles.trustDot}>•</Text><Text style={styles.trustText}>Secure payments</Text><Text style={styles.trustDot}>•</Text><Text style={styles.trustText}>Private details</Text></View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  back: { position: "absolute", top: 14, left: 18, width: 42, height: 42, borderRadius: 21, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E8DCD1", zIndex: 2 },
  backText: { color: "#8F3030", fontSize: 29, marginTop: -3 },
  brand: { flexDirection: "row", alignItems: "center", backgroundColor: "#8F3030", borderRadius: 22, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 20 },
  brandOm: { color: "#FFD98C", fontSize: 19, fontWeight: "900", marginRight: 8 },
  brandText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900", letterSpacing: 1.6 },
  welcome: { color: "#302823", fontSize: 31, lineHeight: 38, fontWeight: "900", textAlign: "center", marginBottom: 17 },
  subtitle: { color: "#877A70", fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 6 },
  stepRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  step: { color: "#8F3030", fontSize: 9, fontWeight: "900", letterSpacing: 1.1 },
  secure: { color: "#27845D", fontSize: 9, fontWeight: "900", letterSpacing: .8 },
  phoneBox: { height: 58, flexDirection: "row", alignItems: "center", backgroundColor: "#FCFAF7", borderWidth: 1.5, borderColor: "#DCC9BA", borderRadius: 14, paddingHorizontal: 14, marginBottom: 16 },
  prefix: { color: "#8F3030", fontSize: 17, fontWeight: "900" },
  verticalRule: { width: 1, height: 25, backgroundColor: "#DED2C8", marginHorizontal: 12 },
  phoneInput: { flex: 1, height: 56, color: "#352D28", fontSize: 18, fontWeight: "700" },
  trustRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", flexWrap: "wrap", marginTop: 18 },
  trustText: { color: "#8B7F76", fontSize: 10, fontWeight: "700" },
  trustDot: { color: "#BDAFA5", marginHorizontal: 7 },
  container: {
    flex: 1,
    backgroundColor: "#F7F1EA",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 22,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#6a1b1a",
    textAlign: "center",
  },
  form: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 21,
    shadowColor: "#6a1b1a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#E7D9CD",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#5f4b3a",
    marginBottom: 8,
  },
  subLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#5f4b3a",
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    height: 54,
    backgroundColor: "#fcfaf7",
    borderWidth: 1,
    borderColor: "#e3d5c5",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 18,
    color: "#3a2d21",
    marginBottom: 16,
  },
  otpInput: { textAlign: "center", letterSpacing: 8, fontSize: 23, fontWeight: "800", borderColor: "#CDAFA4" },
  button: {
    height: 52,
    backgroundColor: "#8F3030",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#8F3030",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
    marginTop: 8,
  },
  verifyBtn: {
    backgroundColor: "#6a1b1a",
    shadowColor: "#6a1b1a",
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
  },
  errorText: {
    fontSize: 14,
    color: "#b91c1c",
    fontWeight: "600",
    marginBottom: 12,
  },
  otpSection: {
    marginTop: 8,
    gap: 8,
  },
  changePhoneBtn: {
    marginTop: 16,
    alignSelf: "center",
    padding: 8,
  },
  changePhoneText: {
    fontSize: 14,
    color: "#5f4b3a",
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});
