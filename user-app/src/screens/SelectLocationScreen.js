import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { useTranslation } from "react-i18next";

export default function SelectLocationScreen({ route, navigation }) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || "en";
  const { pooja, bookingDate, bookingTime } = route.params || {};

  const [region, setRegion] = useState(null);
  const [markerCoords, setMarkerCoords] = useState(null);
  const [address, setAddress] = useState("");
  const [useGps, setUseGps] = useState(false);

  const handleMapPress = (e) => {
    const coords = e.nativeEvent.coordinate;
    setMarkerCoords(coords);
    setUseGps(false);
  };

  const handleUseGps = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        alert(
          currentLang === "hi"
            ? "स्थान अनुमति अस्वीकार कर दी गई।"
            : "Permission to access location was denied."
        );
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };

      setMarkerCoords(coords);
      setRegion({
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      });

      const [addressResult] = await Location.reverseGeocodeAsync(coords);
      if (addressResult) {
        const namePart = addressResult.name || "";
        const street = addressResult.street || "";
        const district = addressResult.district || addressResult.subregion || "";
        const city = addressResult.city || "";
        const regionName = addressResult.region || "";
        const postalCode = addressResult.postalCode || "";

        const formattedAddress = [
          namePart !== street ? namePart : "",
          street,
          district,
          city,
          regionName,
          postalCode,
        ]
          .filter(Boolean)
          .join(", ");

        setAddress(formattedAddress || (currentLang === "hi" ? "मानचित्र स्थान" : "Map Selected Location"));
      } else {
        setAddress(currentLang === "hi" ? "मानचित्र स्थान" : "Map Selected Location");
      }
      setUseGps(true);
    } catch (err) {
      console.warn("GPS fetching failed:", err.message);
      alert(
        currentLang === "hi"
          ? "स्थान प्राप्त करने में असमर्थ।"
          : "Unable to retrieve your location. Please type manually."
      );
    }
  };

  const handleContinue = () => {
    if (!markerCoords) return;
    const finalAddress = address.trim() || (currentLang === "hi" ? "मानचित्र स्थान" : "Map Selected Location");
    navigation.navigate("ChoosePandits", {
      pooja,
      bookingDate,
      bookingTime,
      latitude: markerCoords.latitude,
      longitude: markerCoords.longitude,
      address: finalAddress,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>{t("location.title")}</Text>

          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              region={region || undefined}
              onPress={handleMapPress}
            >
              {markerCoords && <Marker
                coordinate={markerCoords}
                title={currentLang === "hi" ? "पूजा स्थल" : "Pooja Location"}
                description={currentLang === "hi" ? "पंडित यहाँ पहुँचेंगे" : "Pandit will arrive here"}
                pinColor="#d97706"
              />}
            </MapView>
          </View>

          <TouchableOpacity style={styles.gpsBtn} onPress={handleUseGps} activeOpacity={0.8}>
            <Text style={styles.gpsBtnText}>
              📍 {useGps ? "✓ " : ""}{t("location.useCurrent")}
            </Text>
          </TouchableOpacity>

          <View style={styles.inputSection}>
            <Text style={styles.label}>{t("location.manualAddress")}</Text>
            <TextInput
              style={styles.input}
              placeholder={t("location.addressPlaceholder")}
              placeholderTextColor="#a08f80"
              multiline
              numberOfLines={3}
              value={address}
              onChangeText={setAddress}
            />
          </View>

          <TouchableOpacity
            style={[styles.continueBtn, (!address.trim() || !markerCoords) && styles.disabledBtn]}
            onPress={handleContinue}
            disabled={!address.trim() || !markerCoords}
            activeOpacity={0.8}
          >
            <Text style={styles.continueBtnText}>{t("location.continue")}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7efe5",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#6a1b1a",
    marginBottom: 4,
  },
  mapContainer: {
    height: 250,
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e3d5c5",
    overflow: "hidden",
    shadowColor: "#6a1b1a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  gpsBtn: {
    height: 52,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d97706",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#d97706",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  gpsBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#d97706",
  },
  inputSection: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#5f4b3a",
  },
  input: {
    minHeight: 80,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e3d5c5",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#3a2d21",
    textAlignVertical: "top",
  },
  continueBtn: {
    height: 54,
    backgroundColor: "#d97706",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#d97706",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
    marginTop: 10,
  },
  disabledBtn: {
    backgroundColor: "#e0d3c5",
    shadowOpacity: 0,
    elevation: 0,
  },
  continueBtnText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
});
