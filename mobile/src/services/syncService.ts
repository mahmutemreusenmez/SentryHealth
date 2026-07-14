import NetInfo from "@react-native-community/netinfo";

import type { SyncQueueItem } from "../data/types";
import { STORAGE_KEYS, loadJSON, saveJSON } from "./storageService";

/**
 * Çevrimdışı-öncelikli (offline-first) senkronizasyon katmanı.
 *
 * İnternet yokken alınan görev onayları `expo-secure-store` içinde şifreli bir
 * kuyruğa yazılır; cihaz tekrar çevrimiçi olduğunda kuyruk arka planda boşaltılır
 * (gerçek dünyada bir backend'e POST edilir, burada güvenli yerel katman güncellenir).
 */

/** Kuyruktaki senkronize edilmemiş onayları güvenli hafızadan okur. */
export async function loadSyncQueue(): Promise<SyncQueueItem[]> {
  return (await loadJSON<SyncQueueItem[]>(STORAGE_KEYS.syncQueue)) ?? [];
}

/** Kuyruğu güvenli hafızaya yazar. */
export async function saveSyncQueue(items: SyncQueueItem[]): Promise<void> {
  await saveJSON<SyncQueueItem[]>(STORAGE_KEYS.syncQueue, items);
}

/** Yeni bir çevrimdışı onayı kuyruğa ekler ve güncel kuyruğu döndürür. */
export async function enqueueSyncItem(
  item: SyncQueueItem,
): Promise<SyncQueueItem[]> {
  const queue = await loadSyncQueue();
  const next = [...queue, item];
  await saveSyncQueue(next);
  return next;
}

/** Kuyruğu tamamen boşaltır (senkronizasyon tamamlandığında). */
export async function clearSyncQueue(): Promise<void> {
  await saveSyncQueue([]);
}

/** NetInfo durumundan sade bir "çevrimiçi mi?" değeri türetir. */
function isOnline(
  state: {
    isConnected: boolean | null;
    isInternetReachable: boolean | null;
  },
): boolean {
  // isConnected açıkça false ise çevrimdışı; null ise (bilinmiyor) çevrimiçi say.
  if (state.isConnected === false) return false;
  if (state.isInternetReachable === false) return false;
  return true;
}

/** Anlık bağlantı durumunu tek seferlik sorgular. */
export async function fetchConnectivity(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return isOnline(state);
}

/** Bağlantı değişimlerini dinler; aboneliği iptal eden fonksiyonu döndürür. */
export function subscribeConnectivity(
  callback: (online: boolean) => void,
): () => void {
  return NetInfo.addEventListener((state) => {
    callback(isOnline(state));
  });
}
