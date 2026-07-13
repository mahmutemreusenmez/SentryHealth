import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";

import type { ScreeningRecommendation } from "../data/types";

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View
      className={`rounded-2xl bg-white p-4 shadow-sm border border-gray-100 ${className}`}
    >
      {children}
    </View>
  );
}

export function SectionHeader({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View className="mb-3 flex-row items-center">
      {icon ? (
        <View className="mr-2 h-8 w-8 items-center justify-center rounded-full bg-brand-light">
          <Ionicons name={icon} size={18} color="#0a7c86" />
        </View>
      ) : null}
      <View>
        <Text className="text-lg font-bold text-ink">{title}</Text>
        {subtitle ? (
          <Text className="text-xs text-muted">{subtitle}</Text>
        ) : null}
      </View>
    </View>
  );
}

const PRIORITY_STYLES: Record<
  ScreeningRecommendation["priority"],
  { bg: string; text: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  info: { bg: "bg-brand-light", text: "text-brand-dark", icon: "information-circle" },
  warning: { bg: "bg-orange-50", text: "text-accent", icon: "alert-circle" },
  critical: { bg: "bg-red-50", text: "text-danger", icon: "warning" },
};

export function PriorityBadge({
  priority,
}: {
  priority: ScreeningRecommendation["priority"];
}) {
  const style = PRIORITY_STYLES[priority];
  const label =
    priority === "critical"
      ? "Öncelikli"
      : priority === "warning"
        ? "Önerilen"
        : "Bilgi";
  return (
    <View className={`flex-row items-center rounded-full px-2 py-1 ${style.bg}`}>
      <Ionicons name={style.icon} size={12} color={colorFor(priority)} />
      <Text className={`ml-1 text-[10px] font-semibold ${style.text}`}>
        {label}
      </Text>
    </View>
  );
}

function colorFor(priority: ScreeningRecommendation["priority"]): string {
  switch (priority) {
    case "critical":
      return "#d64545";
    case "warning":
      return "#f39200";
    default:
      return "#075e66";
  }
}

export function EmptyState({ text }: { text: string }) {
  return (
    <View className="items-center justify-center py-8">
      <Ionicons name="checkmark-done-circle-outline" size={32} color="#6b7280" />
      <Text className="mt-2 text-sm text-muted">{text}</Text>
    </View>
  );
}
