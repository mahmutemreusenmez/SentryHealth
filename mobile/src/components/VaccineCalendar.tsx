import { AlertTriangle, CheckCircle2, Circle, Syringe } from "lucide-react-native";
import React from "react";
import { Pressable, Text, View } from "react-native";

import type { VaccineStatus } from "../context/BabyContext";
import { formatDateShort } from "../utils/format";

/**
 * Sağlık Bakanlığı aşı takvimi listesi. Yaklaşan (14 gün içinde) ve süresi
 * geçmiş aşılar vurgulanır; her satır dokunularak "Yapıldı" işaretlenir.
 */
export default function VaccineCalendar({
  vaccines,
  onToggle,
}: {
  vaccines: VaccineStatus[];
  onToggle: (id: string) => void;
}) {
  return (
    <View>
      {vaccines.map((v) => {
        const tone = v.done
          ? "done"
          : v.overdue
            ? "overdue"
            : v.upcoming
              ? "upcoming"
              : "planned";
        const meta = TONE_META[tone];
        return (
          <Pressable
            key={v.id}
            onPress={() => onToggle(v.id)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: v.done }}
            className={`mb-2 flex-row items-center rounded-2xl border px-3 py-3 ${meta.container}`}
          >
            <View className={`mr-3 h-9 w-9 items-center justify-center rounded-full ${meta.iconBg}`}>
              <meta.Icon size={18} color={meta.iconColor} />
            </View>
            <View className="flex-1 pr-2">
              <Text className="text-sm font-semibold text-ink">
                {v.name}
              </Text>
              <Text className="mt-0.5 text-[11px] text-muted">
                {v.dose} · {formatDateShort(v.dueDate)}
              </Text>
            </View>
            <View className={`rounded-full px-2.5 py-1 ${meta.badgeBg}`}>
              <Text className={`text-[10px] font-semibold ${meta.badgeText}`}>
                {meta.label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const TONE_META = {
  done: {
    Icon: CheckCircle2,
    iconColor: "#006644",
    iconBg: "bg-brand-light",
    container: "border-brand-light bg-white",
    badgeBg: "bg-brand-light",
    badgeText: "text-brand-dark",
    label: "Yapıldı",
  },
  overdue: {
    Icon: AlertTriangle,
    iconColor: "#dc2626",
    iconBg: "bg-danger/10",
    container: "border-danger bg-danger/5",
    badgeBg: "bg-danger/10",
    badgeText: "text-danger",
    label: "Gecikti",
  },
  upcoming: {
    Icon: Syringe,
    iconColor: "#0369a1",
    iconBg: "bg-blue-light",
    container: "border-blue bg-blue-light/40",
    badgeBg: "bg-blue-light",
    badgeText: "text-blue-dark",
    label: "Yaklaşıyor",
  },
  planned: {
    Icon: Circle,
    iconColor: "#6b7280",
    iconBg: "bg-surface",
    container: "border-line bg-white",
    badgeBg: "bg-surface",
    badgeText: "text-muted",
    label: "Planlandı",
  },
} as const;
