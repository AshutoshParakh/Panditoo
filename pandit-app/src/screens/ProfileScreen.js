import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  Switch,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../hooks/useLanguage";
import { useFocusEffect } from "@react-navigation/native";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000/api";

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const { token, pandit, logout, refreshProfile } = useAuth();
  const { toggleLanguage, language } = useLanguage();

  const [isEditing, setIsEditing] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  // Edit form states
  const [name, setName] = useState("");
  const [specializations, setSpecializations] = useState("");
  const [serviceRadius, setServiceRadius] = useState("");
  const [address, setAddress] = useState("");
  const [holderName, setHolderName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");

  useFocusEffect(
    React.useCallback(() => {
      if (pandit) {
        // Initialize form fields from current pandit details
        setName(pandit.name || "");
        setSpecializations(
          Array.isArray(pandit.specializations)
            ? pandit.specializations.join(", ")
            : ""
        );
        setServiceRadius(String(pandit.service_radius_km || "15"));
        setAddress(pandit.address || "");

        const bank = pandit.bank_account_details || {};
        setHolderName(bank.holderName || "");
        setBankName(bank.bankName || "");
        setAccountNumber(bank.accountNo || bank.accountNumber || "");
        setIfscCode(bank.ifscCode || "");

        // Fetch completed bookings count
        fetchCompletedCount();
      }
    }, [pandit])
  );

  const fetchCompletedCount = async () => {
    if (!pandit?.id) return;
    try {
      const res = await fetch(`${API_URL}/pandits/${pandit.id}/earnings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.success && data.data?.bookings) {
        setCompletedCount(data.data.bookings.length);
      }
    } catch (error) {
      console.warn("Failed to fetch completed bookings count:", error);
    }
  };

  const handleToggleActive = async (value) => {
    try {
      const res = await fetch(`${API_URL}/pandits/${pandit.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: value }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await refreshProfile();
      } else {
        Alert.alert(t("common.error"), data.message || "Failed to update availability");
      }
    } catch (error) {
      console.warn("Failed to toggle availability:", error);
      Alert.alert(t("common.error"), "Network error. Please try again.");
    }
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      Alert.alert(t("common.error"), "Name is required");
      return;
    }

    setSaveLoading(true);
    try {
      const specArray = specializations
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const bankObj = {
        holderName: holderName.trim(),
        bankName: bankName.trim(),
        accountNo: accountNumber.trim(), // Support both fields
        accountNumber: accountNumber.trim(),
        ifscCode: ifscCode.trim(),
      };

      const res = await fetch(`${API_URL}/pandits/${pandit.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          specializations: specArray,
          service_radius_km: parseInt(serviceRadius) || 15,
          address: address.trim(),
          bank_account_details: bankObj,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        await refreshProfile();
        setIsEditing(false);
        Alert.alert("Success", "Profile updated successfully");
      } else {
        Alert.alert(t("common.error"), data.message || "Failed to save profile");
      }
    } catch (error) {
      console.warn("Failed to save profile:", error);
      Alert.alert(t("common.error"), "Network error. Please try again.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      t("common.logout"),
      "Are you sure you want to log out from the application?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: t("common.logout"),
          style: "destructive",
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const bankDetails = pandit?.bank_account_details || {};
  const isHindi = i18n.language === "hi";

  const getPoojaEmoji = (name) => {
    if (name.includes("Griha") || name.includes("गृह")) return "🏠";
    if (name.includes("Satyanarayan") || name.includes("सत्यनारायण")) return "📈";
    if (name.includes("Rudrabhishek") || name.includes("रुद्राभिषेक")) return "🕉️";
    if (name.includes("Mundan") || name.includes("मुंडन")) return "👶";
    if (name.includes("Ganesh") || name.includes("गणेश")) return "🐘";
    if (name.includes("Mrityunjaya") || name.includes("महामृत्युंजय")) return "🕊️";
    return "🙏";
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Availability Card */}
        <View style={styles.availabilityCard}>
          <View style={styles.availabilityTextContainer}>
            <Text style={styles.availabilityTitle}>Available for Bookings</Text>
            <Text style={styles.availabilitySubtitle}>
              {pandit?.is_active
                ? "Visible to customers for nearby puja requests"
                : "Hidden from all search requests"}
            </Text>
          </View>
          <Switch
            value={!!pandit?.is_active}
            onValueChange={handleToggleActive}
            trackColor={{ false: "#d1d5db", true: "#fbcfe8" }}
            thumbColor={pandit?.is_active ? "#ea580c" : "#f3f4f6"}
          />
        </View>

        {/* Profile Details Mode */}
        {!isEditing ? (
          <>
            {/* Header Profile Info Card */}
            <View style={styles.profileHeaderCard}>
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>🕉️</Text>
                {pandit?.is_verified && (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedText}>✓</Text>
                  </View>
                )}
              </View>
              <Text style={styles.panditName}>{pandit?.name || "Pandit Ji"}</Text>
              <Text style={styles.panditPhone}>+91 {pandit?.phone}</Text>

              <View style={styles.ratingRadiusRow}>
                <View style={styles.headerInfoCol}>
                  <Text style={styles.headerInfoVal}>
                    ⭐ {pandit?.rating ? parseFloat(pandit.rating).toFixed(1) : "0.0"}
                  </Text>
                  <Text style={styles.headerInfoLbl}>{t("profile.rating")}</Text>
                </View>
                <View style={styles.verticalDivider} />
                <View style={styles.headerInfoCol}>
                  <Text style={styles.headerInfoVal}>{completedCount}</Text>
                  <Text style={styles.headerInfoLbl}>Completed Pujas</Text>
                </View>
                <View style={styles.verticalDivider} />
                <View style={styles.headerInfoCol}>
                  <Text style={styles.headerInfoVal}>{pandit?.service_radius_km || 15} KM</Text>
                  <Text style={styles.headerInfoLbl}>{t("profile.radius")}</Text>
                </View>
              </View>
            </View>

            {/* Verification Status Banner */}
            <View
              style={[
                styles.banner,
                pandit?.is_verified ? styles.bannerVerified : styles.bannerPending,
              ]}
            >
              <Text
                style={[
                  styles.bannerText,
                  pandit?.is_verified ? styles.bannerTextVerified : styles.bannerTextPending,
                ]}
              >
                {pandit?.is_verified
                  ? `✓ ${t("profile.verified")}`
                  : `⏳ ${t("profile.notVerified")}`}
              </Text>
            </View>

            {/* Language Switcher */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t("common.switchLanguage")}</Text>
              <TouchableOpacity
                style={styles.languageToggleBtn}
                onPress={toggleLanguage}
                activeOpacity={0.8}
              >
                <Text style={styles.languageToggleText}>
                  {language === "en" ? "Change to: हिंदी" : "Change to: English"}
                </Text>
                <Text style={styles.languageFlag}>{language === "en" ? "🇮🇳" : "🇬🇧"}</Text>
              </TouchableOpacity>
            </View>

            {/* Address */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>{t("requests.address")}</Text>
              </View>
              <Text style={styles.infoText}>{pandit?.address || "No address specified."}</Text>
            </View>

            {/* Specialties */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t("profile.specialties")}</Text>
              <View style={styles.specialtiesContainer}>
                {pandit?.specializations && pandit.specializations.length > 0 ? (
                  pandit.specializations.map((spec, idx) => (
                    <View key={idx} style={styles.specialtyChip}>
                      <Text style={styles.specialtyEmoji}>{getPoojaEmoji(spec)}</Text>
                      <Text style={styles.specialtyText}>{spec}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noInfoText}>No specialties selected.</Text>
                )}
              </View>
            </View>

            {/* Bank Account */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t("profile.bankAccount")}</Text>
              <View style={styles.bankDetailItem}>
                <Text style={styles.bankDetailLabel}>{t("setup.holderName")}</Text>
                <Text style={styles.bankDetailVal}>{bankDetails.holderName || "N/A"}</Text>
              </View>
              <View style={styles.bankDetailItem}>
                <Text style={styles.bankDetailLabel}>{t("setup.bankName")}</Text>
                <Text style={styles.bankDetailVal}>{bankDetails.bankName || "N/A"}</Text>
              </View>
              <View style={styles.bankDetailItem}>
                <Text style={styles.bankDetailLabel}>{t("setup.accountNo")}</Text>
                <Text style={styles.bankDetailVal}>
                  {bankDetails.accountNo
                    ? `XXXX XXXX ${bankDetails.accountNo.slice(-4)}`
                    : bankDetails.accountNumber
                    ? `XXXX XXXX ${bankDetails.accountNumber.slice(-4)}`
                    : "N/A"}
                </Text>
              </View>
              <View style={[styles.bankDetailItem, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                <Text style={styles.bankDetailLabel}>{t("setup.ifscCode")}</Text>
                <Text style={styles.bankDetailVal}>{bankDetails.ifscCode || "N/A"}</Text>
              </View>
            </View>

            {/* Edit Button */}
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => setIsEditing(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.editBtnText}>✏️ Edit Profile</Text>
            </TouchableOpacity>
          </>
        ) : (
          /* Editing Profile Mode */
          <View style={styles.card}>
            <Text style={styles.editTitle}>Edit Profile details</Text>

            {/* Name */}
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Full Name"
              placeholderTextColor="#9ca3af"
            />

            {/* Address */}
            <Text style={styles.inputLabel}>Address</Text>
            <TextInput
              style={[styles.input, { height: 70, textAlignVertical: "top" }]}
              value={address}
              onChangeText={setAddress}
              placeholder="Address"
              placeholderTextColor="#9ca3af"
              multiline
            />

            {/* Specializations */}
            <Text style={styles.inputLabel}>Specializations (comma separated)</Text>
            <TextInput
              style={styles.input}
              value={specializations}
              onChangeText={setSpecializations}
              placeholder="e.g. Rudrabhishek Pooja, Griha Pravesh"
              placeholderTextColor="#9ca3af"
            />

            {/* Service Radius */}
            <Text style={styles.inputLabel}>Service Radius (KM)</Text>
            <TextInput
              style={styles.input}
              value={serviceRadius}
              onChangeText={setServiceRadius}
              placeholder="15"
              placeholderTextColor="#9ca3af"
              keyboardType="number-pad"
            />

            {/* Bank details */}
            <Text style={[styles.inputLabel, { marginTop: 14, borderTopWidth: 1, borderTopColor: "#fed7aa", paddingTop: 14 }]}>
              Bank Details
            </Text>

            <Text style={styles.inputLabel}>Holder Name</Text>
            <TextInput
              style={styles.input}
              value={holderName}
              onChangeText={setHolderName}
              placeholder="Bank Holder Name"
              placeholderTextColor="#9ca3af"
            />

            <Text style={styles.inputLabel}>Bank Name</Text>
            <TextInput
              style={styles.input}
              value={bankName}
              onChangeText={setBankName}
              placeholder="Bank Name"
              placeholderTextColor="#9ca3af"
            />

            <Text style={styles.inputLabel}>Account Number</Text>
            <TextInput
              style={styles.input}
              value={accountNumber}
              onChangeText={setAccountNumber}
              placeholder="Account Number"
              placeholderTextColor="#9ca3af"
              keyboardType="number-pad"
            />

            <Text style={styles.inputLabel}>IFSC Code</Text>
            <TextInput
              style={styles.input}
              value={ifscCode}
              onChangeText={setIfscCode}
              placeholder="IFSC Code"
              placeholderTextColor="#9ca3af"
              autoCapitalize="characters"
            />

            {/* Action buttons */}
            <View style={styles.editActionRow}>
              <TouchableOpacity
                style={[styles.btnAction, styles.btnCancel]}
                onPress={() => setIsEditing(false)}
                disabled={saveLoading}
              >
                <Text style={styles.btnCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnAction, styles.btnSave]}
                onPress={handleSaveProfile}
                disabled={saveLoading}
              >
                {saveLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.btnSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutBtnText}>📴 {t("common.logout")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff7ed",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  availabilityCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    borderColor: "#ffedd5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    shadowColor: "#7c2d12",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  availabilityTextContainer: {
    flex: 1,
    paddingRight: 10,
  },
  availabilityTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#7c2d12",
    marginBottom: 4,
  },
  availabilitySubtitle: {
    fontSize: 12,
    color: "#92400e",
    fontWeight: "600",
  },
  profileHeaderCard: {
    backgroundColor: "#ffffff",
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
    shadowColor: "#7c2d12",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: "#ffedd5",
    marginBottom: 20,
  },
  avatarContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#ffedd5",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#fed7aa",
  },
  avatarText: {
    fontSize: 44,
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#10b981",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  verifiedText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
  },
  panditName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#7c2d12",
    textAlign: "center",
  },
  panditPhone: {
    fontSize: 14,
    color: "#78350f",
    opacity: 0.6,
    fontWeight: "600",
    marginTop: 4,
    marginBottom: 20,
  },
  ratingRadiusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    backgroundColor: "#fff7ed",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#ffedd5",
  },
  headerInfoCol: {
    flex: 1,
    alignItems: "center",
  },
  headerInfoVal: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ea580c",
  },
  headerInfoLbl: {
    fontSize: 10,
    fontWeight: "700",
    color: "#78350f",
    opacity: 0.7,
    marginTop: 4,
  },
  verticalDivider: {
    width: 1,
    backgroundColor: "#fed7aa",
    marginVertical: 4,
  },
  banner: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 20,
    alignItems: "center",
  },
  bannerVerified: {
    backgroundColor: "#d1fae5",
  },
  bannerPending: {
    backgroundColor: "#fef3c7",
  },
  bannerText: {
    fontSize: 15,
    fontWeight: "700",
  },
  bannerTextVerified: {
    color: "#065f46",
  },
  bannerTextPending: {
    color: "#b45309",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: "#ffedd5",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#7c2d12",
    marginBottom: 14,
  },
  infoText: {
    fontSize: 14,
    color: "#431407",
    fontWeight: "600",
    lineHeight: 20,
  },
  languageToggleBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff7ed",
    borderWidth: 1.5,
    borderColor: "#fed7aa",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  languageToggleText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ea580c",
  },
  languageFlag: {
    fontSize: 20,
  },
  specialtiesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  specialtyChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fed7aa",
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  specialtyEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  specialtyText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#78350f",
  },
  noInfoText: {
    fontSize: 13,
    color: "#9ca3af",
    fontStyle: "italic",
  },
  bankDetailItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f5ebe0",
  },
  bankDetailLabel: {
    fontSize: 13,
    color: "#78350f",
    opacity: 0.6,
    fontWeight: "600",
  },
  bankDetailVal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#431407",
  },
  editBtn: {
    height: 56,
    backgroundColor: "#ffedd5",
    borderWidth: 1.5,
    borderColor: "#fed7aa",
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  editBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ea580c",
  },
  editTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#7c2d12",
    marginBottom: 16,
    textAlign: "center",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#78350f",
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    height: 48,
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fed7aa",
    borderRadius: 12,
    paddingHorizontal: 16,
    color: "#431407",
    fontWeight: "600",
    fontSize: 14,
  },
  editActionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  btnAction: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  btnCancel: {
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  btnCancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4b5563",
  },
  btnSave: {
    backgroundColor: "#ea580c",
  },
  btnSaveText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
  logoutBtn: {
    height: 56,
    backgroundColor: "#fee2e2",
    borderWidth: 1.5,
    borderColor: "#fecaca",
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  logoutBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#dc2626",
  },
});
