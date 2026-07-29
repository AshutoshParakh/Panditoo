import React, { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import HomeHeader from "../components/home/HomeHeader";
import HeroBanner from "../components/home/HeroBanner";
import UpcomingCeremony from "../components/home/UpcomingCeremony";
import PopularPoojas from "../components/home/PopularPoojas";
import NearbyPandits from "../components/home/NearbyPandits";
import TrustStrip from "../components/home/TrustStrip";
import { fetchHomeData, getCachedHomeData } from "../services/homeApi";
import { colors } from "../theme/homeTheme";

const emptyData = { poojas: [], pandits: [], bookings: [], profile: null };

export default function HomeScreen({ navigation }) {
  const { i18n } = useTranslation();
  const focused = useIsFocused();
  const insets = useSafeAreaInsets();
  const language = i18n.language || "en";
  const [data, setData] = useState(() => getCachedHomeData(language) || emptyData);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    try { setData(await fetchHomeData(language)); } finally { setRefreshing(false); }
  }, [language]);

  useEffect(() => { if (focused) load(); }, [focused, load]);

  const activeBookings = data.bookings.filter((booking) => ["confirmed", "pending"].includes(booking.status));
  const upcoming = activeBookings.sort((a, b) => new Date(a.booking_date) - new Date(b.booking_date))[0] || null;
  const openPooja = (pooja) => navigation.navigate("PoojaDetails", { pooja });
  const search = (query = "") => navigation.navigate("ExploreTab", { searchQuery: query });

  return <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingTop: insets.top + 8 }]} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}><HomeHeader name={data.profile?.name?.split(" ")[0] || "User"} location={data.profile?.address?.split(",")[0] || "Location not set"} notificationCount={activeBookings.length} onSearch={search} onLanguage={() => i18n.changeLanguage(language === "hi" ? "en" : "hi")} onBookings={() => navigation.navigate("BookingsTab")} /><HeroBanner onPress={() => data.poojas[0] && openPooja(data.poojas[0])} /><UpcomingCeremony booking={upcoming} onPress={() => navigation.navigate("BookingsTab")} /><PopularPoojas poojas={data.poojas} onSelect={openPooja} onViewAll={() => search()} /><NearbyPandits pandits={data.pandits} onView={(pandit) => navigation.navigate("PanditDetails", { pandit })} onBook={(pandit) => search(pandit.specializations?.[0] || "")} onViewAll={() => search()} /><TrustStrip /></ScrollView>;
}

const s = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.bg }, content: { paddingHorizontal: 16, paddingBottom: 22 } });
