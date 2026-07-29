import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000/api";

export default function ChoosePanditsScreen({ route, navigation }) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || "en";
  const { pooja, bookingDate, bookingTime, latitude, longitude, address } = route.params || {};

  const [pandits, setPandits] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNearbyPandits = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/pandits/nearby?lat=${latitude}&lng=${longitude}&radius=50`
      );
      const json = await response.json();
      if (json && json.success && Array.isArray(json.data) && json.data.length > 0) {
        setPandits(json.data);
      } else {
        setPandits([]);
      }
    } catch (error) {
      console.warn("Failed to fetch nearby pandits:", error.message);
      setPandits([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNearbyPandits();
  }, [latitude, longitude]);

  const handleSelectPandit = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      if (selectedIds.length < 10) {
        setSelectedIds([...selectedIds, id]);
      }
    }
  };

  const handleContinue = () => {
    const selectedPandits = pandits.filter((p) => selectedIds.includes(p.id));
    navigation.navigate("ConfirmBooking", {
      pooja,
      bookingDate,
      bookingTime,
      address,
      latitude,
      longitude,
      selectedPanditIds: selectedIds,
      selectedPandits,
    });
  };

  const renderPanditCard = ({ item }) => {
    const isSelected = selectedIds.includes(item.id);
    const isDisabled = !isSelected && selectedIds.length >= 10;

    return (
      <TouchableOpacity
        style={[styles.card, isSelected && styles.selectedCard]}
        onPress={() => handleSelectPandit(item.id)}
        disabled={isDisabled}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>🕉️</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.panditName}>{item.name}</Text>
              {(item.rating != null || item.experience_years != null) && <View style={styles.ratingRow}>
                {item.rating != null ? <Text style={styles.ratingText}>⭐ {item.rating}</Text> : null}
                {item.rating != null && item.experience_years != null ? <Text style={styles.dot}>•</Text> : null}
                {item.experience_years != null ? <Text style={styles.expText}>{t("choosePandits.experience", { yrs: item.experience_years })}</Text> : null}
              </View>}
            </View>
          </View>

          <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
            {isSelected ? <Text style={styles.checkboxTick}>✓</Text> : null}
          </View>
        </View>

        <View style={styles.tagContainer}>
          {Array.isArray(item.specializations) &&
            item.specializations.map((spec, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{spec}</Text>
              </View>
            ))}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("choosePandits.title")}</Text>
        <Text style={styles.counter}>
          {t("choosePandits.selectedCount", { count: selectedIds.length })}
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#d97706" />
          <Text style={styles.loadingText}>{t("choosePandits.loading")}</Text>
        </View>
      ) : (
        <View style={styles.listWrapper}>
          <FlatList
            data={pandits}
            keyExtractor={(item) => item.id}
            renderItem={renderPanditCard}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{t("choosePandits.noPandits")}</Text>
              </View>
            }
          />

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.continueBtn, selectedIds.length === 0 && styles.disabledBtn]}
              onPress={handleContinue}
              disabled={selectedIds.length === 0}
              activeOpacity={0.8}
            >
              <Text style={styles.continueBtnText}>{t("choosePandits.continue")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7efe5",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#6a1b1a",
  },
  counter: {
    fontSize: 15,
    fontWeight: "700",
    color: "#d97706",
    backgroundColor: "#fffbeb",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: "#5f4b3a",
    fontWeight: "600",
  },
  listWrapper: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e3d5c5",
    shadowColor: "#6a1b1a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  selectedCard: {
    borderColor: "#6a1b1a",
    borderWidth: 2,
    backgroundColor: "#fcf9f5",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f7efe5",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 24,
  },
  infoCol: {
    flex: 1,
    gap: 4,
  },
  panditName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#6a1b1a",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#d97706",
  },
  dot: {
    color: "#a08f80",
    fontSize: 14,
  },
  expText: {
    fontSize: 14,
    color: "#5f4b3a",
    fontWeight: "600",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#a08f80",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    borderColor: "#6a1b1a",
    backgroundColor: "#6a1b1a",
  },
  checkboxTick: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  tagContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingLeft: 60,
  },
  tag: {
    backgroundColor: "#f7efe5",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 12,
    color: "#5f4b3a",
    fontWeight: "700",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: "#a08f80",
    fontWeight: "600",
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#f7efe5",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#e3d5c5",
  },
  continueBtn: {
    height: 52,
    backgroundColor: "#d97706",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#d97706",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  disabledBtn: {
    backgroundColor: "#e0d3c5",
    shadowOpacity: 0,
    elevation: 0,
  },
  continueBtnText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
});
