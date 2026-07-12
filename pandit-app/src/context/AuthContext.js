import React, { createContext, useState, useEffect, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000/api";
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

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [pandit, setPandit] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
      if (storedToken) {
        setToken(storedToken);
        await fetchProfile(storedToken);
      }
    } catch (error) {
      console.warn("Failed to load stored auth token:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProfile = async (authToken) => {
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.success && data.pandit) {
        setPandit(data.pandit);
      } else {
        // Token is invalid/expired
        await logout();
      }
    } catch (error) {
      console.warn("Failed to fetch profile:", error);
      // In offline/test mode, we can keep the local state if already set, but don't force logout
    }
  };

  const login = async (phone, otp) => {
    try {
      const res = await fetch(`${API_URL}/auth/pandit/verify-otp`, {
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
      console.error("Login verification failed:", error);
      throw error;
    }
  };

  const register = async (panditData) => {
    try {
      const res = await fetch(`${API_URL}/auth/pandit/register`, {
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
      console.error("Registration request failed:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setPandit(null);
      setPendingRequestsCount(0);
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
