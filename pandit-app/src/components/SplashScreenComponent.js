import React, { useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  Animated,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";

const { width } = Dimensions.get("window");

export default function SplashScreenComponent({ onFinish }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    if (onFinish) {
      const timer = setTimeout(() => {
        onFinish();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Decorative Golden Rays / Background Ornament */}
      <View style={styles.mandalaWrapper}>
        <Text style={styles.mandalaIcon}>✺</Text>
      </View>

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* App Logo */}
        <View style={styles.logoFrame}>
          <Image
            source={require("../../assets/logo.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        {/* Brand Title */}
        <Text style={styles.brandTitle}>PANDITOO</Text>
        
        {/* Tagline */}
        <View style={styles.taglineBox}>
          <Text style={styles.taglineDot}>✦</Text>
          <Text style={styles.taglineText}>PUJA SEVA, AB EK CLICK PAR</Text>
          <Text style={styles.taglineDot}>✦</Text>
        </View>

        {/* Subtitle / App Badge */}
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>PANDIT PARTNER APP</Text>
        </View>
      </Animated.View>

      {/* Footer Loader */}
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#fbbf24" style={{ marginBottom: 12 }} />
        <Text style={styles.footerText}>Authentic Vedic Pooja Services</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#581c87" !== "#7c2d12" ? "#7c2d12" : "#7c2d12", // Deep Royal Crimson Maroon
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  mandalaWrapper: {
    position: "absolute",
    top: "15%",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.08,
  },
  mandalaIcon: {
    fontSize: 280,
    color: "#fbbf24",
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoFrame: {
    width: width * 0.48,
    height: width * 0.48,
    borderRadius: 36,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 12,
    overflow: "hidden",
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  brandTitle: {
    fontSize: 34,
    fontWeight: "900",
    color: "#fef3c7",
    letterSpacing: 4,
    marginBottom: 8,
    textAlign: "center",
  },
  taglineBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  taglineDot: {
    fontSize: 10,
    color: "#fbbf24",
    marginHorizontal: 8,
  },
  taglineText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fed7aa",
    letterSpacing: 1.5,
    textAlign: "center",
  },
  badgeContainer: {
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.4)",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#fef08a",
    letterSpacing: 1.2,
  },
  footer: {
    position: "absolute",
    bottom: 40,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#fde68a",
    opacity: 0.7,
    fontWeight: "500",
  },
});
