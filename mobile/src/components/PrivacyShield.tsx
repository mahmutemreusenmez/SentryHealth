import {
  Fingerprint,
  Lock,
  ShieldCheck,
  ShieldHalf,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import React from "react";
import { Modal, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PressableScale } from "./ui";
import { COLORS } from "../theme/colors";

/**
 * KVKK/GDPR "Güvenlik ve İzin Bilgilendirme" (Privacy Shield) ekranı.
 *
 * - `onboarding`: ilk açılışta tam ekran onay kapısı.
 * - `pretriage`: canlı görüşme (WebRTC/WebSocket) öncesi E2EE bilgilendirme
 *   modalı.
 */

interface PrivacyPoint {
  icon: LucideIcon;
  title: string;
  detail: string;
}

const POINTS: PrivacyPoint[] = [
  {
    icon: Lock,
    title: "AES-256 Şifreli Depolama",
    detail:
      "Tüm sağlık verileriniz cihazınızda AES-256 (native Keychain/Keystore, web'de AES-GCM) ile şifreli saklanır.",
  },
  {
    icon: ShieldHalf,
    title: "Uçtan Uca Şifreli Görüşme (E2EE)",
    detail:
      "Canlı triyaj görüşmeleri WebRTC (DTLS-SRTP) ile uçtan uca şifrelenir; ses/görüntü sunucuda çözülmeden hekime iletilir.",
  },
  {
    icon: Fingerprint,
    title: "KVKK / GDPR Uyumlu Pseudonimizasyon",
    detail:
      "T.C. Kimlik Numaranız kayıt ve aktarımda geri döndürülemez SHA-256 pseudonimizasyonu ile korunur, ham tutulmaz.",
  },
];

function ShieldBody({
  variant,
  onAccept,
  onDecline,
}: {
  variant: "onboarding" | "pretriage";
  onAccept: () => void;
  onDecline?: () => void;
}) {
  return (
    <ScrollView
      contentContainerStyle={{ padding: 20, paddingBottom: 28 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="items-center">
        <View className="h-16 w-16 items-center justify-center rounded-2xl bg-brand">
          <ShieldCheck size={32} color={COLORS.white} />
        </View>
        <Text className="mt-3 text-center text-xl font-bold text-ink">
          Güvenlik ve İzin Bilgilendirmesi
        </Text>
        <Text className="mt-1 text-center text-xs text-muted">
          {variant === "pretriage"
            ? "Görüşme başlamadan önce veri güvenliğiniz"
            : "Verileriniz KVKK ve GDPR protokollerine tam uyumlu işlenir"}
        </Text>
      </View>

      <View className="mt-5">
        {POINTS.map((point) => {
          const Icon = point.icon;
          return (
            <View
              key={point.title}
              className="mb-3 flex-row rounded-2xl border border-line bg-white p-4"
            >
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-brand-light">
                <Icon size={20} color={COLORS.brandDark} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-ink">
                  {point.title}
                </Text>
                <Text className="mt-0.5 text-[12px] leading-5 text-muted">
                  {point.detail}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      <View className="mt-1 rounded-2xl border border-brand bg-brand-light/60 p-4">
        <Text className="text-[11px] leading-5 text-brand-dark">
          Devam ederek, sağlık verilerinizin yalnızca triyaj ve klinik takip
          amacıyla, açık rızanız kapsamında işlenmesini onaylıyorsunuz. Rızanızı
          Profil ekranından dilediğiniz zaman geri çekebilirsiniz.
        </Text>
      </View>

      <PressableScale
        onPress={onAccept}
        accessibilityRole="button"
        accessibilityLabel="Güvenlik bilgilendirmesini onayla ve devam et"
        className="mt-5 flex-row items-center justify-center rounded-2xl bg-brand py-4"
      >
        <ShieldCheck size={18} color={COLORS.white} />
        <Text className="ml-2 text-base font-bold text-white">
          Okudum, Onaylıyorum
        </Text>
      </PressableScale>

      {onDecline ? (
        <PressableScale
          onPress={onDecline}
          accessibilityRole="button"
          className="mt-2 items-center py-3"
        >
          <Text className="text-sm font-semibold text-muted">Vazgeç</Text>
        </PressableScale>
      ) : null}
    </ScrollView>
  );
}

/** İlk açılış tam ekran onay kapısı. */
export function PrivacyShieldScreen({ onAccept }: { onAccept: () => void }) {
  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top", "bottom"]}>
      <ShieldBody variant="onboarding" onAccept={onAccept} />
    </SafeAreaView>
  );
}

/** Triyaj öncesi E2EE bilgilendirme modalı. */
export function PrivacyShieldModal({
  visible,
  onAccept,
  onDecline,
}: {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDecline}
    >
      <View className="flex-1 justify-end bg-black/50">
        <View
          className="rounded-t-3xl bg-surface"
          style={{ maxHeight: "88%" }}
        >
          <ShieldBody
            variant="pretriage"
            onAccept={onAccept}
            onDecline={onDecline}
          />
        </View>
      </View>
    </Modal>
  );
}
