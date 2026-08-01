import React, { useEffect } from "react";
import { Text } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { I18nextProvider, useTranslation } from "react-i18next";
import i18n, { loadStoredLanguage } from "./src/i18n";
import { LanguageToggle } from "./src/components/LanguageToggle";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import LoginScreen from "./src/screens/LoginScreen";
import HomeScreen from "./src/screens/HomeScreen";
import ExploreScreen from "./src/screens/ExploreScreen";
import BookingsScreen from "./src/screens/BookingsScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import PoojaDetailsScreen from "./src/screens/PoojaDetailsScreen";
import PanditDetailsScreen from "./src/screens/PanditDetailsScreen";
import SelectDateTimeScreen from "./src/screens/SelectDateTimeScreen";
import SelectLocationScreen from "./src/screens/SelectLocationScreen";
import ChoosePanditsScreen from "./src/screens/ChoosePanditsScreen";
import BookingSuccessScreen from "./src/screens/BookingSuccessScreen";
import ConfirmBookingScreen from "./src/screens/ConfirmBookingScreen";
import WaitingForPanditScreen from "./src/screens/WaitingForPanditScreen";
import BookingConfirmedScreen from "./src/screens/BookingConfirmedScreen";
import RateExperienceScreen from "./src/screens/RateExperienceScreen";
import AccountDetailScreen from "./src/screens/AccountDetailScreen";
import CancelBookingScreen from "./src/screens/CancelBookingScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        headerStyle: {
          backgroundColor: "#6a1b1a",
        },
        headerTintColor: "#ffffff",
        headerTitleStyle: {
          fontWeight: "700",
          fontSize: 20,
        },
        headerRight: () => <LanguageToggle />,
        tabBarActiveTintColor: "#d97706",
        tabBarInactiveTintColor: "#a08f80",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          height: 68,
          paddingBottom: 10,
          paddingTop: 10,
          borderTopWidth: 1,
          borderTopColor: "#e3d5c5",
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: t("common.homeTab"),
          tabBarLabel: t("common.homeTab"),
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>🏠</Text>
          ),
        }}
      />
      <Tab.Screen
        name="ExploreTab"
        component={ExploreScreen}
        options={{
          title: "Explore",
          tabBarLabel: "Explore",
          tabBarIcon: ({ color, size }) => <Text style={{ color, fontSize: size }}>◉</Text>,
        }}
      />
      <Tab.Screen
        name="BookingsTab"
        component={BookingsScreen}
        options={{
          title: t("common.bookingsTab"),
          tabBarLabel: t("common.bookingsTab"),
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>📅</Text>
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: t("common.profileTab"),
          tabBarLabel: t("common.profileTab"),
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>👤</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function AppContent() {
  const { t } = useTranslation();

  useEffect(() => {
    // Initial load of language from storage
    loadStoredLanguage().catch(() => {});
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Onboarding"
        screenOptions={{
          headerStyle: {
            backgroundColor: "#6a1b1a",
          },
          headerTintColor: "#ffffff",
          headerTitleStyle: {
            fontWeight: "700",
            fontSize: 20,
          },
          headerRight: () => <LanguageToggle />,
          contentStyle: {
            backgroundColor: "#f7efe5",
          },
        }}
      >
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{
            title: "",
            headerShadowVisible: false,
            headerStyle: {
              backgroundColor: "#f7efe5",
            },
          }}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{
            title: t("login.title"),
          }}
        />
        <Stack.Screen
          name="Main"
          component={TabNavigator}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="PoojaDetails"
          component={PoojaDetailsScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="SelectDateTime"
          component={SelectDateTimeScreen}
          options={{
            title: t("dateTime.title"),
          }}
        />
        <Stack.Screen
          name="SelectLocation"
          component={SelectLocationScreen}
          options={{
            title: t("location.title"),
          }}
        />
        <Stack.Screen
          name="ChoosePandits"
          component={ChoosePanditsScreen}
          options={{
            title: t("choosePandits.title"),
          }}
        />
        <Stack.Screen
          name="BookingSuccess"
          component={BookingSuccessScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="ConfirmBooking"
          component={ConfirmBookingScreen}
          options={{
            title: "Confirm Booking",
          }}
        />
        <Stack.Screen
          name="WaitingForPandit"
          component={WaitingForPanditScreen}
          options={{
            title: "Waiting for Pandit",
          }}
        />
        <Stack.Screen
          name="BookingConfirmed"
          component={BookingConfirmedScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="AccountDetail"
          component={AccountDetailScreen}
          options={({ route }) => ({ title: route.params?.title || "Account" })}
        />
        <Stack.Screen name="CancelBooking" component={CancelBookingScreen} options={{ title: "Cancel Booking" }} />
        <Stack.Screen
          name="RateExperience"
          component={RateExperienceScreen}
          options={{
            title: "Rate Experience",
          }}
        />
      </Stack.Navigator>
      <StatusBar style="light" />
    </NavigationContainer>
  );
}

export default function App() { return <SafeAreaProvider><I18nextProvider i18n={i18n}><AppContent /></I18nextProvider></SafeAreaProvider>; }
