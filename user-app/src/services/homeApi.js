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

export async function fetchHomeData(lang = "en") {
  if (pending.has(lang)) return pending.get(lang);

  const request = (async () => {
    const token = await AsyncStorage.getItem("user-app-token");
    const userId = await AsyncStorage.getItem("user-id");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const previous = cache.get(lang) || {};
    const [poojas, pandits, profile, bookings] = await Promise.all([
      get(`/pooja-types?lang=${lang}`).catch(() => previous.poojas || []),
      get("/pandits/nearby?lat=12.9716&lng=77.5946&radius=50").catch(() => previous.pandits || []),
      token ? get("/auth/me", headers).catch(() => null) : null,
      token && userId
        ? get(`/bookings/user/${userId}`, headers).catch(() => [])
        : [],
    ]);
    const result = { poojas, pandits, profile: profile?.user || profile, bookings };
    cache.set(lang, result);
    return result;
  })();

  pending.set(lang, request);
  try {
    return await request;
  } finally {
    pending.delete(lang);
  }
}
