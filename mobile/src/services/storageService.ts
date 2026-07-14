import { Platform } from "react-native";

/**
 * KVKK uyumlu güvenli, şifreli depolama katmanı.
 *
 * - **Native (iOS/Android):** `expo-secure-store` üzerinden veriler cihazın
 *   donanımsal güvenlik katmanında (iOS Keychain / Android Keystore, AES-256)
 *   şifreli olarak saklanır.
 * - **Web:** Donanımsal güvenli bölge bulunmadığından, hassas veriler Web Crypto
 *   API (`crypto.subtle`) ile **AES-256-GCM** algoritmasıyla şifrelenip
 *   `localStorage`'a yazılır. Şifreleme anahtarı cihaza özel üretilir.
 *
 * Tüm state güncellemeleri bu güvenli katmandan okunur/yazılır; ham (şifresiz)
 * hassas sağlık verisi hiçbir zaman düz metin olarak kalıcılaştırılmaz.
 */

/**
 * Uygulama genelinde kullanılan güvenli depolama anahtarları.
 * `expo-secure-store` yalnızca `[A-Za-z0-9._-]` karakterlerine izin verdiğinden
 * anahtarlar bu kümeye uygun tutulur.
 */
export const STORAGE_KEYS = {
  auth: "sentry_auth",
  profile: "sentry_profile",
  tasks: "sentry_tasks",
  vitals: "sentry_vitals",
  syncQueue: "sentry_sync_queue",
  medicationStock: "sentry_med_stock",
  baby: "sentry_baby",
} as const;

/** Web AES anahtar materyalinin saklandığı localStorage anahtarı (yalnızca web). */
const WEB_MASTER_KEY = "sentry.__mk";

type SecureStoreModule = typeof import("expo-secure-store");

let secureStore: SecureStoreModule | null = null;
if (Platform.OS !== "web") {
  // Native platformlarda donanımsal şifreli depolamayı yükle.
  secureStore = require("expo-secure-store") as SecureStoreModule;
}

const isWeb = Platform.OS === "web";

/* ------------------------------------------------------------------ */
/* Web AES-256-GCM yardımcıları                                        */
/* ------------------------------------------------------------------ */

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return globalThis.btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = globalThis.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

let cachedWebKey: CryptoKey | null = null;

/** Cihaza özel AES-256 anahtarını üretir veya localStorage'dan geri yükler. */
async function getWebKey(): Promise<CryptoKey> {
  if (cachedWebKey) return cachedWebKey;
  const subtle = globalThis.crypto.subtle;
  const stored = globalThis.localStorage.getItem(WEB_MASTER_KEY);
  if (stored) {
    cachedWebKey = await subtle.importKey(
      "raw",
      fromBase64(stored),
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
    return cachedWebKey;
  }
  const key = await subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
  const raw = new Uint8Array(await subtle.exportKey("raw", key));
  globalThis.localStorage.setItem(WEB_MASTER_KEY, toBase64(raw));
  cachedWebKey = key;
  return key;
}

async function webEncrypt(plaintext: string): Promise<string> {
  const subtle = globalThis.crypto.subtle;
  const key = await getWebKey();
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(plaintext);
  const cipher = new Uint8Array(
    await subtle.encrypt({ name: "AES-GCM", iv }, key, data),
  );
  return `${toBase64(iv)}.${toBase64(cipher)}`;
}

async function webDecrypt(payload: string): Promise<string | null> {
  const [ivPart, cipherPart] = payload.split(".");
  if (!ivPart || !cipherPart) return null;
  const subtle = globalThis.crypto.subtle;
  const key = await getWebKey();
  const plain = await subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(ivPart) },
    key,
    fromBase64(cipherPart),
  );
  return new TextDecoder().decode(plain);
}

/* ------------------------------------------------------------------ */
/* Platform-agnostik ham okuma/yazma                                   */
/* ------------------------------------------------------------------ */

async function readRaw(key: string): Promise<string | null> {
  if (isWeb) {
    const stored = globalThis.localStorage.getItem(key);
    if (stored == null) return null;
    return webDecrypt(stored);
  }
  return secureStore ? secureStore.getItemAsync(key) : null;
}

async function writeRaw(key: string, value: string): Promise<void> {
  if (isWeb) {
    const encrypted = await webEncrypt(value);
    globalThis.localStorage.setItem(key, encrypted);
    return;
  }
  if (secureStore) await secureStore.setItemAsync(key, value);
}

async function deleteRaw(key: string): Promise<void> {
  if (isWeb) {
    globalThis.localStorage.removeItem(key);
    return;
  }
  if (secureStore) await secureStore.deleteItemAsync(key);
}

/* ------------------------------------------------------------------ */
/* Tip güvenli JSON API                                                */
/* ------------------------------------------------------------------ */

export async function loadJSON<T>(key: string): Promise<T | null> {
  try {
    const raw = await readRaw(key);
    if (raw == null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function saveJSON<T>(key: string, value: T): Promise<void> {
  try {
    await writeRaw(key, JSON.stringify(value));
  } catch {
    // Güvenli yazma başarısız olsa bile uygulama bellek içi durumla devam eder.
  }
}

export async function removeKey(key: string): Promise<void> {
  try {
    await deleteRaw(key);
  } catch {
    // yok say
  }
}

/** Görev onay durumlarının aynı güne ait olup olmadığını belirlemek için tarih anahtarı. */
export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}
