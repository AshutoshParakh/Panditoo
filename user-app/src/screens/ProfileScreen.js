import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000/api";

export default function ProfileScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || "en";
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = await AsyncStorage.getItem("user-app-token");
        if (!token) {
          setLoading(false);
          return;
        }
        const res = await fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok && data.success && data.user) {
          setUser(data.user);
        }
      } catch (err) {
        console.warn("Error fetching profile:", err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.removeItem("user-app-token");
    await AsyncStorage.removeItem("user-id");
    navigation.reset({
      index: 0,
      routes: [{ name: "Onboarding" }],
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#6a1b1a" />
      </SafeAreaView>
    );
  }

  const name = user?.name || "User";
  const phone = user?.phone ? `+91 ${user.phone.slice(-10)}` : "N/A";
  const email = user?.email || "N/A";
  const address = user?.address || "N/A";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.profileName}>{name}</Text>
          <Text style={styles.profilePhone}>{phone}</Text>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t("profile.name")}</Text>
            <Text style={styles.infoValue}>{name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t("profile.phone")}</Text>
            <Text style={styles.infoValue}>{phone}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Address</Text>
            <Text style={styles.infoValue}>{address}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t("profile.language")}</Text>
            <Text style={styles.infoValue}>
              {currentLang === "hi" ? "हिन्दी" : "English"}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={styles.logoutButtonText}>{t("profile.logout")}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7efe5",
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "space-between",
  },
  avatarSection: {
    alignItems: "center",
    marginTop: 20,
    gap: 8,
  },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#6a1b1a",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#6a1b1a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarText: {
    fontSize: 40,
    color: "#ffffff",
    fontWeight: "700",
  },
  profileName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#6a1b1a",
  },
  profilePhone: {
    fontSize: 16,
    color: "#a08f80",
    fontWeight: "600",
  },
  infoSection: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#e3d5c5",
    shadowColor: "#6a1b1a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginVertical: 30,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f7efe5",
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#5f4b3a",
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#6a1b1a",
  },
  logoutButton: {
    height: 52,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#6a1b1a",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  logoutButtonText: {
    color: "#6a1b1a",
    fontSize: 18,
    fontWeight: "700",
  },
});
