import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import RazorpayCheckout from "react-native-razorpay";
import { useAuth } from "../context/AuthContext";
import { colors, shadow } from "../theme";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://api.panditoo.in/api";

export default function CreditWalletScreen() {
  const { token, pandit } = useAuth();
  const [data, setData] = useState({ balance: 0, history: [], credit_price_rupees: 10 });
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [customCredits, setCustomCredits] = useState("20");

  const api = async (path, options = {}) => {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
    const json = await response.json();
    if (!response.ok || !json.success) throw new Error(json.message || "Request failed");
    return json;
  };

  const load = useCallback(async () => {
    if (!pandit?.id) return;
    try {
      setLoading(true);
      const result = await api(`/pandits/${pandit.id}/credits`);
      setData(result.data);
    } catch (e) {
      Alert.alert("Unable to load credits", e.message);
    } finally {
      setLoading(false);
    }
  }, [pandit?.id, token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const parsedCredits = parseInt(customCredits, 10) || 0;
  const creditPrice = data.credit_price_rupees || 10;
  const totalAmount = parsedCredits > 0 ? parsedCredits * creditPrice : 0;

  const handleBuyCredits = async () => {
    if (parsedCredits < 1) {
      Alert.alert("Invalid Input", "Please enter at least 1 credit.");
      return;
    }
    setBuying(true);
    try {
      const created = await api(`/pandits/${pandit.id}/credits/create-order`, {
        method: "POST",
        body: JSON.stringify({ credits: parsedCredits }),
      });
      const order = created.data;
      let payment;

      if (order.is_stub) {
        payment = {
          razorpay_order_id: order.order_id,
          razorpay_payment_id: `pay_stub_${Date.now()}`,
          razorpay_signature: "stub_signature",
        };
      } else {
        const razorpay = RazorpayCheckout && typeof RazorpayCheckout.open === "function" 
          ? RazorpayCheckout 
          : (RazorpayCheckout && RazorpayCheckout.default && typeof RazorpayCheckout.default.open === "function" ? RazorpayCheckout.default : null);

        if (!razorpay) {
          throw new Error("Razorpay native checkout module is not linked in Expo Go. Please test using a custom build/APK.");
        }

        payment = await razorpay.open({
          key: order.key_id,
          amount: order.amount,
          currency: order.currency || "INR",
          order_id: order.order_id,
          name: "Panditoo",
          description: `Purchase ${parsedCredits} credits`,
          prefill: {
            contact: pandit.phone || "",
            email: pandit.email || "",
          },
          theme: { color: colors.primary },
        });
      }

      await api(`/pandits/${pandit.id}/credits/verify`, {
        method: "POST",
        body: JSON.stringify(payment),
      });

      setModalVisible(false);
      Alert.alert("Purchase Successful", `₹${totalAmount} paid successfully! ${parsedCredits} credits added to your wallet.`);
      load();
    } catch (e) {
      const isCancelled = e?.code === 2 || String(e?.description || e?.message || "").toLowerCase().includes("cancel");
      if (!isCancelled) {
        Alert.alert("Purchase Failed", e.description || e.message || "Payment was not completed");
      }
    } finally {
      setBuying(false);
    }
  };

  return (
    <SafeAreaView style={s.screen}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.eyebrow}>CREDIT WALLET</Text>
        <Text style={s.heading}>Service credits</Text>

        <View style={s.hero}>
          <View style={s.heroTop}>
            <View>
              <Text style={s.heroLabel}>AVAILABLE CREDITS</Text>
              <Text style={s.balance}>{data.balance}</Text>
            </View>

            <TouchableOpacity
              style={s.addBtn}
              onPress={() => {
                setCustomCredits("20");
                setModalVisible(true);
              }}
            >
              <Text style={s.addBtnText}>+ Add Credits</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.heroNote}>
            1 credit = ₹{creditPrice} · Credits are debited only when you accept a service.
          </Text>
        </View>

        <Text style={s.title}>Credit History</Text>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
        ) : (
          data.history?.map((item) => (
            <View key={item.id} style={s.row}>
              <View style={[s.icon, item.direction === "credit" ? s.creditBg : s.debitBg]}>
                <Text style={item.direction === "credit" ? s.credit : s.debit}>
                  {item.direction === "credit" ? "+" : "−"}
                </Text>
              </View>
              <View style={s.copy}>
                <Text style={s.desc}>
                  {item.pooja_name ? `${item.description} · ${item.pooja_name}` : item.description}
                </Text>
                <Text style={s.date}>{new Date(item.created_at).toLocaleString("en-IN")}</Text>
              </View>
              <Text style={[s.amount, item.direction === "credit" ? s.credit : s.debit]}>
                {item.direction === "credit" ? "+" : "−"}
                {item.credits}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal for Custom Credit Purchase */}
      <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Add Wallet Credits</Text>
            <Text style={s.modalSub}>Enter the number of credits you want to purchase</Text>

            <View style={s.inputContainer}>
              <TextInput
                style={s.input}
                keyboardType="number-pad"
                value={customCredits}
                onChangeText={(text) => setCustomCredits(text.replace(/\D/g, ""))}
                placeholder="e.g. 20"
                maxLength={4}
              />
              <Text style={s.inputSuffix}>Credits</Text>
            </View>

            <View style={s.presetsRow}>
              {[10, 20, 50, 100].map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[s.presetChip, customCredits === String(val) && s.presetChipActive]}
                  onPress={() => setCustomCredits(String(val))}
                >
                  <Text style={[s.presetChipText, customCredits === String(val) && s.presetChipTextActive]}>
                    +{val}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.summaryBox}>
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Credits Amount:</Text>
                <Text style={s.summaryVal}>{parsedCredits} Credits</Text>
              </View>
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Rate per credit:</Text>
                <Text style={s.summaryVal}>₹{creditPrice}</Text>
              </View>

              <View style={s.divider} />

              <View style={s.summaryRow}>
                <Text style={s.totalLabel}>Total Payable Amount:</Text>
                <Text style={s.totalVal}>₹{totalAmount}</Text>
              </View>
            </View>

            <View style={s.modalActions}>
              <TouchableOpacity
                style={s.cancelBtn}
                disabled={buying}
                onPress={() => setModalVisible(false)}
              >
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.payBtn, (parsedCredits < 1 || buying) && s.payBtnDisabled]}
                disabled={parsedCredits < 1 || buying}
                onPress={handleBuyCredits}
              >
                {buying ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={s.payBtnText}>Pay ₹{totalAmount}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 18, paddingBottom: 35 },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: "900", letterSpacing: 1.3 },
  heading: { fontSize: 28, fontWeight: "900", color: colors.ink, marginTop: 5 },
  hero: { backgroundColor: "#34251F", borderRadius: 20, padding: 20, marginTop: 15, ...shadow },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroLabel: { color: "#D9C9BC", fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  balance: { color: "#FFD36A", fontSize: 44, fontWeight: "900", marginTop: 4 },
  addBtn: {
    backgroundColor: "#FFD36A",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addBtnText: { color: "#34251F", fontSize: 13, fontWeight: "900" },
  heroNote: { color: "#E7DDD5", fontSize: 10, lineHeight: 16, marginTop: 12 },
  title: { fontSize: 16, fontWeight: "900", color: colors.ink, marginTop: 22, marginBottom: 12 },
  row: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 13,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  icon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  creditBg: { backgroundColor: colors.greenSoft },
  debitBg: { backgroundColor: colors.dangerSoft },
  credit: { color: colors.green, fontWeight: "900" },
  debit: { color: colors.danger, fontWeight: "900" },
  copy: { flex: 1, marginLeft: 9 },
  desc: { fontSize: 11, fontWeight: "800", color: colors.ink },
  date: { fontSize: 9, color: colors.muted, marginTop: 3 },
  amount: { fontSize: 15, fontWeight: "900" },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 22,
    ...shadow,
  },
  modalTitle: { fontSize: 20, fontWeight: "900", color: colors.ink },
  modalSub: { fontSize: 12, color: colors.muted, marginTop: 4, marginBottom: 16 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: "#FAF6F5",
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 22,
    fontWeight: "900",
    color: colors.ink,
  },
  inputSuffix: { fontSize: 14, fontWeight: "800", color: colors.muted },
  presetsRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  presetChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#F2EBE8",
    alignItems: "center",
  },
  presetChipActive: { backgroundColor: colors.primary },
  presetChipText: { fontSize: 12, fontWeight: "900", color: colors.ink },
  presetChipTextActive: { color: "#FFF" },
  summaryBox: {
    backgroundColor: "#FDFBF7",
    borderWidth: 1,
    borderColor: "#EFE6DB",
    borderRadius: 14,
    padding: 14,
    marginTop: 18,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  summaryLabel: { fontSize: 12, color: colors.muted },
  summaryVal: { fontSize: 12, fontWeight: "800", color: colors.ink },
  divider: { height: 1, backgroundColor: "#EFE6DB", marginVertical: 8 },
  totalLabel: { fontSize: 14, fontWeight: "900", color: colors.ink },
  totalVal: { fontSize: 18, fontWeight: "900", color: colors.primary },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 20 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  cancelBtnText: { fontSize: 14, fontWeight: "800", color: colors.muted },
  payBtn: {
    flex: 2,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  payBtnDisabled: { opacity: 0.5 },
  payBtnText: { fontSize: 14, fontWeight: "900", color: "#FFF" },
});

