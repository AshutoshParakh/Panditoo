import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView from "react-native-maps";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import { colors, shadow } from "../theme/homeTheme";

const SAVED_ADDRESSES_KEY = "user-saved-addresses-v1";
const DEFAULT_REGION = { latitude: 28.6139, longitude: 77.209, latitudeDelta: 0.04, longitudeDelta: 0.04 };
const TABS = ["current", "search", "saved"];

const formatAddress = (place) => [place.name !== place.street ? place.name : null, place.street, place.district || place.subregion, place.city, place.region, place.postalCode].filter(Boolean).join(", ");

export default function SelectLocationScreen({ route, navigation }) {
  const { i18n } = useTranslation();
  const hindi = i18n.language === "hi";
  const { pooja, bookingDate, bookingTime } = route.params || {};
  const mapRef = useRef(null);
  const mapTouched = useRef(false);
  const pinLift = useRef(new Animated.Value(0)).current;
  const [activeTab, setActiveTab] = useState("current");
  const [coordinates, setCoordinates] = useState(null);
  const [address, setAddress] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [locating, setLocating] = useState(false);
  const [searching, setSearching] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [mapMoving, setMapMoving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { AsyncStorage.getItem(SAVED_ADDRESSES_KEY).then((value) => { if (value) setSavedAddresses(JSON.parse(value)); }).catch(() => {}); }, []);

  const moveMap = (coords, delta = 0.008) => {
    mapTouched.current = false;
    mapRef.current?.animateToRegion({ ...coords, latitudeDelta: delta, longitudeDelta: delta }, 550);
  };

  const resolveAddress = async (coords, fallback = "") => {
    setResolving(true); setError("");
    try {
      const [place] = await Location.reverseGeocodeAsync(coords);
      const formatted = place ? formatAddress(place) : "";
      setAddress(formatted || fallback || (hindi ? "मानचित्र पर चुना गया स्थान" : "Location selected on map"));
    } catch (_) {
      setAddress(fallback || (hindi ? "मानचित्र पर चुना गया स्थान" : "Location selected on map"));
    } finally { setResolving(false); }
  };

  const selectCoordinates = async (coords, fallback = "", shouldMove = true) => {
    const clean = { latitude: coords.latitude, longitude: coords.longitude };
    setCoordinates(clean);
    if (shouldMove) moveMap(clean);
    await resolveAddress(clean, fallback);
  };

  const useCurrentLocation = async () => {
    setLocating(true); setError("");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") throw new Error(hindi ? "लोकेशन की अनुमति आवश्यक है।" : "Location permission is required.");
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      await selectCoordinates(position.coords);
    } catch (requestError) { setError(requestError.message || (hindi ? "वर्तमान स्थान नहीं मिल सका।" : "Unable to find your current location.")); }
    finally { setLocating(false); }
  };

  const searchLocation = async () => {
    const query = searchQuery.trim();
    if (query.length < 3) { setError(hindi ? "कम से कम 3 अक्षर लिखें।" : "Enter at least 3 characters to search."); return; }
    setSearching(true); setError(""); setSearchResults([]);
    try {
      if (Platform.OS === "android") {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== "granted") throw new Error(hindi ? "स्थान खोजने के लिए लोकेशन अनुमति आवश्यक है।" : "Location permission is required to search on Android.");
      }
      const results = await Location.geocodeAsync(query);
      if (!results.length) throw new Error(hindi ? "कोई स्थान नहीं मिला।" : "No matching location found.");
      const enriched = await Promise.all(results.slice(0, 5).map(async (item, index) => {
        try {
          const [place] = await Location.reverseGeocodeAsync(item);
          return { ...item, id: `${item.latitude}-${item.longitude}`, title: formatAddress(place) || (index ? `${query} · ${index + 1}` : query) };
        } catch (_) {
          return { ...item, id: `${item.latitude}-${item.longitude}`, title: index ? `${query} · ${index + 1}` : query };
        }
      }));
      setSearchResults(enriched);
    } catch (requestError) { setError(requestError.message || (hindi ? "स्थान खोज नहीं सके।" : "Could not search for this location.")); }
    finally { setSearching(false); }
  };

  const chooseSearchResult = async (item) => { setSearchResults([]); await selectCoordinates(item, item.title); };
  const chooseSaved = async (item) => { setAddress(item.address); setCoordinates({ latitude: item.latitude, longitude: item.longitude }); moveMap(item); };

  const handleMapPress = async (event) => { mapTouched.current = false; await selectCoordinates(event.nativeEvent.coordinate, "", false); moveMap(event.nativeEvent.coordinate); };
  const handlePanDrag = () => {
    mapTouched.current = true;
    if (!mapMoving) { setMapMoving(true); Animated.spring(pinLift, { toValue: -8, useNativeDriver: true, speed: 20 }).start(); }
  };
  const handleRegionComplete = async (region) => {
    if (!mapTouched.current) return;
    mapTouched.current = false; setMapMoving(false);
    Animated.spring(pinLift, { toValue: 0, useNativeDriver: true, speed: 18 }).start();
    const coords = { latitude: region.latitude, longitude: region.longitude };
    setCoordinates(coords); await resolveAddress(coords);
  };

  const persistAddress = async () => {
    if (!coordinates || !address.trim()) return;
    const duplicate = savedAddresses.findIndex((item) => Math.abs(item.latitude - coordinates.latitude) < 0.00015 && Math.abs(item.longitude - coordinates.longitude) < 0.00015);
    const entry = { id: duplicate >= 0 ? savedAddresses[duplicate].id : `${Date.now()}`, label: duplicate >= 0 ? savedAddresses[duplicate].label : savedAddresses.length ? `${hindi ? "सहेजा स्थान" : "Saved place"} ${savedAddresses.length + 1}` : (hindi ? "घर" : "Home"), address: address.trim(), ...coordinates };
    const next = duplicate >= 0 ? savedAddresses.map((item, index) => index === duplicate ? entry : item) : [entry, ...savedAddresses].slice(0, 10);
    setSavedAddresses(next);
    await AsyncStorage.setItem(SAVED_ADDRESSES_KEY, JSON.stringify(next));
  };

  const deleteSaved = async (id) => {
    const next = savedAddresses.filter((item) => item.id !== id);
    setSavedAddresses(next); await AsyncStorage.setItem(SAVED_ADDRESSES_KEY, JSON.stringify(next));
  };

  const handleContinue = async () => {
    if (!coordinates || !address.trim()) return;
    await persistAddress();
    navigation.navigate("ChoosePandits", { pooja, bookingDate, bookingTime, latitude: coordinates.latitude, longitude: coordinates.longitude, address: address.trim() });
  };

  const tabLabel = (tab) => ({ current: hindi ? "वर्तमान" : "Current", search: hindi ? "खोजें" : "Search", saved: hindi ? "सहेजे" : "Saved" }[tab]);

  return (
    <SafeAreaView style={s.screen}>
      <KeyboardAvoidingView style={s.keyboard} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
          <View style={s.intro}><Text style={s.eyebrow}>{hindi ? "पूजा स्थल" : "CEREMONY LOCATION"}</Text><Text style={s.title}>{hindi ? "सटीक स्थान चुनें" : "Choose the exact location"}</Text><Text style={s.subtitle}>{hindi ? "पंडित जी इसी पिन किए गए स्थान पर पहुंचेंगे।" : "Your pandit will arrive at the precise point you select."}</Text></View>

          <View style={s.tabs}>{TABS.map((tab) => <TouchableOpacity key={tab} style={[s.tab, activeTab === tab && s.activeTab]} onPress={() => { setActiveTab(tab); setError(""); }}><Text style={[s.tabText, activeTab === tab && s.activeTabText]}>{tabLabel(tab)}</Text>{tab === "saved" && savedAddresses.length ? <View style={s.tabCount}><Text style={s.tabCountText}>{savedAddresses.length}</Text></View> : null}</TouchableOpacity>)}</View>

          {activeTab === "current" ? <TouchableOpacity style={s.currentButton} onPress={useCurrentLocation} disabled={locating}><View style={s.actionIcon}><Text style={s.actionIconText}>⌖</Text></View><View style={s.actionCopy}><Text style={s.actionTitle}>{hindi ? "मेरे वर्तमान स्थान का उपयोग करें" : "Use my current location"}</Text><Text style={s.actionSubtitle}>{hindi ? "GPS से सटीक स्थान प्राप्त करें" : "Get an accurate position using GPS"}</Text></View>{locating ? <ActivityIndicator color={colors.primary} /> : <Text style={s.actionArrow}>›</Text>}</TouchableOpacity> : null}

          {activeTab === "search" ? <View><View style={s.searchBox}><Text style={s.searchIcon}>⌕</Text><TextInput style={s.searchInput} value={searchQuery} onChangeText={setSearchQuery} onSubmitEditing={searchLocation} placeholder={hindi ? "इलाका, सड़क या पिन कोड खोजें" : "Search area, street or postal code"} placeholderTextColor="#9E938A" returnKeyType="search" /><TouchableOpacity style={s.searchButton} onPress={searchLocation}>{searching ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={s.searchButtonText}>{hindi ? "खोजें" : "Search"}</Text>}</TouchableOpacity></View>{searchResults.length ? <View style={s.results}>{searchResults.map((item, index) => <TouchableOpacity key={item.id} style={[s.result, index === searchResults.length - 1 && s.lastResult]} onPress={() => chooseSearchResult(item)}><View style={s.resultNumber}><Text style={s.resultNumberText}>{String(index + 1).padStart(2, "0")}</Text></View><Text numberOfLines={2} style={s.resultText}>{item.title}</Text><Text style={s.resultArrow}>›</Text></TouchableOpacity>)}</View> : null}</View> : null}

          {activeTab === "saved" ? <View style={s.savedList}>{savedAddresses.length ? savedAddresses.map((item, index) => <TouchableOpacity key={item.id} style={[s.savedCard, coordinates?.latitude === item.latitude && coordinates?.longitude === item.longitude && s.savedSelected]} onPress={() => chooseSaved(item)}><View style={s.savedIcon}><Text style={s.savedIconText}>{index ? "S" : "H"}</Text></View><View style={s.savedCopy}><Text style={s.savedLabel}>{item.label}</Text><Text numberOfLines={2} style={s.savedAddress}>{item.address}</Text></View><TouchableOpacity hitSlop={10} onPress={() => deleteSaved(item.id)}><Text style={s.delete}>×</Text></TouchableOpacity></TouchableOpacity>) : <View style={s.emptySaved}><Text style={s.emptyTitle}>{hindi ? "कोई सहेजा पता नहीं" : "No saved addresses yet"}</Text><Text style={s.emptyText}>{hindi ? "स्थान चुनकर आगे बढ़ें—वह यहां अपने आप सहेज जाएगा।" : "Select a location and continue; it will automatically appear here."}</Text></View>}</View> : null}

          {error ? <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View> : null}

          <View style={s.mapCard}>
            <MapView ref={mapRef} style={s.map} initialRegion={DEFAULT_REGION} showsUserLocation showsMyLocationButton={false} onPress={handleMapPress} onPanDrag={handlePanDrag} onRegionChangeComplete={handleRegionComplete}>
            </MapView>
            <View pointerEvents="none" style={s.pinLayer}><Animated.View style={[s.pin, { transform: [{ translateY: pinLift }] }]}><View style={s.pinHead}><View style={s.pinCore} /></View><View style={s.pinTail} /></Animated.View><View style={[s.pinShadow, mapMoving && s.pinShadowMoving]} /></View>
            <View style={s.mapHint}><Text style={s.mapHintText}>{hindi ? "सटीक स्थान के लिए नक्शा खिसकाएं" : "Move the map to adjust the exact point"}</Text></View>
            <View style={s.mapBadge}><Text style={[s.mapBadgeText, coordinates && s.mapBadgeTextActive]}>{coordinates ? (hindi ? "स्थान चुना गया" : "LOCATION SELECTED") : (hindi ? "पिन रखें" : "PLACE THE PIN")}</Text></View>
          </View>

          <View style={s.addressCard}>
            <View style={s.addressHeader}><View><Text style={s.addressLabel}>{hindi ? "चुना गया पता" : "SELECTED ADDRESS"}</Text><Text style={s.addressHint}>{hindi ? "जरूरत हो तो घर/फ्लैट नंबर जोड़ें" : "Add house or flat details if needed"}</Text></View>{resolving ? <ActivityIndicator size="small" color={colors.primary} /> : coordinates ? <View style={s.confirmed}><Text style={s.confirmedText}>✓</Text></View> : null}</View>
            <TextInput style={s.addressInput} multiline value={address} onChangeText={setAddress} placeholder={hindi ? "पहले नक्शे पर स्थान चुनें" : "Select a point on the map first"} placeholderTextColor="#A69B92" />
            {coordinates ? <Text style={s.coordinates}>{coordinates.latitude.toFixed(5)}, {coordinates.longitude.toFixed(5)}</Text> : null}
          </View>
          <View style={s.spacer} />
        </ScrollView>

        <View style={s.footer}><View style={s.footerCopy}><Text style={s.footerLabel}>{hindi ? "पूजा स्थल" : "CEREMONY LOCATION"}</Text><Text numberOfLines={1} style={s.footerAddress}>{address || (hindi ? "स्थान चुनें" : "Select a location")}</Text></View><TouchableOpacity disabled={!coordinates || !address.trim()} style={[s.continueButton, (!coordinates || !address.trim()) && s.disabled]} onPress={handleContinue}><Text style={s.continueText}>{hindi ? "पंडित चुनें" : "Choose pandits"}</Text><Text style={s.continueArrow}>›</Text></TouchableOpacity></View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8F5F0" }, keyboard: { flex: 1 }, content: { paddingHorizontal: 18 }, intro: { paddingTop: 8, paddingBottom: 17 }, eyebrow: { color: colors.primary, fontSize: 9, fontWeight: "800", letterSpacing: 1.4 }, title: { color: colors.ink, fontSize: 27, lineHeight: 34, fontWeight: "800", marginTop: 7 }, subtitle: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 5 },
  tabs: { height: 43, backgroundColor: "#ECE6E0", borderRadius: 12, padding: 4, flexDirection: "row", marginBottom: 12 }, tab: { flex: 1, borderRadius: 9, flexDirection: "row", alignItems: "center", justifyContent: "center" }, activeTab: { backgroundColor: "#FFFFFF", ...shadow }, tabText: { color: "#8C8077", fontSize: 9, fontWeight: "800" }, activeTabText: { color: colors.ink }, tabCount: { minWidth: 15, height: 15, borderRadius: 8, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginLeft: 5 }, tabCountText: { color: "#FFFFFF", fontSize: 7, fontWeight: "800" },
  currentButton: { minHeight: 65, backgroundColor: "#FFFFFF", borderRadius: 14, borderWidth: 1, borderColor: "#E5DAD1", paddingHorizontal: 12, flexDirection: "row", alignItems: "center", marginBottom: 12 }, actionIcon: { width: 39, height: 39, borderRadius: 12, backgroundColor: "#F0E4E1", alignItems: "center", justifyContent: "center" }, actionIconText: { color: colors.primary, fontSize: 20 }, actionCopy: { flex: 1, marginLeft: 11 }, actionTitle: { color: colors.ink, fontSize: 11, fontWeight: "800" }, actionSubtitle: { color: colors.muted, fontSize: 8, marginTop: 3 }, actionArrow: { color: "#9C8F85", fontSize: 22 },
  searchBox: { height: 50, borderRadius: 13, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E4D9D0", flexDirection: "row", alignItems: "center", paddingLeft: 12, marginBottom: 9 }, searchIcon: { color: colors.primary, fontSize: 20 }, searchInput: { flex: 1, height: 49, color: colors.ink, fontSize: 10, marginLeft: 8 }, searchButton: { minWidth: 68, height: 38, borderRadius: 10, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginRight: 5 }, searchButtonText: { color: "#FFFFFF", fontSize: 9, fontWeight: "800" }, results: { backgroundColor: "#FFFFFF", borderRadius: 13, borderWidth: 1, borderColor: "#E6DCD3", marginBottom: 10, overflow: "hidden" }, result: { minHeight: 48, flexDirection: "row", alignItems: "center", marginHorizontal: 11, borderBottomWidth: 1, borderBottomColor: "#F0E9E3" }, lastResult: { borderBottomWidth: 0 }, resultNumber: { width: 24, height: 24, borderRadius: 7, backgroundColor: "#F1ECE7", alignItems: "center", justifyContent: "center" }, resultNumberText: { color: "#958980", fontSize: 7, fontWeight: "800" }, resultText: { flex: 1, color: "#514842", fontSize: 9, lineHeight: 14, marginLeft: 9 }, resultArrow: { color: "#9E9188", fontSize: 19 },
  savedList: { marginBottom: 10 }, savedCard: { minHeight: 65, borderRadius: 13, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5DAD1", padding: 11, flexDirection: "row", alignItems: "center", marginBottom: 8 }, savedSelected: { borderColor: "#B97C76", backgroundColor: "#FFF9F7" }, savedIcon: { width: 35, height: 35, borderRadius: 11, backgroundColor: "#F0E5DF", alignItems: "center", justifyContent: "center" }, savedIconText: { color: colors.primary, fontSize: 10, fontWeight: "800" }, savedCopy: { flex: 1, marginLeft: 10 }, savedLabel: { color: colors.ink, fontSize: 10, fontWeight: "800" }, savedAddress: { color: colors.muted, fontSize: 8, lineHeight: 12, marginTop: 3 }, delete: { color: "#A5978E", fontSize: 20, paddingLeft: 10 }, emptySaved: { alignItems: "center", padding: 19, borderRadius: 13, backgroundColor: "#F0ECE8" }, emptyTitle: { color: "#61574F", fontSize: 10, fontWeight: "800" }, emptyText: { color: colors.muted, fontSize: 8, lineHeight: 13, textAlign: "center", marginTop: 4 }, errorBox: { backgroundColor: "#FBECEB", borderRadius: 10, padding: 10, marginBottom: 10 }, errorText: { color: "#A34C49", fontSize: 9 },
  mapCard: { height: 295, borderRadius: 18, borderWidth: 1, borderColor: "#DDD2C8", overflow: "hidden", backgroundColor: "#EAE5DF", ...shadow }, map: { ...StyleSheet.absoluteFillObject }, pinLayer: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" }, pin: { alignItems: "center", marginTop: -28, zIndex: 2 }, pinHead: { width: 35, height: 35, borderRadius: 18, backgroundColor: colors.primary, borderWidth: 4, borderColor: "#FFFFFF", alignItems: "center", justifyContent: "center", ...shadow }, pinCore: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#FFFFFF" }, pinTail: { width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 12, borderLeftColor: "transparent", borderRightColor: "transparent", borderTopColor: colors.primary, marginTop: -4 }, pinShadow: { position: "absolute", width: 19, height: 6, borderRadius: 10, backgroundColor: "rgba(45,30,25,0.22)", transform: [{ translateY: 15 }] }, pinShadowMoving: { width: 13, opacity: 0.14 }, mapHint: { position: "absolute", left: 12, right: 12, bottom: 11, backgroundColor: "rgba(38,31,28,0.78)", borderRadius: 10, paddingVertical: 8, paddingHorizontal: 11, alignItems: "center" }, mapHintText: { color: "#FFFFFF", fontSize: 8, fontWeight: "700" }, mapBadge: { position: "absolute", top: 10, left: 10, borderRadius: 9, backgroundColor: "rgba(255,255,255,0.94)", paddingHorizontal: 9, paddingVertical: 6 }, mapBadgeText: { color: colors.primary, fontSize: 7, fontWeight: "800", letterSpacing: 0.7 }, mapBadgeTextActive: { color: colors.green },
  addressCard: { backgroundColor: "#FFFFFF", borderRadius: 15, borderWidth: 1, borderColor: "#E5DAD1", padding: 13, marginTop: 12 }, addressHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, addressLabel: { color: colors.ink, fontSize: 9, fontWeight: "800", letterSpacing: 0.8 }, addressHint: { color: colors.muted, fontSize: 7, marginTop: 3 }, confirmed: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.greenSoft, alignItems: "center", justifyContent: "center" }, confirmedText: { color: colors.green, fontSize: 9, fontWeight: "800" }, addressInput: { minHeight: 58, color: "#4C443E", fontSize: 10, lineHeight: 16, paddingTop: 11, paddingHorizontal: 0, textAlignVertical: "top" }, coordinates: { color: "#AAA097", fontSize: 7, letterSpacing: 0.5 }, spacer: { height: 100 },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, minHeight: 82, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#E5DBD2", paddingHorizontal: 18, paddingVertical: 11, flexDirection: "row", alignItems: "center", ...shadow }, footerCopy: { flex: 1, paddingRight: 10 }, footerLabel: { color: colors.muted, fontSize: 7, fontWeight: "800", letterSpacing: 0.8 }, footerAddress: { color: colors.ink, fontSize: 9, fontWeight: "700", marginTop: 4 }, continueButton: { minWidth: 172, height: 50, borderRadius: 12, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 15 }, disabled: { backgroundColor: "#CFC5BD" }, continueText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" }, continueArrow: { color: "#FFFFFF", fontSize: 22, marginLeft: 8, marginTop: -2 },
});
