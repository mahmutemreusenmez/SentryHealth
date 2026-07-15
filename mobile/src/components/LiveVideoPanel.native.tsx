import React from "react";
import { WebView } from "react-native-webview";

import { getSignalHttpUrl } from "../services/rtcConfig";
import type { LiveVideoPanelProps } from "./LiveVideoPanel";

/**
 * Canlı görüntülü triyaj video paneli — **native (iOS/Android)** uygulama.
 *
 * Gerçek WebRTC oturumu, SentryHealth web sitesindeki canlı görüşme sayfası
 * (`/canli-gorusme.html`) bir WebView içinde yüklenerek kurulur. Sayfa aynı
 * WebSocket sinyal sunucusuna (`/rtc`) bağlanır; WebView kamera/mikrofon
 * izinlerini otomatik verir. Bileşen kaldırıldığında (görüşme bitince) WebView
 * yıkılır ve donanım kaynakları serbest bırakılır.
 */
export default function LiveVideoPanel({
  active,
  muted,
  roomId,
  role = "patient",
  metadata,
}: LiveVideoPanelProps) {
  if (!active) return null;

  const mode = role === "mother" ? "baby" : "triage";
  const query =
    `room=${encodeURIComponent(roomId)}` +
    `&role=${encodeURIComponent(role)}` +
    `&mode=${mode}` +
    (metadata ? `&meta=${encodeURIComponent(metadata)}` : "") +
    `&muted=${muted ? "1" : "0"}`;
  const uri = `${getSignalHttpUrl()}/canli-gorusme.html?${query}`;

  return (
    <WebView
      source={{ uri }}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 24,
        overflow: "hidden",
        backgroundColor: "#000",
      }}
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      mediaCapturePermissionGrantType="grant"
      javaScriptEnabled
      domStorageEnabled
    />
  );
}
