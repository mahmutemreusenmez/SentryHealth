import { useEffect, useRef, useState } from "react";

import { warningFeedback } from "./hapticsService";
import { BABY_LOBBY_ROOM, LOBBY_ROOM, getSignalWsUrl } from "./rtcConfig";

/**
 * SentryMD hekim/ebe paneli için gelen canlı triyaj çağrılarını dinleyen kanca.
 *
 * Kronik (`triage-lobby`) ve yeni doğan (`baby-triage-lobby`) lobilerine ayrı
 * WebSocket bağlantılarıyla katılır (sinyal sunucusu bir istemciyi aynı anda
 * yalnızca tek odada tuttuğundan her lobi için ayrı bağlantı gerekir). Hasta
 * `incoming-call` / `patient-calling` duyurusu yaptığında kuyruğa eklenir,
 * hafif dokunsal uyarı (haptic) tetiklenir ve panelde banner gösterilir.
 *
 * Web/native fark etmeksizin çökme güvenli çalışır: bağlantı kurulamazsa kuyruk
 * boş kalır, hata fırlatılmaz.
 */
export type CallLobby = "chronic" | "baby";

export interface IncomingCall {
  /** Görüşmenin kurulacağı benzersiz çağrı odası (call-...). */
  roomId: string;
  patient: { nationalId: string; name: string };
  /** Karşıdan gelen canlı vital metadata (varsa). */
  metadata: string;
  lobby: CallLobby;
  at: number;
}

interface BroadcastData {
  kind?: string;
  roomId?: string;
  patient?: { nationalId?: string; name?: string };
  metadata?: string;
}

const LOBBY_MAP: { room: string; lobby: CallLobby }[] = [
  { room: LOBBY_ROOM, lobby: "chronic" },
  { room: BABY_LOBBY_ROOM, lobby: "baby" },
];

export function useDoctorLobby(): {
  queue: IncomingCall[];
  connected: boolean;
  dismiss: (roomId: string) => void;
} {
  const [queue, setQueue] = useState<IncomingCall[]>([]);
  const [connected, setConnected] = useState(false);
  const socketsRef = useRef<WebSocket[]>([]);

  useEffect(() => {
    const sockets: WebSocket[] = [];
    let openCount = 0;

    const addCall = (call: IncomingCall) => {
      setQueue((prev) => {
        if (prev.some((c) => c.roomId === call.roomId)) return prev;
        warningFeedback();
        return [call, ...prev];
      });
    };

    LOBBY_MAP.forEach(({ room, lobby }) => {
      let ws: WebSocket;
      try {
        ws = new WebSocket(getSignalWsUrl());
      } catch {
        return;
      }
      sockets.push(ws);

      ws.onopen = () => {
        openCount += 1;
        setConnected(true);
        ws.send(JSON.stringify({ type: "join", roomId: room }));
      };

      ws.onclose = () => {
        openCount = Math.max(0, openCount - 1);
        if (openCount === 0) setConnected(false);
      };

      ws.onmessage = (ev) => {
        let msg: { type?: string; data?: BroadcastData };
        try {
          msg = JSON.parse(ev.data as string) as {
            type?: string;
            data?: BroadcastData;
          };
        } catch {
          return;
        }
        if (msg.type !== "broadcast" || !msg.data) return;
        const data = msg.data;
        if (
          (data.kind === "incoming-call" || data.kind === "patient-calling") &&
          data.roomId
        ) {
          addCall({
            roomId: data.roomId,
            patient: {
              nationalId: data.patient?.nationalId ?? "",
              name: data.patient?.name ?? (lobby === "baby" ? "Anne" : "Hasta"),
            },
            metadata: data.metadata ?? "",
            lobby,
            at: Date.now(),
          });
        }
      };
    });

    socketsRef.current = sockets;

    return () => {
      sockets.forEach((ws) => {
        try {
          ws.close();
        } catch {
          /* yok say */
        }
      });
      socketsRef.current = [];
    };
  }, []);

  const dismiss = (roomId: string) =>
    setQueue((prev) => prev.filter((c) => c.roomId !== roomId));

  return { queue, connected, dismiss };
}
