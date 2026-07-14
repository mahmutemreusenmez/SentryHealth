import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * AsyncStorage üzerine ince, tip güvenli bir sarmalayıcı.
 *
 * Native modül kullanılamıyorsa (nadiren) hatalar sessizce yutulur; uygulama
 * kalıcı veri olmadan da çalışmaya devam eder.
 */

/** Uygulama genelinde kullanılan kalıcı depolama anahtarları. */
export const STORAGE_KEYS = {
  auth: "@sentry/auth",
  profile: "@sentry/profile",
  tasks: "@sentry/tasks",
} as const;

export async function loadJSON<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function saveJSON<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Kalıcı yazma başarısız olsa bile uygulama bellek içi durumla devam eder.
  }
}

export async function removeKey(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // yok say
  }
}

/** Görev onay durumlarının aynı güne ait olup olmadığını belirlemek için tarih anahtarı. */
export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}
