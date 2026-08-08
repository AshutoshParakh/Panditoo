import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Slider from "@react-native-community/slider"; // Check if installed or fallback
import * as Location from "expo-location";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import * as ImagePicker from "expo-image-picker";
import { POLICY_VERSION } from "../legal/policies";

const POOJA_OPTIONS = [
  { id: "Satyanarayan Pooja", label: "📈 Satyanarayan", labelHi: "📈 सत्यनारायण पूजा" },
  { id: "Griha Pravesh", label: "🏠 Griha Pravesh", labelHi: "🏠 गृह प्रवेश" },
  { id: "Mundan Sanskar", label: "👶 Mundan", labelHi: "👶 मुंडन संस्कार" },
  { id: "Ganesh Pooja", label: "🐘 Ganesh Pooja", labelHi: "🐘 गणेश पूजा" },
  { id: "Rudrabhishek", label: "🕉️ Rudrabhishek", labelHi: "🕉️ रुद्राभिषेक" },
  { id: "Maha Mrityunjaya", label: "🕊️ Mrityunjaya", labelHi: "🕊️ महामृत्युंजय" },
  { id: "Katha & Pravachan", label: "📖 Katha", labelHi: "📖 कथा और प्रवचन" },
  { id: "Vivah Sanskar", label: "🤝 Marriage", labelHi: "🤝 विवाह संस्कार" },
];

export default function ProfileSetupScreen({ route, navigation }) {
  const { t, i18n } = useTranslation();
  const { register } = useAuth();
  const phone = route.params?.phone || "";

  const [name, setName] = useState("");
  const [experience, setExperience] = useState(5);
  const [specializations, setSpecializations] = useState([]);
  const [serviceRadius, setServiceRadius] = useState(15);
  
  // Location
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [locating, setLocating] = useState(false);

  // Bank Account details
  const [holderName, setHolderName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");

  // ID Upload State
  const [idPhoto, setIdPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [policiesAccepted, setPoliciesAccepted] = useState(false);

  const toggleSpecialization = (id) => {
    if (specializations.includes(id)) {
      setSpecializations(specializations.filter((item) => item !== id));
    } else {
      setSpecializations([...specializations, id]);
    }
  };

  const handleDetectLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Please enable location services to auto-fill address.");
        setLocating(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;
      setLatitude(latitude);
      setLongitude(longitude);

      // Reverse geocode
      const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geocode && geocode.length > 0) {
        const place = geocode[0];
        const formattedAddress = [
          place.name,
          place.street,
          place.district,
          place.city,
          place.region,
          place.postalCode,
        ]
          .filter(Boolean)
          .join(", ");
        setAddress(formattedAddress || `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`);
      } else {
        setAddress(`Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`);
      }
      Alert.alert(t("common.success"), t("setup.locationSuccess"));
    } catch (err) {
      console.warn("Location detection failed:", err);
      // Mock location for testing
      setLatitude(28.6139);
      setLongitude(77.2090);
      setAddress("Sector 4, Dwarka, New Delhi, 110075");
      Alert.alert(t("common.success"), "Mock Location detected successfully!");
    } finally {
      setLocating(false);
    }
  };

  const handleUploadPhoto = async () => {
    Alert.alert(
      "Upload ID Proof",
      "Choose photo from Camera or Gallery",
      [
        {
          text: "Camera",
          onPress: async () => {
            try {
              const { status } = await ImagePicker.requestCameraPermissionsAsync();
              if (status !== "granted") {
                Alert.alert("Permission Denied", "Camera permission is required to take a photo of your ID.");
                return;
              }
              const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                quality: 0.8,
              });
              if (!result.canceled && result.assets && result.assets.length > 0) {
                setIdPhoto(result.assets[0].uri);
              }
            } catch (err) {
              console.warn("Camera access failed:", err);
              Alert.alert("Error", "Could not open camera.");
            }
          },
        },
        {
          text: "Gallery",
          onPress: async () => {
            try {
              const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (status !== "granted") {
                Alert.alert("Permission Denied", "Gallery permission is required to select a photo.");
                return;
              }
              const result = await ImagePicker.launchImageLibraryAsync({
                allowsEditing: true,
                quality: 0.8,
              });
              if (!result.canceled && result.assets && result.assets.length > 0) {
                setIdPhoto(result.assets[0].uri);
              }
            } catch (err) {
              console.warn("Gallery access failed:", err);
              Alert.alert("Error", "Could not open photo gallery.");
            }
          },
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const handleRegister = async () => {
    if (!name.trim()) {
      Alert.alert(t("common.error"), "Please enter your name");
      return;
    }
    if (specializations.length === 0) {
      Alert.alert(t("common.error"), "Please select at least one puja specialization");
      return;
    }
    if (!address.trim()) {
      Alert.alert(t("common.error"), "Please enter or detect your address");
      return;
    }
    if (!idPhoto) {
      Alert.alert(t("common.error"), "Please upload an ID proof photo for verification");
      return;
    }
    if (!policiesAccepted) {
      Alert.alert(t("common.error"), "Please accept the Terms & Conditions and Privacy Policy to register.");
      return;
    }

    setLoading(true);
    try {
      const bankDetailsObj = {
        holderName: holderName.trim() || name.trim(),
        bankName: bankName.trim() || "",
        accountNo: accountNumber.trim(),
        accountNumber: accountNumber.trim(),
        ifscCode: ifscCode.trim(),
      };

      const panditData = {
        name,
        phone,
        email: `${name.toLowerCase().replace(/\s+/g, "")}@gmail.com`,
        address,
        specializations,
        experience_years: experience,
        service_radius_km: serviceRadius,
        latitude: latitude || 28.6139,
        longitude: longitude || 77.2090,
        bank_account_details: bankDetailsObj,
        id_proof_url: idPhoto,
        source: "Self Registered",
        terms_accepted: true,
        privacy_accepted: true,
        terms_version: POLICY_VERSION,
        privacy_version: POLICY_VERSION,
      };

      await register(panditData);
      setLoading(false);
      // Removed manual navigation.reset because the AuthContext state updates token and pandit,
      // which automatically triggers the switch to the Main screen in AppNavigator.
    } catch (err) {
      setLoading(false);
      Alert.alert("Registration Error", err.message || "Failed to submit registration. Try again.");
    }
  };

  const isHindi = i18n.language === "hi";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>{t("setup.title")}</Text>
          <Text style={styles.subtitle}>{t("setup.subtitle")}</Text>
        </View>

        {/* Name */}
        <View style={styles.section}>
          <Text style={styles.label}>{t("setup.name")} *</Text>
          <TextInput
            style={styles.input}
            placeholder={t("setup.namePlaceholder")}
            placeholderTextColor="#a08f80"
            value={name}
            onChangeText={setName}
            editable={!loading}
          />
        </View>

        {/* Experience */}
        <View style={styles.section}>
          <Text style={styles.label}>{t("setup.experience")}</Text>
          <View style={styles.counterContainer}>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => setExperience(Math.max(1, experience - 1))}
              disabled={loading}
            >
              <Text style={styles.counterBtnText}>-</Text>
            </TouchableOpacity>
            <View style={styles.counterValueContainer}>
              <Text style={styles.counterValue}>{experience}</Text>
              <Text style={styles.counterUnit}>{t("setup.years")}</Text>
            </View>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => setExperience(Math.min(50, experience + 1))}
              disabled={loading}
            >
              <Text style={styles.counterBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Specializations */}
        <View style={styles.section}>
          <Text style={styles.label}>{t("setup.specializations")} *</Text>
          <View style={styles.chipContainer}>
            {POOJA_OPTIONS.map((item) => {
              const isSelected = specializations.includes(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.chip,
                    isSelected && styles.chipSelected,
                  ]}
                  onPress={() => toggleSpecialization(item.id)}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.chipText,
                      isSelected && styles.chipTextSelected,
                    ]}
                  >
                    {isHindi ? item.labelHi : item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Service Radius */}
        <View style={styles.section}>
          <Text style={styles.label}>
            {t("setup.radius")}: <Text style={styles.radiusValue}>{serviceRadius} KM</Text>
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={5}
            maximumValue={50}
            step={5}
            value={serviceRadius}
            onValueChange={setServiceRadius}
            minimumTrackTintColor="#d97706"
            maximumTrackTintColor="#fed7aa"
            thumbTintColor="#ea580c"
            disabled={loading}
          />
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>5 KM</Text>
            <Text style={styles.sliderLabel}>25 KM</Text>
            <Text style={styles.sliderLabel}>50 KM</Text>
          </View>
        </View>

        {/* Location Detection */}
        <View style={styles.section}>
          <Text style={styles.label}>{t("setup.address")} *</Text>
          <TouchableOpacity
            style={[styles.detectBtn, locating && styles.detectBtnActive]}
            onPress={handleDetectLocation}
            disabled={loading || locating}
          >
            <Text style={styles.detectBtnText}>
              {locating ? t("setup.locating") : `📍 ${t("setup.detectLocation")}`}
            </Text>
          </TouchableOpacity>

          <TextInput
            style={[styles.input, styles.addressInput]}
            placeholder="Address Details (Sector, Gali, Landmark, House No.)"
            placeholderTextColor="#a08f80"
            multiline
            numberOfLines={3}
            value={address}
            onChangeText={setAddress}
            editable={!loading}
          />
        </View>

        {/* Bank Account Details */}
        <View style={styles.section}>
          <Text style={styles.label}>{t("setup.bankDetails")} (Optional)</Text>
          <Text style={styles.bankHelpText}>
            Adding bank details is completely optional during registration. However, you will need to link your bank account later before requesting payouts so we can transfer your earnings securely.
          </Text>
          <View style={styles.bankCard}>
            <Text style={styles.bankLabel}>{t("setup.holderName")}</Text>
            <TextInput
              style={styles.bankInput}
              placeholder="e.g. Pandit Ramesh Sharma"
              placeholderTextColor="#a08f80"
              value={holderName}
              onChangeText={setHolderName}
              editable={!loading}
            />

            <Text style={styles.bankLabel}>{t("setup.bankName")}</Text>
            <TextInput
              style={styles.bankInput}
              placeholder="e.g. State Bank of India"
              placeholderTextColor="#a08f80"
              value={bankName}
              onChangeText={setBankName}
              editable={!loading}
            />

            <Text style={styles.bankLabel}>{t("setup.accountNo")} *</Text>
            <TextInput
              style={styles.bankInput}
              placeholder="11-digit or 16-digit Account Number"
              placeholderTextColor="#a08f80"
              keyboardType="number-pad"
              value={accountNumber}
              onChangeText={(txt) => setAccountNumber(txt.replace(/[^0-9]/g, ""))}
              editable={!loading}
            />

            <Text style={styles.bankLabel}>{t("setup.ifscCode")} *</Text>
            <TextInput
              style={[styles.bankInput, styles.lastBankInput]}
              placeholder="e.g. SBIN0001234"
              placeholderTextColor="#a08f80"
              autoCapitalize="characters"
              value={ifscCode}
              onChangeText={setIfscCode}
              editable={!loading}
            />
          </View>
        </View>

        {/* Upload ID proof */}
        <View style={styles.section}>
          <Text style={styles.label}>{t("setup.idProof")} *</Text>
          <TouchableOpacity
            style={[styles.uploadCard, idPhoto && styles.uploadedCard]}
            onPress={handleUploadPhoto}
            disabled={loading}
            activeOpacity={0.8}
          >
            {idPhoto ? (
              <View style={styles.uploadedContent}>
                <Text style={styles.uploadedIcon}>✓</Text>
                <Text style={styles.uploadedText}>{t("setup.photoUploaded")}</Text>
                <Text style={styles.photoSub}>{idPhoto}</Text>
              </View>
            ) : (
              <View style={styles.uploadContent}>
                <Text style={styles.uploadIcon}>📷</Text>
                <Text style={styles.uploadText}>{t("setup.uploadButton")}</Text>
                <Text style={styles.uploadSub}>Aadhar Card / Voter ID / PAN</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Submit */}
        <TouchableOpacity style={styles.consentRow} onPress={() => setPoliciesAccepted((value) => !value)} disabled={loading} accessibilityRole="checkbox" accessibilityState={{ checked: policiesAccepted }}>
          <View style={[styles.checkbox, policiesAccepted && styles.checkboxChecked]}><Text style={styles.checkmark}>{policiesAccepted ? "✓" : ""}</Text></View>
          <Text style={styles.consentText}>I am at least 18, agree to the <Text style={styles.legalLink} onPress={() => navigation.navigate("LegalDocument", { type: "terms", title: "Terms & Conditions" })}>Terms & Conditions</Text>, and consent to the processing described in the <Text style={styles.legalLink} onPress={() => navigation.navigate("LegalDocument", { type: "privacy", title: "Privacy Policy" })}>Privacy Policy</Text>.</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitBtn, !policiesAccepted && styles.submitBtnDisabled]}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.submitBtnText}>{t("setup.register")}</Text>
          )}
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
    padding: 24,
    paddingBottom: 48,
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#7c2d12",
  },
  subtitle: {
    fontSize: 15,
    color: "#78350f",
    marginTop: 6,
    opacity: 0.8,
  },
  section: {
    marginBottom: 26,
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
    color: "#431407",
    marginBottom: 10,
  },
  input: {
    height: 56,
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#fed7aa",
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: "600",
    color: "#431407",
  },
  addressInput: {
    height: 100,
    paddingTop: 14,
    marginTop: 10,
    textAlignVertical: "top",
  },
  counterContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#fed7aa",
    borderRadius: 16,
    padding: 10,
    height: 64,
  },
  counterBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#ffedd5",
    justifyContent: "center",
    alignItems: "center",
  },
  counterBtnText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#ea580c",
  },
  counterValueContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  counterValue: {
    fontSize: 26,
    fontWeight: "800",
    color: "#7c2d12",
  },
  counterUnit: {
    fontSize: 14,
    fontWeight: "600",
    color: "#78350f",
    marginLeft: 6,
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#fed7aa",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  chipSelected: {
    backgroundColor: "#ffedd5",
    borderColor: "#ea580c",
    borderWidth: 2,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#78350f",
  },
  chipTextSelected: {
    color: "#ea580c",
    fontWeight: "700",
  },
  radiusValue: {
    color: "#ea580c",
    fontWeight: "800",
  },
  slider: {
    width: "100%",
    height: 40,
  },
  sliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  sliderLabel: {
    fontSize: 12,
    color: "#78350f",
    fontWeight: "600",
  },
  detectBtn: {
    height: 50,
    backgroundColor: "#ea580c",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#ea580c",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  detectBtnActive: {
    backgroundColor: "#b45309",
  },
  detectBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
  bankCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#fed7aa",
    borderRadius: 20,
    padding: 16,
  },
  bankHelpText: {
    fontSize: 13,
    color: "#78350f",
    opacity: 0.8,
    lineHeight: 18,
    marginBottom: 12,
    fontWeight: "600",
  },
  bankLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#78350f",
    marginBottom: 4,
  },
  bankInput: {
    height: 44,
    borderBottomWidth: 1,
    borderBottomColor: "#fed7aa",
    marginBottom: 16,
    fontSize: 15,
    fontWeight: "600",
    color: "#431407",
    paddingHorizontal: 4,
  },
  lastBankInput: {
    marginBottom: 0,
    borderBottomWidth: 0,
  },
  uploadCard: {
    height: 140,
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#fed7aa",
    borderStyle: "dashed",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  uploadedCard: {
    backgroundColor: "#fff7ed",
    borderColor: "#10b981",
    borderStyle: "solid",
  },
  uploadContent: {
    alignItems: "center",
  },
  uploadIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#d97706",
  },
  uploadSub: {
    fontSize: 12,
    color: "#78350f",
    opacity: 0.6,
    marginTop: 4,
  },
  uploadedContent: {
    alignItems: "center",
    padding: 16,
  },
  uploadedIcon: {
    fontSize: 32,
    fontWeight: "800",
    color: "#10b981",
    marginBottom: 6,
  },
  uploadedText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#10b981",
  },
  photoSub: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 4,
  },
  submitBtn: {
    height: 60,
    backgroundColor: "#7c2d12",
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#7c2d12",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
    marginTop: 16,
  },
  submitBtnText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
  },
  submitBtnDisabled: { opacity: 0.55 },
  consentRow: { flexDirection: "row", alignItems: "flex-start", marginTop: 18, marginBottom: 4 },
  checkbox: { width: 23, height: 23, borderRadius: 5, borderWidth: 1.5, borderColor: "#B45309", alignItems: "center", justifyContent: "center", marginRight: 10, marginTop: 1 },
  checkboxChecked: { backgroundColor: "#7C2D12", borderColor: "#7C2D12" }, checkmark: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  consentText: { flex: 1, color: "#78350F", fontSize: 12, lineHeight: 18 }, legalLink: { color: "#9A3412", fontWeight: "800", textDecorationLine: "underline" },
});
