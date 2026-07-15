import { Platform } from "react-native";

/**
 * Hafif dokunsal geri bildirim (haptics) yardımcıları.
 *
 * `expo-haptics` yalnızca native (iOS/Android) cihazlarda titreşim üretir; web
 * veya native modülün bulunmadığı ortamlarda sessizce yok sayılır. Böylece
 * tıklanabilir alanlara güvenle çağrı eklenebilir.
 */
type HapticsModule = typeof import("expo-haptics");

let haptics: HapticsModule | null = null;
if (Platform.OS !== "web") {
  try {
    haptics = require("expo-haptics") as HapticsModule;
  } catch {
    haptics = null;
  }
}

/** Dokunma/seçim anında hafif geri bildirim. */
export function tapFeedback(): void {
  haptics?.selectionAsync().catch(() => undefined);
}

/** Başarılı işlem (giriş, onay) için bildirim geri bildirimi. */
export function successFeedback(): void {
  haptics
    ?.notificationAsync(haptics.NotificationFeedbackType.Success)
    .catch(() => undefined);
}

/** Kritik/uyarı işlemleri için daha belirgin geri bildirim. */
export function warningFeedback(): void {
  haptics
    ?.notificationAsync(haptics.NotificationFeedbackType.Warning)
    .catch(() => undefined);
}
