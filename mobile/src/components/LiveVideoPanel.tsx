import React, { useEffect, useRef, useState } from "react";

import { RTC_ICE_SERVERS, getSignalWsUrl } from "../services/rtcConfig";

/**
 * Canlı görüntülü triyaj video paneli — **web / varsayılan** uygulama.
 *
 * Gerçek WebRTC: `navigator.mediaDevices.getUserMedia` ile kamera + mikrofon
 * izni istenir ve SentryHealth web sitesindeki WebSocket sinyal sunucusuna
 * (`/rtc`) bağlanılır. Odadaki hekim/ebe eşiyle SDP/ICE değişimi yapılıp uzak
 * akış ekrana yansıtılır. Kamera olmasa bile (VM/izin reddi) bir veri kanalı
 * ile P2P bağlantı kurulur ve canlı vital metadata karşı tarafa aktarılır.
 * Görüşme bitince tüm medya track'leri durdurulur, PeerConnection ve WebSocket
 * kapatılarak donanım kaynakları serbest bırakılır.
 */
export interface IncomingReferral {
  level: string;
  code: string;
  title: string;
  message: string;
}

export interface LiveVideoPanelProps {
  active: boolean;
  muted: boolean;
  /** Canlı oda anahtarı (ör. sentry-triage-mahmut-123). */
  roomId: string;
  /** Bu eşin rolü (ör. "patient" | "mother"). */
  role?: string;
  /** Karşı tarafın (hekim/ebe) ekranına aktarılacak canlı vital metadata. */
  metadata?: string;
  /** İzin reddi / donanım / sinyal hatası mesajı için geri çağrım. */
  onError?: (message: string) => void;
  /** Bağlantı durumu güncellemeleri (ör. "Hekime bağlanıldı"). */
  onStatus?: (message: string) => void;
  /** Hekim/ebe panelinden gelen canlı sevk kararı. */
  onReferral?: (referral: IncomingReferral) => void;
}

interface SignalMessage {
  type: string;
  from?: string;
  id?: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  peers?: { id: string; role: string; name: string }[];
  text?: string;
  referral?: IncomingReferral;
}

export default function LiveVideoPanel({
  active,
  muted,
  roomId,
  role = "patient",
  metadata,
  onError,
  onStatus,
  onReferral,
}: LiveVideoPanelProps) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const peerIdRef = useRef<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setPermissionDenied(false);
    const localEl = localVideoRef.current;
    const remoteEl = remoteVideoRef.current;

    const send = (obj: Record<string, unknown>) => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
    };

    const sendMeta = () => {
      if (!metadata) return;
      const payload = { type: "meta", text: metadata, to: peerIdRef.current ?? undefined };
      send(payload);
      const dc = dcRef.current;
      if (dc && dc.readyState === "open") {
        dc.send(JSON.stringify({ type: "meta", text: metadata }));
      }
    };

    const ensurePc = (): RTCPeerConnection => {
      if (pcRef.current) return pcRef.current;
      const pc = new RTCPeerConnection({ iceServers: RTC_ICE_SERVERS });
      const stream = streamRef.current;
      if (stream) stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      pc.ontrack = (e) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = e.streams[0];
          void remoteVideoRef.current.play().catch(() => undefined);
        }
      };
      pc.onicecandidate = (e) => {
        if (e.candidate) send({ type: "candidate", candidate: e.candidate, to: peerIdRef.current ?? undefined });
      };
      pc.onconnectionstatechange = () => {
        if (cancelled) return;
        if (pc.connectionState === "connected") {
          setConnected(true);
          onStatus?.("Hekim/ebe ile canlı bağlantı kuruldu");
          sendMeta();
        } else if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          setConnected(false);
          onStatus?.("Bağlantı koptu");
        }
      };
      pc.ondatachannel = (e) => bindDataChannel(e.channel);
      pcRef.current = pc;
      return pc;
    };

    const bindDataChannel = (channel: RTCDataChannel) => {
      dcRef.current = channel;
      channel.onopen = () => sendMeta();
      channel.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data as string) as SignalMessage;
          if (data.type === "referral" && data.referral) onReferral?.(data.referral);
        } catch {
          /* ignore */
        }
      };
    };

    const makeOffer = async () => {
      const pc = ensurePc();
      const channel = pc.createDataChannel("sentry-meta");
      bindDataChannel(channel);
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await pc.setLocalDescription(offer);
      send({ type: "offer", sdp: pc.localDescription ?? offer, to: peerIdRef.current ?? undefined });
    };

    const handleOffer = async (msg: SignalMessage) => {
      peerIdRef.current = msg.from ?? null;
      const pc = ensurePc();
      if (msg.sdp) await pc.setRemoteDescription(msg.sdp);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      send({ type: "answer", sdp: pc.localDescription ?? answer, to: peerIdRef.current ?? undefined });
      sendMeta();
    };

    const openSignaling = () => {
      let ws: WebSocket;
      try {
        ws = new WebSocket(getSignalWsUrl());
      } catch {
        onError?.("Sinyal sunucusuna bağlanılamadı: " + getSignalWsUrl());
        return;
      }
      wsRef.current = ws;
      ws.onopen = () => {
        onStatus?.("Sinyal sunucusuna bağlanıldı — hekim/ebe bekleniyor");
        send({ type: "join", room: roomId, role, name: role === "mother" ? "Anne" : "Hasta" });
      };
      ws.onerror = () => onError?.("Sinyal sunucusuna bağlanılamadı: " + getSignalWsUrl());
      ws.onmessage = async (ev) => {
        let msg: SignalMessage;
        try {
          msg = JSON.parse(ev.data as string) as SignalMessage;
        } catch {
          return;
        }
        if (msg.type === "joined") {
          if (msg.peers && msg.peers.length) {
            peerIdRef.current = msg.peers[0].id;
            await makeOffer();
          }
        } else if (msg.type === "peer-joined") {
          peerIdRef.current = msg.id ?? null;
          onStatus?.("Hekim/ebe katıldı — bağlantı kuruluyor");
        } else if (msg.type === "offer") {
          await handleOffer(msg);
        } else if (msg.type === "answer") {
          if (pcRef.current && msg.sdp) await pcRef.current.setRemoteDescription(msg.sdp);
        } else if (msg.type === "candidate") {
          if (pcRef.current && msg.candidate) {
            try {
              await pcRef.current.addIceCandidate(msg.candidate);
            } catch {
              /* ignore */
            }
          }
        } else if (msg.type === "referral" && msg.referral) {
          onReferral?.(msg.referral);
        } else if (msg.type === "peer-left") {
          setConnected(false);
          onStatus?.("Karşı taraf ayrıldı");
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        }
      };
    };

    const media = globalThis.navigator?.mediaDevices;
    const begin = async () => {
      if (media?.getUserMedia) {
        try {
          const stream = await media.getUserMedia({ video: true, audio: true });
          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          streamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
            void localVideoRef.current.play().catch(() => undefined);
          }
        } catch {
          if (!cancelled) {
            // Kamera yoksa alıcı (receive-only) modda sinyalleşmeye devam et.
            setPermissionDenied(true);
            onError?.("Kamera/mikrofon izni reddedildi veya cihaz bulunamadı.");
          }
        }
      } else {
        onError?.("Bu tarayıcı/cihaz kamera erişimini desteklemiyor.");
      }
      if (!cancelled) openSignaling();
    };

    void begin();

    return () => {
      cancelled = true;
      setConnected(false);
      if (dcRef.current) {
        try {
          dcRef.current.close();
        } catch {
          /* ignore */
        }
        dcRef.current = null;
      }
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      if (wsRef.current) {
        try {
          if (wsRef.current.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify({ type: "bye" }));
        } catch {
          /* ignore */
        }
        wsRef.current.close();
        wsRef.current = null;
      }
      peerIdRef.current = null;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (localEl) localEl.srcObject = null;
      if (remoteEl) remoteEl.srcObject = null;
    };
  }, [active, roomId, role, metadata, onError, onStatus, onReferral]);

  // Mikrofon aç/kapa: ses track'ini etkinleştir/pasifleştir.
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }, [muted]);

  if (!active) return null;

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
        ref={remoteVideoRef}
        autoPlay
        playsInline
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: "absolute",
          bottom: 12,
          left: 12,
          width: 96,
          height: 72,
          objectFit: "cover",
          borderRadius: 10,
          border: "2px solid rgba(255,255,255,0.6)",
          backgroundColor: "#111",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          backgroundColor: connected ? "#10b981" : "rgba(0,0,0,0.55)",
          color: "#fff",
          fontSize: 11,
          fontWeight: 700,
          padding: "6px 10px",
          borderRadius: 999,
        }}
      >
        {connected ? "CANLI · P2P bağlı" : "Bağlanıyor…"}
      </div>

      {/* Bağlanılıyor: donuk kare yerine dalgalı nabız animasyonu */}
      {!connected ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            background:
              "radial-gradient(circle at center, rgba(16,185,129,0.18), rgba(0,0,0,0.55))",
          }}
        >
          <style>
            {`@keyframes sentryPulse{0%{transform:scale(0.72);opacity:0.85}70%{transform:scale(1.9);opacity:0}100%{opacity:0}}
              @keyframes sentryDots{0%,80%,100%{opacity:0.3}40%{opacity:1}}`}
          </style>
          <div
            style={{
              position: "relative",
              width: 84,
              height: 84,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {[0, 0.5, 1].map((delay) => (
              <span
                key={delay}
                style={{
                  position: "absolute",
                  width: 84,
                  height: 84,
                  borderRadius: 999,
                  border: "2px solid rgba(16,185,129,0.7)",
                  animation: `sentryPulse 1.8s ease-out ${delay}s infinite`,
                }}
              />
            ))}
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 999,
                backgroundColor: "#10b981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 24px rgba(16,185,129,0.6)",
              }}
            >
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 12h4l2 5 4-14 2 9h6" />
              </svg>
            </div>
          </div>
          <div
            style={{
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 0.2,
            }}
          >
            {permissionDenied
              ? "Kamerasız bağlanılıyor…"
              : role === "mother"
                ? "Ebe / hemşireye bağlanılıyor…"
                : "Hekime bağlanılıyor…"}
            {[".", ".", "."].map((dot, i) => (
              <span
                key={i}
                style={{
                  animation: `sentryDots 1.4s ${i * 0.2}s infinite`,
                }}
              >
                {dot}
              </span>
            ))}
          </div>
          {permissionDenied ? (
            <div
              style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: 11,
                maxWidth: 260,
                textAlign: "center",
                lineHeight: 1.5,
              }}
            >
              Kamera/mikrofon bulunamadı; görüşme sesli ve canlı metadata
              modunda sürüyor.
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
