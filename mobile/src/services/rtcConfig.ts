/**
 * WebRTC sinyal (signaling) sunucusu yapılandırması.
 *
 * Canlı triyaj ve ebe/hemşire görüşmeleri, SentryHealth web sitesindeki
 * WebSocket sinyal sunucusuna (`/api/webrtc/signaling`) bağlanır. Adres ortam
 * değişkeniyle yapılandırılır; tanımlı değilse yerel geliştirme sunucusu
 * varsayılır.
 *
 *   EXPO_PUBLIC_SIGNAL_URL   -> ör. wss://sentryhealth.example.com/api/webrtc/signaling
 *   EXPO_PUBLIC_SIGNAL_HTTP  -> ör. https://sentryhealth.example.com
 *
 * HTTP adresi verilmezse WebSocket adresinden türetilir (native WebView
 * hekim/ebe görüşme sayfasını bu HTTP kökünden yükler).
 */

const DEFAULT_WS_URL = "ws://localhost:3000/api/webrtc/signaling";

/** Doktor/hemşire panelinin dinlediği ortak lobi odası. */
export const LOBBY_ROOM = "triage-lobby";

/** Canlı görüşme WebSocket sinyal adresini döndürür. */
export function getSignalWsUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_SIGNAL_URL;
  return explicit && explicit.length > 0 ? explicit : DEFAULT_WS_URL;
}

/** Web sitesinin HTTP kökünü döndürür (native görüşme sayfası için). */
export function getSignalHttpUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_SIGNAL_HTTP;
  if (explicit && explicit.length > 0) return explicit.replace(/\/$/, "");
  return getSignalWsUrl()
    .replace(/^wss/, "https")
    .replace(/^ws/, "http")
    .replace(/\/api\/webrtc\/signaling\/?$/, "")
    .replace(/\/rtc\/?$/, "");
}

/** Benzersiz bir çağrı odası anahtarı üretir (ör. call-k3f9a2). */
export function makeCallRoomId(): string {
  return `call-${Math.random().toString(36).slice(2, 8)}${Date.now()
    .toString(36)
    .slice(-4)}`;
}

/** STUN sunucuları (P2P bağlantı için genel STUN — doktor paneliyle uyumlu). */
export const RTC_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:global.stun.twilio.com:3478" },
];
