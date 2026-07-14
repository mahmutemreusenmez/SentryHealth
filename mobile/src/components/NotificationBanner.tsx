import { AlertTriangle, Bell, HeartPulse, Pill, X } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Platform, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { SimNotification, SimNotificationKind } from "../data/types";
import { reminderService } from "../services/notificationService";

const KIND_STYLE: Record<
  SimNotificationKind,
  { bg: string; iconBg: string; sub: string; icon: LucideIcon }
> = {
  medication: {
    bg: "bg-brand-dark",
    iconBg: "bg-white/20",
    sub: "text-brand-light",
    icon: Pill,
  },
  measurement: {
    bg: "bg-blue-dark",
    iconBg: "bg-white/20",
    sub: "text-blue-light",
    icon: HeartPulse,
  },
  reminder: {
    bg: "bg-brand-dark",
    iconBg: "bg-white/20",
    sub: "text-brand-light",
    icon: Bell,
  },
  critical: {
    bg: "bg-danger",
    iconBg: "bg-white/25",
    sub: "text-white/80",
    icon: AlertTriangle,
  },
};

/**
 * Simüle edilmiş bildirimleri, telefonun üstünden kayarak inen bir push
 * bildirim kartı olarak gösterir. Hem zamanlanmış hatırlatıcıları hem de
 * Dashboard'daki "Test Bildirimi Gönder" butonunu dinler.
 */
export default function NotificationBanner() {
  const [active, setActive] = useState<SimNotification | null>(null);
  const translateY = useRef(new Animated.Value(-160)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const show = (notif: SimNotification) => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setActive(notif);
      translateY.setValue(-160);
      opacity.setValue(0);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 260,
          useNativeDriver: Platform.OS !== "web",
        }),
      ]).start();
      hideTimer.current = setTimeout(() => dismiss(), 6000);
    };

    // Zamanlanmış hatırlatıcıları da aynı push kartına dönüştür.
    const unsubReminder = reminderService.subscribe((n) =>
      show({
        id: n.id,
        kind: "reminder",
        title: n.title,
        body: n.body,
        timestamp: Date.now(),
      }),
    );
    const unsubSim = reminderService.subscribeSim(show);
    reminderService.start();

    return () => {
      unsubReminder();
      unsubSim();
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -160,
        duration: 260,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: Platform.OS !== "web",
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: Platform.OS !== "web",
      }),
    ]).start(() => setActive(null));
  };

  if (!active) return null;

  const style = KIND_STYLE[active.kind];
  const Icon = style.icon;

  return (
    <SafeAreaView
      edges={["top"]}
      className="absolute left-0 right-0 top-0 z-50 px-4"
      style={{ pointerEvents: "box-none" }}
    >
      <Animated.View style={{ opacity, transform: [{ translateY }] }}>
        <Pressable
          onPress={dismiss}
          className={`mt-2 flex-row items-center rounded-2xl p-3 shadow-lg ${style.bg}`}
        >
          <View
            className={`mr-3 h-9 w-9 items-center justify-center rounded-full ${style.iconBg}`}
          >
            <Icon size={18} color="#ffffff" />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center">
              <Text className="text-[10px] font-bold uppercase tracking-wide text-white/80">
                SentryCompanion AI
              </Text>
            </View>
            <Text className="text-sm font-bold text-white">{active.title}</Text>
            <Text className={`text-xs ${style.sub}`}>{active.body}</Text>
          </View>
          <X size={18} color="#ffffff" />
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}
