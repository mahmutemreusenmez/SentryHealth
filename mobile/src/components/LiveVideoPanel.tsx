import React, { useEffect, useRef } from "react";

/**
 * Canlı görüntülü triyaj video paneli — **web / varsayılan** uygulama.
 *
 * Gerçek WebRTC: `navigator.mediaDevices.getUserMedia` ile kamera + mikrofon
 * izni istenir ve canlı yerel akış ekrana yansıtılır. Görüşme bittiğinde tüm
 * medya track'leri durdurularak donanım kaynakları (kamera/mikrofon) serbest
 * bırakılır. "Hekime bağlan" bağlantısı canlı bir Jitsi odasına açılır.
 */
export interface LiveVideoPanelProps {
  active: boolean;
  muted: boolean;
  /** Canlı oda anahtarı (ör. sentry-triage-mahmut-123). */
  roomId: string;
  /** İzin reddi / donanım hatası mesajı için geri çağrım. */
  onError?: (message: string) => void;
}

export default function LiveVideoPanel({
  active,
  muted,
  roomId,
  onError,
}: LiveVideoPanelProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Görüşme aktifken kamera/mikrofon izni al ve akışı bağla; bitince serbest bırak.
  useEffect(() => {
    let cancelled = false;

    const releaseStream = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
    };

    if (active) {
      const media = globalThis.navigator?.mediaDevices;
      if (!media?.getUserMedia) {
        onError?.("Bu tarayıcı/cihaz kamera erişimini desteklemiyor.");
      } else {
        media
          .getUserMedia({ video: true, audio: true })
          .then((stream) => {
            if (cancelled) {
              stream.getTracks().forEach((t) => t.stop());
              return;
            }
            streamRef.current = stream;
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              void videoRef.current.play().catch(() => undefined);
            }
          })
          .catch(() => {
            if (!cancelled) {
              onError?.("Kamera/mikrofon izni reddedildi veya cihaz bulunamadı.");
            }
          });
      }
    } else {
      releaseStream();
    }

    return () => {
      cancelled = true;
      releaseStream();
    };
  }, [active, onError]);

  // Mikrofon aç/kapa: ses track'ini etkinleştir/pasifleştir.
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }, [muted]);

  if (!active) return null;

  const roomUrl = `https://meet.jit.si/${roomId}`;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: 24,
        overflow: "hidden",
        backgroundColor: "#000",
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
      <a
        href={roomUrl}
        target="_blank"
        rel="noreferrer"
        style={{
          position: "absolute",
          bottom: 12,
          right: 12,
          backgroundColor: "#10b981",
          color: "#fff",
          fontSize: 11,
          fontWeight: 700,
          padding: "6px 10px",
          borderRadius: 8,
          textDecoration: "none",
        }}
      >
        Hekime Bağlan · {roomId}
      </a>
    </div>
  );
}
