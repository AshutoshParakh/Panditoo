import React, { createContext, useState, useEffect, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { API_URL } from "../config/api";
const TOKEN_KEY = "pandit-app-token";

const AuthContext = createContext({
  isLoading: true,
  token: null,
  pandit: null,
  pendingRequestsCount: 0,
  setPendingRequestsCount: () => {},
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  refreshProfile: async () => {},
});

const fetchWithTimeout = async (url, options = {}, timeoutMs = 10000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
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

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [pandit, setPandit] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  const clearSession = async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setPandit(null);
    setPendingRequestsCount(0);
  };

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
      if (storedToken) {
        if (storedToken.startsWith("mock-")) {
          await clearSession();
        } else {
          setToken(storedToken);
          await fetchProfile(storedToken);
        }
      }
    } catch (error) {
      console.warn("Failed to load stored auth token:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProfile = async (authToken) => {
    try {
      const res = await fetchWithTimeout(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.success && data.pandit) {
        setPandit(data.pandit);
      } else {
        await clearSession();
      }
    } catch (error) {
      console.warn("Failed to validate stored pandit session:", error.message);
      await clearSession();
    }
  };

  const login = async (phone, otp) => {
    try {
      const res = await fetchWithTimeout(`${API_URL}/auth/pandit/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.isNewUser) {
          return { isNewUser: true, phone: data.phone };
        } else if (data.token) {
          await AsyncStorage.setItem(TOKEN_KEY, data.token);
          setToken(data.token);
          setPandit(data.pandit);
          return { isNewUser: false };
        }
      }
      throw new Error(data.message || "OTP verification failed");
    } catch (error) {
      throw new Error(error.name === "AbortError" ? "Login timed out. Check your connection and try again." : error.message);
    }
  };

  const register = async (panditData) => {
    try {
      const res = await fetchWithTimeout(`${API_URL}/auth/pandit/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(panditData),
      });
      const data = await res.json();
      if (res.ok && data.success && data.token) {
        await AsyncStorage.setItem(TOKEN_KEY, data.token);
        setToken(data.token);
        setPandit(data.pandit);
        return data.pandit;
      }
      throw new Error(data.message || "Registration failed");
    } catch (error) {
      throw new Error(error.name === "AbortError" ? "Registration timed out. Check your connection and try again." : error.message);
    }
  };

  const logout = async () => {
    try {
      await clearSession();
    } catch (error) {
      console.warn("Failed to remove token:", error);
    }
  };

  const refreshProfile = async () => {
    if (token) {
      await fetchProfile(token);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isLoading,
        token,
        pandit,
        pendingRequestsCount,
        setPendingRequestsCount,
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
