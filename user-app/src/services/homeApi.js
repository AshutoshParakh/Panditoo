import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000/api";
const get = async (path, headers = {}) => { const response = await fetch(`${API_URL}${path}`, { headers }); const json = await response.json(); if (!response.ok || !json.success) throw new Error(json.message || "Request failed"); return json.data ?? json; };

export async function fetchHomeData(lang = "en") {
  const token = await AsyncStorage.getItem("user-app-token");
  const userId = await AsyncStorage.getItem("user-id");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const [poojas, pandits, profile, bookings] = await Promise.all([
    get(`/pooja-types?lang=${lang}`).catch(() => []),
    get("/pandits/nearby?lat=12.9716&lng=77.5946&radius=50").catch(() => []),
    token ? get("/auth/me", headers).catch(() => null) : null,
    token && userId && !userId.startsWith("mock-") ? get(`/bookings/user/${userId}`, headers).catch(() => []) : [],
  ]);
  return { poojas, pandits, profile: profile?.user || profile, bookings };
}
