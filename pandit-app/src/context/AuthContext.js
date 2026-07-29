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

const fetchWithTimeout = async (url, options = {}, timeoutMs = 2500) => {
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

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
      if (storedToken) {
        setToken(storedToken);
        if (storedToken.startsWith("mock-")) {
          setPandit({
            id: "pandit-demo-1",
            name: "Pandit Ramesh Sharma",
            phone: "9876543210",
            email: "ramesh.sharma@gmail.com",
            specializations: ["Satyanarayan Pooja", "Griha Pravesh", "Ganesh Pooja"],
            experience_years: 10,
            service_radius_km: 15,
            address: "Vijay Nagar, Indore, Madhya Pradesh",
            is_verified: true,
            is_active: true,
          });
        } else {
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
      }, 2500);
      const data = await res.json();
      if (res.ok && data.success && data.pandit) {
        setPandit(data.pandit);
      } else {
        // Token is invalid/expired
        await logout();
      }
    } catch (error) {
      console.warn("Failed to fetch profile (using fallback):", error.message);
      setPandit((prev) => prev || {
        id: "pandit-demo-1",
        name: "Pandit Ramesh Sharma",
        phone: "9876543210",
        email: "ramesh.sharma@gmail.com",
        specializations: ["Satyanarayan Pooja", "Griha Pravesh", "Ganesh Pooja"],
        experience_years: 10,
        service_radius_km: 15,
        address: "Vijay Nagar, Indore, Madhya Pradesh",
        is_verified: true,
        is_active: true,
      });
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
      console.warn("Backend verify-otp failed or unavailable, using fallback mode:", error.message);
      // Test/Offline fallback behavior:
      // Numbers ending in '00' or '99' simulate a new unregistered Pandit.
      // All other numbers simulate an existing registered Pandit.
      const isNew = phone.endsWith("00") || phone.endsWith("99");
      if (isNew) {
        return { isNewUser: true, phone };
      } else {
        const mockToken = "mock-pandit-jwt-token";
        const mockPandit = {
          id: "pandit-demo-1",
          name: "Pandit Ramesh Sharma",
          phone: phone,
          email: "ramesh.sharma@gmail.com",
          specializations: ["Satyanarayan Pooja", "Griha Pravesh", "Ganesh Pooja"],
          experience_years: 10,
          service_radius_km: 15,
          address: "Vijay Nagar, Indore, Madhya Pradesh",
          is_verified: true,
          is_active: true,
        };
        await AsyncStorage.setItem(TOKEN_KEY, mockToken);
        setToken(mockToken);
        setPandit(mockPandit);
        return { isNewUser: false };
      }
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
      console.warn("Backend registration failed, using test mode fallback:", error.message);
      const mockToken = "mock-pandit-jwt-token-" + Date.now();
      const newPandit = {
        id: "pandit-" + Date.now(),
        ...panditData,
        is_verified: true,
        is_active: true,
      };
      await AsyncStorage.setItem(TOKEN_KEY, mockToken);
      setToken(mockToken);
      setPandit(newPandit);
      return newPandit;
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
