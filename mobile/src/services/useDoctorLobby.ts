import { useEffect, useState } from "react";

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

  useEffect(() => {
    // Aktif soketler ve bekleyen yeniden bağlanma zamanlayıcıları — unmount'ta
    // hepsi güvenle temizlenir (bağlantı kopma senkronizasyon sızıntısını önler).
    let cancelled = false;
    const sockets = new Set<WebSocket>();
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const openRooms = new Set<string>();

    const syncConnected = () => setConnected(openRooms.size > 0);

    const addCall = (call: IncomingCall) => {
      setQueue((prev) => {
        if (prev.some((c) => c.roomId === call.roomId)) return prev;
        warningFeedback();
        return [call, ...prev];
      });
    };

    const connect = (room: string, lobby: CallLobby, attempt: number) => {
      if (cancelled) return;
      let ws: WebSocket;
      try {
        ws = new WebSocket(getSignalWsUrl());
      } catch {
        scheduleReconnect(room, lobby, attempt + 1);
        return;
      }
      sockets.add(ws);

      ws.onopen = () => {
        if (cancelled) return;
        openRooms.add(room);
        syncConnected();
        ws.send(JSON.stringify({ type: "join", roomId: room }));
      };

      ws.onclose = () => {
        sockets.delete(ws);
        openRooms.delete(room);
        syncConnected();
        // Beklenmedik kopmada üstel backoff ile aynı lobiye yeniden bağlan.
        scheduleReconnect(room, lobby, attempt + 1);
      };

      ws.onerror = () => {
        try {
          ws.close();
        } catch {
          /* onclose zaten yeniden bağlanmayı planlar */
        }
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
    };

    function scheduleReconnect(room: string, lobby: CallLobby, attempt: number) {
      if (cancelled) return;
      // 1s'den başlayıp 15s'de tavan yapan üstel geri çekilme.
      const delay = Math.min(15000, 1000 * 2 ** Math.min(attempt, 4));
      const timer = setTimeout(() => {
        timers.delete(timer);
        connect(room, lobby, attempt);
      }, delay);
      timers.add(timer);
    }

    LOBBY_MAP.forEach(({ room, lobby }) => connect(room, lobby, 0));

    return () => {
      cancelled = true;
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
      sockets.forEach((ws) => {
        try {
          ws.onclose = null;
          ws.close();
        } catch {
          /* yok say */
        }
      });
      sockets.clear();
    };
  }, []);

  const dismiss = (roomId: string) =>
    setQueue((prev) => prev.filter((c) => c.roomId !== roomId));

  return { queue, connected, dismiss };
}
