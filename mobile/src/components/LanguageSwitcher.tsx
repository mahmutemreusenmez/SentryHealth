import { Globe } from "lucide-react-native";
import React from "react";
import { Pressable, Text, View } from "react-native";

import { useLocale } from "../i18n/LocaleContext";
import { LOCALES, LOCALE_LABEL } from "../i18n/translations";
import { COLORS } from "../theme/colors";

/**
 * TR / EN / AR dil seçici. Ekranın üst köşesine yerleştirilir; dokununca aktif
 * dil değişir ve tüm ekranlar (onay metinleri, MEWS uyarıları, triyaj adımları)
 * anında yeni dile geçer.
 */
export default function LanguageSwitcher({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { locale, setLocale } = useLocale();

  return (
    <View
      className="flex-row items-center rounded-xl border border-line bg-white"
      style={{ paddingHorizontal: 4, paddingVertical: 3 }}
      accessibilityRole="radiogroup"
      accessibilityLabel="Dil seçici"
    >
      {!compact ? (
        <Globe size={14} color={COLORS.muted} style={{ marginLeft: 4, marginRight: 2 }} />
      ) : null}
      {LOCALES.map((code) => {
        const active = code === locale;
        return (
          <Pressable
            key={code}
            onPress={() => setLocale(code)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Dil: ${LOCALE_LABEL[code]}`}
            hitSlop={6}
            className={`mx-0.5 rounded-lg px-2 py-1 ${active ? "bg-brand" : "bg-transparent"}`}
          >
            <Text
              className="text-[11px] font-bold"
              style={{ color: active ? COLORS.white : COLORS.muted }}
            >
              {LOCALE_LABEL[code]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
