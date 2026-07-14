import { CloudOff, RefreshCw } from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, Platform, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { usePatient } from "../context/PatientContext";

/**
 * Çevrimdışı çalışırken ekranın en üstünde beliren, rahatsız etmeyen bilgi barı.
 * Bağlantı koptuğunda "Çevrimdışı Çalışıyor", bekleyen senkronizasyon varsa
 * kuyruk sayısını gösterir.
 */
export default function OfflineBar() {
  const { online, pendingSyncCount } = usePatient();
  const translateY = useRef(new Animated.Value(-80)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: online ? -80 : 0,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [online, translateY]);

  if (online) return null;

  return (
    <SafeAreaView
      edges={["top"]}
      className="absolute left-0 right-0 top-0 z-40 px-4"
      style={{ pointerEvents: "none" }}
    >
      <Animated.View
        style={{ transform: [{ translateY }] }}
        className="mt-2 flex-row items-center rounded-xl bg-ink/90 px-3 py-2"
      >
        <CloudOff size={16} color="#ffffff" />
        <Text className="ml-2 flex-1 text-xs font-semibold text-white">
          Çevrimdışı Çalışıyor
        </Text>
        {pendingSyncCount > 0 ? (
          <View className="flex-row items-center rounded-full bg-white/15 px-2 py-0.5">
            <RefreshCw size={11} color="#ffffff" />
            <Text className="ml-1 text-[10px] font-medium text-white">
              {pendingSyncCount} kayıt bekliyor
            </Text>
          </View>
        ) : null}
      </Animated.View>
    </SafeAreaView>
  );
}
