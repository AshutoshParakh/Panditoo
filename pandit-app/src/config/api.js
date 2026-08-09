export const getApiUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim();
  }
  return "https://api.panditoo.in/api";
};

export const API_URL = getApiUrl();
