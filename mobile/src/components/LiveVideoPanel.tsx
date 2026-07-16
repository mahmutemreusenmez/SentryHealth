import React, { useEffect, useRef, useState } from "react";

import {
  LOBBY_ROOM,
  RTC_ICE_SERVERS,
  getSignalWsUrl,
} from "../services/rtcConfig";

/**
 * Canlı görüntülü triyaj video paneli — **web / varsayılan** uygulama.
 *
 * SentryHealth web sitesinin WebSocket sinyal sunucusuna
 * (`/api/webrtc/signaling`) bağlanır ve hekim/hemşire paneliyle aynı protokolü
 * konuşur:
 *
 *   1. Bağlanınca `triage-lobby` odasına katılır.
 *   2. "incoming-call" yayını (broadcast) ile hasta bilgisini panele duyurur.
 *   3. Panel aramayı kabul edince ("call-accepted") çağrı odasına geçilir.
 *   4. `signal` mesajlarıyla (SimplePeer uyumlu SDP/ICE) P2P görüşme kurulur.
 *
 * Kamera/mikrofon olmasa bile (VM veya izin reddi) sinyalleşme alıcı
 * (receive-only) modda sürer. Görüşme bitince tüm medya track'leri durdurulur,
 * PeerConnection ve WebSocket kapatılarak kaynaklar serbest bırakılır.
 */
export interface IncomingReferral {
  level: string;
  code: string;
  title: string;
  message: string;
}

export interface CallPatient {
  nationalId: string;
  name: string;
}

export interface LiveVideoPanelProps {
  active: boolean;
  muted: boolean;
  /** Bu görüşme için üretilen benzersiz çağrı odası (ör. call-abc123). */
  roomId: string;
  /**
   * Dinlenen lobi odası. Kronik triyaj için `triage-lobby` (varsayılan),
   * yeni doğan ebe/hemşire triyajı için `baby-triage-lobby`.
   */
  lobbyRoom?: string;
  /**
   * `caller` (varsayılan): hasta/anne — lobiye katılıp `incoming-call`
   * duyurur. `receiver`: hekim/ebe — doğrudan çağrı odasına katılıp
   * lobideki hastaya `call-accepted` gönderir.
   */
  mode?: "caller" | "receiver";
  /** Bu eşin rolü (ör. "patient" | "mother"). */
  role?: string;
  /** Hekim/hemşire paneline duyurulacak hasta kimliği. */
  patient?: CallPatient;
  /** Karşı tarafa (veri kanalı ile) aktarılacak canlı vital metadata. */
  metadata?: string;
  /** İzin reddi / donanım / sinyal hatası mesajı için geri çağrım. */
  onError?: (message: string) => void;
  /** Bağlantı durumu güncellemeleri (ör. "Hekime bağlanıldı"). */
  onStatus?: (message: string) => void;
  /** Karşı taraftan (veri kanalı) gelen canlı sevk kararı. */
  onReferral?: (referral: IncomingReferral) => void;
}

/** SimplePeer'ın gönderdiği sinyal yükü (SDP veya ICE adayı). */
interface PeerSignal {
  type?: string;
  sdp?: string;
  candidate?: RTCIceCandidateInit;
}

interface SignalMessage {
  type: string;
  peerId?: string;
  roomId?: string;
  peers?: string[];
  from?: string;
  data?: PeerSignal | { kind?: string; roomId?: string; referral?: IncomingReferral };
}

export default function LiveVideoPanel({
  active,
  muted,
  roomId,
  lobbyRoom = LOBBY_ROOM,
  mode = "caller",
  role = "patient",
  patient,
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
  const myPeerIdRef = useRef<string | null>(null);
  const remotePeerIdRef = useRef<string | null>(null);
  const inCallRoomRef = useRef(false);
  const [connected, setConnected] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setConnected(false);
    setPermissionDenied(false);
    inCallRoomRef.current = false;
    remotePeerIdRef.current = null;
    const localEl = localVideoRef.current;
    const remoteEl = remoteVideoRef.current;

    const send = (obj: Record<string, unknown>) => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
    };

    const sendMeta = () => {
      const dc = dcRef.current;
      if (metadata && dc && dc.readyState === "open") {
        dc.send(JSON.stringify({ type: "meta", text: metadata }));
      }
    };

    const bindDataChannel = (channel: RTCDataChannel) => {
      dcRef.current = channel;
      channel.onopen = () => sendMeta();
      channel.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data as string) as {
            type?: string;
            referral?: IncomingReferral;
          };
          if (data.type === "referral" && data.referral) {
            onReferral?.(data.referral);
          }
        } catch {
          /* yok say */
        }
      };
    };

    const startPeer = (remotePeerId: string, initiator: boolean) => {
      if (pcRef.current) return;
      remotePeerIdRef.current = remotePeerId;
      const pc = new RTCPeerConnection({ iceServers: RTC_ICE_SERVERS });
      pcRef.current = pc;

      const stream = streamRef.current;
      if (stream) stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      pc.ontrack = (e) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = e.streams[0];
          void remoteVideoRef.current.play().catch(() => undefined);
        }
      };

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          send({
            type: "signal",
            to: remotePeerId,
            data: {
              type: "candidate",
              candidate: {
                candidate: e.candidate.candidate,
                sdpMLineIndex: e.candidate.sdpMLineIndex,
                sdpMid: e.candidate.sdpMid,
              },
            },
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (cancelled) return;
        if (pc.connectionState === "connected") {
          setConnected(true);
          onStatus?.(
            role === "mother"
              ? "Ebe/hemşire ile canlı bağlantı kuruldu"
              : "Hekim ile canlı bağlantı kuruldu",
          );
          sendMeta();
        } else if (
          pc.connectionState === "failed" ||
          pc.connectionState === "disconnected"
        ) {
          setConnected(false);
          onStatus?.("Bağlantı koptu");
        }
      };

      pc.ondatachannel = (e) => bindDataChannel(e.channel);

      if (initiator) {
        bindDataChannel(pc.createDataChannel("sentry-meta"));
        void (async () => {
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          });
          await pc.setLocalDescription(offer);
          if (!cancelled) {
            send({ type: "signal", to: remotePeerId, data: pc.localDescription ?? offer });
          }
        })();
      }
    };

    const onRemoteSignal = async (from: string, data: PeerSignal) => {
      if (!pcRef.current) {
        // Karşı taraf başlatıcı: gelen offer ile eşi kur.
        startPeer(from, false);
      }
      const pc = pcRef.current;
      if (!pc) return;
      remotePeerIdRef.current = from;

      if (data.sdp && data.type) {
        await pc.setRemoteDescription({
          type: data.type as RTCSdpType,
          sdp: data.sdp,
        });
        if (data.type === "offer") {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          if (!cancelled) {
            send({ type: "signal", to: from, data: pc.localDescription ?? answer });
          }
        }
      } else if (data.candidate) {
        try {
          await pc.addIceCandidate(data.candidate);
        } catch {
          /* yok say */
        }
      }
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
        onStatus?.("Sinyal sunucusuna bağlanıldı");
        if (mode === "receiver") {
          // Hekim/ebe: doğrudan çağrı odasına katıl ve lobideki hastaya kabulü duyur.
          send({ type: "join", roomId });
          send({
            type: "broadcast",
            roomId: lobbyRoom,
            data: { kind: "call-accepted", roomId },
          });
        } else {
          send({ type: "join", roomId: lobbyRoom });
        }
      };
      ws.onerror = () =>
        onError?.("Sinyal sunucusuna bağlanılamadı: " + getSignalWsUrl());

      ws.onmessage = async (ev) => {
        let msg: SignalMessage;
        try {
          msg = JSON.parse(ev.data as string) as SignalMessage;
        } catch {
          return;
        }

        if (msg.type === "welcome") {
          myPeerIdRef.current = msg.peerId ?? null;
        } else if (msg.type === "joined") {
          if (msg.peerId) myPeerIdRef.current = msg.peerId;
          if (msg.roomId === lobbyRoom) {
            const callPatient =
              patient ?? { nationalId: "", name: role === "mother" ? "Anne" : "Hasta" };
            // Lobiye katıldık: hasta bilgisini panele duyur.
            send({
              type: "broadcast",
              roomId: lobbyRoom,
              data: {
                kind: "incoming-call",
                roomId,
                patient: callPatient,
              },
            });
            // Ek "patient-calling" push-bildirimi (broadcast ile taşınır):
            // hekim/ebe panelinde banner + haptic tetikler.
            send({
              type: "broadcast",
              roomId: lobbyRoom,
              data: {
                kind: "patient-calling",
                roomId,
                patient: callPatient,
                metadata: metadata ?? "",
              },
            });
            onStatus?.(
              role === "mother"
                ? "Nöbetçi ebe/hemşire aranıyor…"
                : "Nöbetçi hekim aranıyor…",
            );
          } else if (msg.roomId === roomId) {
            inCallRoomRef.current = true;
            const mine = myPeerIdRef.current ?? "";
            (msg.peers ?? []).forEach((peerId) =>
              startPeer(peerId, mine.localeCompare(peerId) < 0),
            );
          }
        } else if (msg.type === "broadcast") {
          const data = msg.data as { kind?: string; roomId?: string } | undefined;
          if (!data) return;
          if (data.kind === "call-accepted" && data.roomId === roomId) {
            onStatus?.("Arama kabul edildi — görüşmeye geçiliyor");
            send({ type: "join", roomId });
          } else if (data.kind === "call-rejected" && data.roomId === roomId) {
            onError?.("Arama şu an yanıtlanamadı. Lütfen daha sonra tekrar deneyin.");
            onStatus?.("Arama reddedildi");
          }
        } else if (msg.type === "peer-joined") {
          if (inCallRoomRef.current && msg.peerId) {
            const mine = myPeerIdRef.current ?? "";
            startPeer(msg.peerId, mine.localeCompare(msg.peerId) < 0);
          }
        } else if (msg.type === "signal") {
          if (msg.from && msg.data) await onRemoteSignal(msg.from, msg.data as PeerSignal);
        } else if (msg.type === "peer-left") {
          // Lobiden çağrı odasına geçen eşin ayrılışını görüşme bitişi sayma;
          // yalnızca çağrı odasındaki gerçek görüşme eşi ayrılırsa işle.
          if (inCallRoomRef.current && msg.peerId === remotePeerIdRef.current) {
            setConnected(false);
            onStatus?.("Karşı taraf ayrıldı");
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
          }
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
          /* yok say */
        }
        dcRef.current = null;
      }
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      myPeerIdRef.current = null;
      remotePeerIdRef.current = null;
      inCallRoomRef.current = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (localEl) localEl.srcObject = null;
      if (remoteEl) remoteEl.srcObject = null;
    };
  }, [active, roomId, lobbyRoom, mode, role, patient, metadata, onError, onStatus, onReferral]);

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
          backgroundColor: connected ? "#00875A" : "rgba(0,0,0,0.55)",
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
                backgroundColor: "#00875A",
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
