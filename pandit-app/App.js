import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { I18nextProvider, useTranslation } from "react-i18next";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";

import i18n from "./src/i18n";
import { AuthProvider, useAuth } from "./src/context/AuthContext";

// Import Screens
import LanguageSelectionScreen from "./src/screens/LanguageSelectionScreen";
import LoginScreen from "./src/screens/LoginScreen";
import ProfileSetupScreen from "./src/screens/ProfileSetupScreen";
import RequestsScreen from "./src/screens/RequestsScreen";
import BookingsScreen from "./src/screens/BookingsScreen";
import EarningsScreen from "./src/screens/EarningsScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import BookingWonScreen from "./src/screens/BookingWonScreen";
import BookingDetailScreen from "./src/screens/BookingDetailScreen";
import RequestDetailScreen from "./src/screens/RequestDetailScreen";
import CreditWalletScreen from "./src/screens/CreditWalletScreen";
import AvailabilityScreen from "./src/screens/AvailabilityScreen";


const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Bottom Tab Navigator for Pandit App
function MainTabNavigator() {
  const { t } = useTranslation();
  const { pendingRequestsCount } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        headerStyle: {
          backgroundColor: "#7c2d12", // Deep premium maroon for pooja themes
        },
        headerTintColor: "#ffffff",
        headerTitleStyle: {
          fontWeight: "800",
          fontSize: 20,
        },
        tabBarActiveTintColor: "#ea580c", // Vibrant gold/orange
        tabBarInactiveTintColor: "#a1a1aa",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          height: 68,
          paddingBottom: 9,
          paddingTop: 9,
          borderTopWidth: 1.5,
          borderTopColor: "#ffedd5",
          shadowColor: "#7c2d12",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "700",
        },
      }}
    >
      <Tab.Screen
        name="Requests"
        component={RequestsScreen}
        options={{
          title: t("requests.title"),
          tabBarLabel: "Requests",
          tabBarBadge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined,
          tabBarIcon: ({ color, focused }) => (
            <Text style={{ fontSize: 20, color, opacity: focused ? 1 : 0.55 }}>◎</Text>
          ),
        }}
      />
      <Tab.Screen
        name="MyBookings"
        component={BookingsScreen}
        options={{
          title: t("bookings.title"),
          tabBarLabel: "Bookings",
          tabBarIcon: ({ color, focused }) => (
            <Text style={{ fontSize: 20, color, opacity: focused ? 1 : 0.55 }}>▣</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Earnings"
        component={EarningsScreen}
        options={{
          title: t("earnings.title"),
          tabBarLabel: "Earnings",
          tabBarIcon: ({ color, focused }) => (
            <Text style={{ fontSize: 20, color, opacity: focused ? 1 : 0.55 }}>₹</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: t("profile.title"),
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Text style={{ fontSize: 20, color, opacity: focused ? 1 : 0.55 }}>◇</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Navigation flow director based on Authentication State
function AppNavigator() {
  const { t } = useTranslation();
  const { token, pandit, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ea580c" />
      </View>
    );
  }

  // Determine initial screen/stack
  // If not logged in: Language Selection stack
  // If logged in but profile is not completed (e.g. name or specializations is missing): ProfileSetup
  // If registered and complete: Main bottom tab navigator
  const hasSpecializations = Array.isArray(pandit?.specializations)
    ? pandit.specializations.length > 0
    : Boolean(pandit?.specializations);
  const isProfileComplete = Boolean(pandit && pandit.name && hasSpecializations);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: "#7c2d12",
          },
          headerTintColor: "#ffffff",
          headerTitleStyle: {
            fontWeight: "800",
            fontSize: 20,
          },
          contentStyle: {
            backgroundColor: "#fff7ed",
          },
        }}
      >
        {!token ? (
          <>
            <Stack.Screen
              name="LanguageSelection"
              component={LanguageSelectionScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ProfileSetup"
              component={ProfileSetupScreen}
              options={{ headerShown: false }}
            />
          </>
        ) : !isProfileComplete ? (
          <Stack.Screen
            name="ProfileSetup"
            component={ProfileSetupScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="Main"
              component={MainTabNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="BookingWon"
              component={BookingWonScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="RequestDetail"
              component={RequestDetailScreen}
              options={{ title: "Pooja Request", headerBackTitleVisible: false }}
            />
            <Stack.Screen name="Availability" component={AvailabilityScreen} options={{ title: "Availability", headerBackTitleVisible: false }} />
            <Stack.Screen
              name="CreditWallet"
              component={CreditWalletScreen}
              options={{ title: "Credit Wallet", headerBackTitleVisible: false }}
            />
            <Stack.Screen
              name="BookingDetail"
              component={BookingDetailScreen}
              options={{
                title: t("bookings.detailTitle") || "Booking Detail",
                headerBackTitleVisible: false,
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <I18nextProvider i18n={i18n}>
        <AuthProvider>
          <AppNavigator />
          <StatusBar style="light" />
        </AuthProvider>
      </I18nextProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff7ed",
  },
});
