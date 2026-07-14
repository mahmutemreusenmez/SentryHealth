import type { PulseSample } from "../data/types";

/**
 * SentryPulse — Giyilebilir cihaz (Apple HealthKit / Google Fit) simülasyon
 * katmanı.
 *
 * Gerçek bir dağıtımda burada HealthKit/Google Fit köprüsü üzerinden izin
 * istenip canlı vital verisi çekilir. Bu simülasyon katmanı, donanım
 * bulunmayan ortamlarda (Expo Go / web / test) gerçekçi bir canlı akış üretir:
 * nabız, SpO2 ve kümülatif adım verisini periyodik olarak yayınlar.
 */

/** Kritik nabız eşikleri — bu sınırlar aşılınca "Kritik Vital Uyarısı" tetiklenir. */
export const PULSE_LIMITS = {
  highHeartRate: 140,
  lowHeartRate: 45,
} as const;

export function isCriticalHeartRate(bpm: number): boolean {
  return bpm >= PULSE_LIMITS.highHeartRate || bpm <= PULSE_LIMITS.lowHeartRate;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** İzin isteğini simüle eder (gerçek cihazda HealthKit/Google Fit izni). */
export async function requestWearablePermission(): Promise<boolean> {
  await new Promise((resolve) => setTimeout(resolve, 900));
  return true;
}

interface PulseStreamOptions {
  /** Belirli bir örnekte kritik nabız enjekte etmek için (jüri demo tetikleyici). */
  spikeNext?: boolean;
}

/**
 * Canlı vital akışını başlatır. Her `intervalMs`'de bir yeni örnek üretip
 * `onSample` çağırır. Döndürülen fonksiyon akışı durdurur (kaynak temizliği).
 */
export function startPulseStream(
  onSample: (sample: PulseSample) => void,
  intervalMs = 2000,
): { stop: () => void; triggerSpike: () => void } {
  let heartRate = 78;
  let spo2 = 97;
  let steps = 4200;
  const options: PulseStreamOptions = {};

  const emit = () => {
    if (options.spikeNext) {
      heartRate = 148;
      options.spikeNext = false;
    } else {
      heartRate = clamp(heartRate + Math.round((Math.random() - 0.5) * 8), 58, 112);
    }
    spo2 = clamp(spo2 + Math.round((Math.random() - 0.5) * 2), 93, 100);
    steps += Math.round(Math.random() * 40);
    onSample({ heartRate, spo2, steps, at: Date.now() });
  };

  emit();
  const timer = setInterval(emit, intervalMs);

  return {
    stop: () => clearInterval(timer),
    triggerSpike: () => {
      options.spikeNext = true;
    },
  };
}
