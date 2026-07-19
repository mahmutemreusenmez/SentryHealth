import { Activity, ChevronRight, ShieldAlert } from "lucide-react-native";
import React from "react";
import { Text, View } from "react-native";

import { PressableScale } from "./ui";
import { useAccessibility } from "../context/AccessibilityContext";
import { useLocale } from "../i18n/LocaleContext";
import type { MewsBand, MewsResult } from "../data/types";
import { COLORS, MEWS_BAND_COLOR } from "../theme/colors";

/**
 * Klinik Karar Destek Sistemi (CDSS) durum kartı.
 *
 * MEWS motorunun ürettiği risk bandına göre dinamik olarak Yeşil (stabil),
 * Sarı (gözlem) veya Kırmızı (acil triyaj) kartı gösterir; kırmızı/sarı
 * bandda hastayı Canlı Triyaj'a yönlendirir. Parametre bazlı puan dökümü
 * şeffaflık için listelenir.
 */

const BAND_KEY: Record<MewsBand, string> = {
  green: "green",
  yellow: "yellow",
  red: "red",
};

export default function MewsCard({
  result,
  hasData,
  onStartTriage,
}: {
  result: MewsResult | null;
  hasData: boolean;
  onStartTriage: () => void;
}) {
  const { surface, fontScale } = useAccessibility();
  const { t } = useLocale();

  if (!hasData || !result) {
    return (
      <View
        className="rounded-2xl border p-4"
        style={{ backgroundColor: surface.card, borderColor: surface.border }}
      >
        <View className="flex-row items-center">
          <Activity size={18} color={COLORS.muted} />
          <Text
            className="ml-2 text-sm font-bold"
            style={{ color: surface.ink, fontSize: 14 * fontScale }}
          >
            {t("dashboard.mewsTitle")}
          </Text>
        </View>
        <Text
          className="mt-1 text-xs"
          style={{ color: surface.muted, fontSize: 12 * fontScale }}
        >
          {t("mews.empty")}
        </Text>
      </View>
    );
  }

  const accent = MEWS_BAND_COLOR[result.band];

  return (
    <View
      className="overflow-hidden rounded-2xl border"
      style={{ borderColor: accent, backgroundColor: surface.card }}
    >
      {/* Renk bandı başlığı */}
      <View
        className="flex-row items-center px-4 py-3"
        style={{ backgroundColor: accent }}
      >
        <ShieldAlert size={20} color={COLORS.white} />
        <Text
          className="ml-2 flex-1 text-base font-bold text-white"
          style={{ fontSize: 16 * fontScale }}
        >
          {t(`mews.title.${BAND_KEY[result.band]}`)}
        </Text>
        <View className="rounded-full bg-white/25 px-3 py-1">
          <Text
            className="text-xs font-bold text-white"
            style={{ fontSize: 12 * fontScale }}
          >
            {t(`mews.band.${BAND_KEY[result.band]}`)} · Skor {result.total}
          </Text>
        </View>
      </View>

      <View className="p-4">
        <Text
          className="text-[13px] leading-5"
          style={{ color: surface.ink, fontSize: 13 * fontScale }}
        >
          {t(`mews.guidance.${BAND_KEY[result.band]}`)}
        </Text>

        {/* Parametre bazlı MEWS dökümü */}
        <View className="mt-3">
          {result.breakdown.map((p) => (
            <View
              key={p.label}
              className="flex-row items-center justify-between border-b py-1.5"
              style={{ borderColor: surface.border }}
            >
              <Text
                className="flex-1 text-xs"
                style={{ color: surface.muted, fontSize: 12 * fontScale }}
              >
                {p.label}
              </Text>
              <Text
                className="mr-3 text-xs font-medium"
                style={{ color: surface.ink, fontSize: 12 * fontScale }}
              >
                {p.display}
              </Text>
              <View
                className="h-6 w-6 items-center justify-center rounded-full"
                style={{
                  backgroundColor: p.points >= 2 ? accent : surface.border,
                }}
              >
                <Text
                  className="text-[11px] font-bold"
                  style={{ color: p.points >= 2 ? COLORS.white : surface.ink }}
                >
                  {p.points}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {result.triageAdvised ? (
          <PressableScale
            onPress={onStartTriage}
            accessibilityRole="button"
            accessibilityLabel={t("mews.startTriage")}
            className="mt-4 flex-row items-center justify-center rounded-xl py-3"
            style={{ backgroundColor: accent }}
          >
            <Text
              className="text-sm font-bold text-white"
              style={{ fontSize: 14 * fontScale }}
            >
              {t("mews.startTriage")}
            </Text>
            <ChevronRight size={16} color={COLORS.white} />
          </PressableScale>
        ) : null}
      </View>
    </View>
  );
}
