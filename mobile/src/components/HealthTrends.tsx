import { LineChart } from "lucide-react-native";
import React, { useMemo } from "react";
import { Text, View } from "react-native";

import TrendChart, { type TrendSeries } from "./TrendChart";
import { useAccessibility } from "../context/AccessibilityContext";
import { BP_HISTORY } from "../data/mockData";
import type { VitalEntry } from "../data/types";
import { COLORS } from "../theme/colors";

/**
 * Anlık tansiyon ve şeker trendlerini gösteren SVG tabanlı çizelge bölümü.
 * Kayıtlı vital geçmişi 2+ ölçüm içeriyorsa gerçek veriden, yetersizse örnek
 * kronik tansiyon geçmişinden (BP_HISTORY) beslenir.
 */
export default function HealthTrends({ history }: { history: VitalEntry[] }) {
  const { surface, fontScale } = useAccessibility();

  const bp = useMemo(() => {
    if (history.length >= 2) {
      const recent = history.slice(-6);
      const series: TrendSeries[] = [
        {
          label: "Büyük (sistolik)",
          color: COLORS.edevlet,
          values: recent.map((v) => v.systolic),
        },
        {
          label: "Küçük (diyastolik)",
          color: COLORS.blue,
          values: recent.map((v) => v.diastolic),
        },
      ];
      return {
        series,
        labels: recent.map((_, i) => `#${history.length - recent.length + i + 1}`),
      };
    }
    // Yetersiz kayıt: örnek kronik tansiyon geçmişi (eskiden yeniye).
    const seed = [...BP_HISTORY].reverse();
    return {
      series: [
        {
          label: "Büyük (sistolik)",
          color: COLORS.edevlet,
          values: seed.map((r) => r.systolic),
        },
        {
          label: "Küçük (diyastolik)",
          color: COLORS.blue,
          values: seed.map((r) => r.diastolic),
        },
      ] as TrendSeries[],
      labels: seed.map((r) => r.label),
    };
  }, [history]);

  const glucose = useMemo(() => {
    const withGlucose = history.filter((v) => v.glucose > 0).slice(-6);
    if (withGlucose.length < 2) return null;
    return {
      series: [
        {
          label: "Kan Şekeri",
          color: COLORS.brandDark,
          values: withGlucose.map((v) => v.glucose),
        },
      ] as TrendSeries[],
      labels: withGlucose.map(
        (_, i) => `#${history.length - withGlucose.length + i + 1}`,
      ),
    };
  }, [history]);

  return (
    <View
      className="rounded-2xl border p-4"
      style={{ backgroundColor: surface.card, borderColor: surface.border }}
    >
      <View className="mb-2 flex-row items-center">
        <LineChart size={16} color={COLORS.brandDark} />
        <Text
          className="ml-2 text-sm font-bold"
          style={{ color: surface.ink, fontSize: 14 * fontScale }}
        >
          Tansiyon Trendi (mmHg)
        </Text>
      </View>
      <TrendChart
        series={bp.series}
        labels={bp.labels}
        unit="mmHg"
        textColor={surface.muted}
        gridColor={surface.border}
      />

      {glucose ? (
        <View className="mt-4 border-t pt-3" style={{ borderColor: surface.border }}>
          <View className="mb-2 flex-row items-center">
            <LineChart size={16} color={COLORS.brandDark} />
            <Text
              className="ml-2 text-sm font-bold"
              style={{ color: surface.ink, fontSize: 14 * fontScale }}
            >
              Kan Şekeri Trendi (mg/dL)
            </Text>
          </View>
          <TrendChart
            series={glucose.series}
            labels={glucose.labels}
            unit="mg/dL"
            textColor={surface.muted}
            gridColor={surface.border}
          />
        </View>
      ) : null}
    </View>
  );
}
