import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000/api";
const cache = new Map();
const pending = new Map();

const get = async (path, headers = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${API_URL}${path}`, { headers, signal: controller.signal });
    const json = await response.json();
    if (!response.ok || !json.success) throw new Error(json.message || "Request failed");
    return json.data ?? json;
  } finally {
    clearTimeout(timeout);
  }
};

export const getCachedHomeData = (lang = "en") => {
  const value = cache.get(lang);
  return value ? { ...value, profile: null, bookings: [] } : null;
};

export async function fetchHomeData(lang = "en", coordinates = null) {
  const requestKey = `${lang}:${coordinates?.latitude ?? "none"}:${coordinates?.longitude ?? "none"}`;
  if (pending.has(requestKey)) return pending.get(requestKey);

  const request = (async () => {
    const token = await AsyncStorage.getItem("user-app-token");
    const userId = await AsyncStorage.getItem("user-id");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const previous = cache.get(lang) || {};
    const [poojas, offers, pandits, profile, bookings] = await Promise.all([
      get(`/pooja-types?lang=${lang}`).catch(() => previous.poojas || []),
      get("/offers/active").catch(() => previous.offers || []),
      coordinates
        ? get(`/pandits/nearby?lat=${encodeURIComponent(coordinates.latitude)}&lng=${encodeURIComponent(coordinates.longitude)}&radius=50`).catch(() => previous.pandits || [])
        : previous.pandits || [],
      token ? get("/auth/me", headers).catch(() => null) : null,
      token && userId
        ? get(`/bookings/user/${userId}`, headers).catch(() => [])
        : [],
    ]);
    const result = { poojas, offers, pandits, profile: profile?.user || profile, bookings };
    cache.set(lang, result);
    return result;
  })();

  pending.set(requestKey, request);
  try {
    return await request;
  } finally {
    pending.delete(requestKey);
  }
}
