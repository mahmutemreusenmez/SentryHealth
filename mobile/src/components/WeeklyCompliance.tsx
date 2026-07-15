import { Check, TrendingUp, X } from "lucide-react-native";
import React, { useMemo } from "react";
import { Text, View } from "react-native";

import type { DailyCompliance } from "../data/types";

/** Haftalık uyum yüzdesini (tamamlanan / değerlendirilen gün) hesaplar. */
export function computeComplianceScore(days: DailyCompliance[]): number {
  const evaluated = days.filter((d) => d.status !== "upcoming");
  if (evaluated.length === 0) return 100;
  const done = evaluated.filter((d) => d.status === "done").length;
  return Math.round((done / evaluated.length) * 100);
}

function scoreMessage(score: number): string {
  if (score >= 90) return "Harika gidiyorsunuz!";
  if (score >= 70) return "İyi gidiyorsunuz, devam edin.";
  if (score >= 50) return "Uyumunuzu artırmaya çalışın.";
  return "İlaçlarınızı düzenli almanız önemli.";
}

function DayCircle({ day }: { day: DailyCompliance }) {
  const { status, label } = day;
  const isDone = status === "done";
  const isMissed = status === "missed";
  const circleClass = isDone
    ? "bg-brand"
    : isMissed
      ? "bg-danger"
      : "border border-line bg-white";

  return (
    <View className="items-center">
      <View
        className={`h-9 w-9 items-center justify-center rounded-full ${circleClass}`}
      >
        {isDone ? (
          <Check size={16} color="#ffffff" />
        ) : isMissed ? (
          <X size={16} color="#ffffff" />
        ) : (
          <Text className="text-[11px] font-semibold text-muted">–</Text>
        )}
      </View>
      <Text className="mt-1 text-[10px] text-muted">{label}</Text>
    </View>
  );
}

/**
 * Dashboard'daki "Haftalık Uyum Çizelgesi" — Pzt-Paz dairesel ikonları ve
 * dinamik sağlık skor kartı. Gözü yormayan e-Nabız yeşili paleti kullanır.
 */
export default function WeeklyCompliance({
  days,
}: {
  days: DailyCompliance[];
}) {
  const score = useMemo(() => computeComplianceScore(days), [days]);

  return (
    <View className="rounded-2xl border border-line bg-white p-4 shadow-sm">
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TrendingUp size={16} color="#006644" />
          <Text className="ml-2 text-sm font-bold text-ink">
            Haftalık İlaç Uyum Skoru
          </Text>
        </View>
        <Text className="text-lg font-extrabold text-brand-dark">%{score}</Text>
      </View>

      <View className="flex-row justify-between">
        {days.map((day) => (
          <DayCircle key={day.label} day={day} />
        ))}
      </View>

      <View className="mt-3 rounded-xl bg-brand-light px-3 py-2">
        <Text className="text-xs font-medium text-brand-dark">
          Bu haftaki ilaç uyum skorunuz: %{score} — {scoreMessage(score)}
        </Text>
      </View>
    </View>
  );
}
