import React from "react";
import { WebView } from "react-native-webview";

import type { LiveVideoPanelProps } from "./LiveVideoPanel";

/**
 * Canlı görüntülü triyaj video paneli — **native (iOS/Android)** uygulama.
 *
 * Gerçek WebRTC oturumu için açık kaynak Jitsi Meet odası bir WebView içinde
 * yüklenir. WebView kamera/mikrofon izinlerini otomatik verir; bileşen
 * kaldırıldığında (görüşme bitince) WebView yıkılır ve donanım kaynakları
 * serbest bırakılır.
 */
export default function LiveVideoPanel({
  active,
  muted,
  roomId,
}: LiveVideoPanelProps) {
  if (!active) return null;

  const config = [
    `config.startWithAudioMuted=${muted ? "true" : "false"}`,
    "config.prejoinPageEnabled=false",
    "config.disableDeepLinking=true",
  ].join("&");
  const uri = `https://meet.jit.si/${roomId}#${config}`;

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
