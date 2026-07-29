import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

export default function useLiveRefresh(refresh, intervalMs = 15000) {
  const refreshRef = useRef(refresh);
  useEffect(() => { refreshRef.current = refresh; }, [refresh]);

  useFocusEffect(useCallback(() => {
    refreshRef.current();
    const interval = setInterval(() => refreshRef.current(), intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs]));

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshRef.current();
    });
    return () => subscription.remove();
  }, []);
}
