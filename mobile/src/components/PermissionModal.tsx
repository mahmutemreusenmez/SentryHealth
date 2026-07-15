import { Camera, Mic, ShieldCheck, X } from "lucide-react-native";
import React from "react";
import { Modal, Text, View } from "react-native";

import { PressableScale } from "./ui";

/**
 * Kamera/mikrofon izni verilmediğinde uygulamayı çökertmeden gösterilen,
 * e-Nabız yeşili kurumsal kimliğinde şık izin talep modalı. Kullanıcı izni
 * tarayıcı/sistem tarafından reddettiyse "Tekrar Dene" ile yeniden istenebilir
 * ya da görüşme sesli/metadata modunda sürdürülebilir.
 */
export default function PermissionModal({
  visible,
  onRetry,
  onClose,
}: {
  visible: boolean;
  onRetry: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 items-center justify-center bg-black/50 px-6">
        <View className="w-full max-w-sm overflow-hidden rounded-3xl bg-white">
          {/* e-Nabız yeşili başlık */}
          <View className="items-center bg-brand px-6 pb-5 pt-6">
            <View className="h-16 w-16 items-center justify-center rounded-2xl bg-white/20">
              <ShieldCheck size={32} color="#ffffff" />
            </View>
            <Text className="mt-3 text-lg font-bold text-white">
              Kamera ve Mikrofon İzni
            </Text>
            <Text className="mt-1 text-center text-xs leading-5 text-white/85">
              Hekim/ebe ile görüntülü görüşme için kamera ve mikrofon erişimi
              gerekir. İzin vermek güvenlidir ve yalnızca görüşme sırasında
              kullanılır.
            </Text>
          </View>

          <View className="px-6 py-5">
            <View className="mb-4 flex-row">
              <View className="mr-3 flex-1 flex-row items-center rounded-2xl bg-brand-light px-3 py-3">
                <Camera size={18} color="#059669" />
                <Text className="ml-2 text-xs font-semibold text-brand-dark">
                  Kamera
                </Text>
              </View>
              <View className="flex-1 flex-row items-center rounded-2xl bg-brand-light px-3 py-3">
                <Mic size={18} color="#059669" />
                <Text className="ml-2 text-xs font-semibold text-brand-dark">
                  Mikrofon
                </Text>
              </View>
            </View>

            <PressableScale
              onPress={onRetry}
              accessibilityRole="button"
              accessibilityLabel="Kamera ve mikrofon iznini tekrar iste"
              className="mb-2 items-center rounded-2xl bg-brand py-4 shadow-sm"
            >
              <Text className="text-sm font-bold text-white">
                İzin Ver ve Tekrar Dene
              </Text>
            </PressableScale>

            <PressableScale
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="İzinsiz devam et"
              className="flex-row items-center justify-center rounded-2xl border border-line bg-white py-3"
            >
              <X size={15} color="#6b7280" />
              <Text className="ml-2 text-xs font-semibold text-muted">
                Sesli / metadata modunda devam et
              </Text>
            </PressableScale>
          </View>
        </View>
      </View>
    </Modal>
  );
}
