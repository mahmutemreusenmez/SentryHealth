import type { LucideIcon } from "lucide-react-native";
import { CheckCircle2 } from "lucide-react-native";
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
      className={`rounded-2xl border border-line bg-white p-4 shadow-sm ${className}`}
    >
      {children}
    </View>
  );
}

export function SectionHeader({
  title,
  subtitle,
  icon: Icon,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
}) {
  return (
    <View className="mb-3 flex-row items-center">
      {Icon ? (
        <View className="mr-2 h-9 w-9 items-center justify-center rounded-full bg-brand-light">
          <Icon size={18} color="#059669" />
        </View>
      ) : null}
      <View className="flex-1">
        <Text className="text-lg font-bold text-ink">{title}</Text>
        {subtitle ? (
          <Text className="text-xs text-muted">{subtitle}</Text>
        ) : null}
      </View>
    </View>
  );
}

const STATUS_STYLES: Record<
  ScreeningRecommendation["priority"],
  { bg: string; text: string }
> = {
  info: { bg: "bg-blue-light", text: "text-blue-dark" },
  warning: { bg: "bg-blue-light", text: "text-blue-dark" },
  critical: { bg: "bg-brand-light", text: "text-brand-dark" },
};

export function StatusBadge({
  recommendation,
}: {
  recommendation: ScreeningRecommendation;
}) {
  const style = STATUS_STYLES[recommendation.priority];
  return (
    <View className={`rounded-full px-2.5 py-1 ${style.bg}`}>
      <Text className={`text-[10px] font-semibold ${style.text}`}>
        {recommendation.status}
      </Text>
    </View>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <View className="items-center justify-center py-8">
      <CheckCircle2 size={32} color="#6b7280" />
      <Text className="mt-2 text-sm text-muted">{text}</Text>
    </View>
  );
}
