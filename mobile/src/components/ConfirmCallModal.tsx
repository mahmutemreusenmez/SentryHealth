import { PhoneCall, ShieldCheck, X } from "lucide-react-native";
import React from "react";
import { Modal, Text, View } from "react-native";

import { useLocale } from "../i18n/LocaleContext";
import { PressableScale } from "./ui";

/**
 * Yanlış basmayı önleyen çift aşamalı arama onay modalı.
 *
 * Canlı triyaj ("Görüntülü Triyaj Başlat") ve yeni doğan ebe/hemşire
 * ("Ebe/Hemşireye Bağlan") akışlarında, arama başlatılmadan **önce** açılır.
 * Kullanıcı onaylayana kadar hiçbir WebRTC/WebSocket sinyali gönderilmez.
 * Tüm metinler aktif dile (TR/EN/AR) göre dinamik olarak çevrilir.
 */
export default function ConfirmCallModal({
  visible,
  title,
  message,
  acceptLabel,
  onAccept,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  acceptLabel: string;
  onAccept: () => void;
  onCancel: () => void;
}) {
  const { t, dir } = useLocale();
  const rtl = dir === "rtl";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View className="flex-1 items-center justify-center bg-black/50 px-6">
        <View
          className="w-full max-w-sm overflow-hidden rounded-3xl bg-white"
          style={{ direction: rtl ? "rtl" : "ltr" }}
        >
          <View className="items-center bg-brand px-6 pb-5 pt-6">
            <View className="h-16 w-16 items-center justify-center rounded-2xl bg-white/20">
              <ShieldCheck size={32} color="#ffffff" />
            </View>
            <Text className="mt-3 text-center text-lg font-bold text-white">
              {title}
            </Text>
          </View>

          <View className="px-6 py-5">
            <Text
              className="mb-5 text-center text-sm leading-6 text-ink"
              style={{ writingDirection: rtl ? "rtl" : "ltr" }}
            >
              {message}
            </Text>

            <PressableScale
              onPress={onAccept}
              accessibilityRole="button"
              accessibilityLabel={acceptLabel}
              className="mb-2 flex-row items-center justify-center rounded-2xl bg-brand py-4 shadow-sm"
            >
              <PhoneCall size={17} color="#ffffff" />
              <Text className="ml-2 text-sm font-bold text-white">
                {acceptLabel}
              </Text>
            </PressableScale>

            <PressableScale
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel={t("common.cancel")}
              className="flex-row items-center justify-center rounded-2xl border border-line bg-white py-3"
            >
              <X size={15} color="#6b7280" />
              <Text className="ml-2 text-xs font-semibold text-muted">
                {t("common.cancel")}
              </Text>
            </PressableScale>
          </View>
        </View>
      </View>
    </Modal>
  );
}
