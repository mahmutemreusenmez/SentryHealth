import { Bell, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { ScheduledNotification } from "../data/types";
import { reminderService } from "../services/notificationService";

/**
 * Simüle edilmiş yerel bildirimleri uygulama içi banner olarak gösterir.
 * Servisten gelen her tetiklemede kısa süreli bir üst bildirim belirir.
 */
export default function NotificationBanner() {
  const [active, setActive] = useState<ScheduledNotification | null>(null);

  useEffect(() => {
    const unsubscribe = reminderService.subscribe((notif) => {
      setActive(notif);
      setTimeout(() => {
        setActive((current) => (current?.id === notif.id ? null : current));
      }, 6000);
    });
    reminderService.start();
    return () => {
      unsubscribe();
    };
  }, []);

  if (!active) return null;

  return (
    <SafeAreaView
      edges={["top"]}
      className="absolute left-0 right-0 top-0 z-50 px-4"
      style={{ pointerEvents: "box-none" }}
    >
      <Pressable
        onPress={() => setActive(null)}
        className="mt-2 flex-row items-center rounded-2xl bg-brand-dark p-3 shadow-lg"
      >
        <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-white/20">
          <Bell size={18} color="#ffffff" />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-bold text-white">{active.title}</Text>
          <Text className="text-xs text-brand-light">{active.body}</Text>
        </View>
        <X size={18} color="#d1fae5" />
      </Pressable>
    </SafeAreaView>
  );
}
