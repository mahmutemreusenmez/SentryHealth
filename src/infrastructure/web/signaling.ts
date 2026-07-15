import type { Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';

/**
 * WebRTC sinyalleşme (signaling) sunucusu.
 *
 * Tarayıcı tabanlı gerçek WebRTC eşlerini (mobil hasta/anne <-> web hekim/ebe)
 * bir araya getiren, oda tabanlı bir SDP/ICE aktarma (relay) katmanıdır.
 *
 * Protokol (JSON mesajları, WebSocket üzerinden):
 *  - İstemci -> Sunucu: { type: 'join', room, role, name }
 *  - Sunucu -> İstemci: { type: 'joined', id, peers: [{id, role, name}] }
 *  - Sunucu -> Eşler:   { type: 'peer-joined', id, role, name }
 *  - Aktarılan mesajlar (from/role/name eklenir):
 *      offer | answer | candidate | meta | referral | bye
 *      İsteğe bağlı `to` alanı ile tek bir eşe, yoksa odadaki diğer tüm eşlere.
 *  - Sunucu -> Eşler:   { type: 'peer-left', id }
 *
 * Not: WebSocket bağlantısı kalıcı (stateful) olduğundan bu katman yalnızca
 * uzun ömürlü bir Node sunucusunda (yerel / tünel) çalışır; Vercel serverless
 * fonksiyonlarında WebSocket desteklenmez.
 */

const MAX_ROOM_SIZE = 8;
const RELAY_TYPES = new Set(['offer', 'answer', 'candidate', 'meta', 'referral', 'bye']);

interface SignalClient {
  id: string;
  ws: WebSocket;
  room: string;
  role: string;
  name: string;
}

interface SignalMessage {
  type: string;
  room?: unknown;
  role?: unknown;
  name?: unknown;
  to?: unknown;
  [key: string]: unknown;
}

function safeSend(ws: WebSocket, payload: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

export function attachSignaling(server: Server, path = '/rtc'): WebSocketServer {
  // noServer + yönlendirmeli upgrade: aynı HTTP sunucusunda birden fazla
  // WebSocket yolu (ör. /rtc ve /api/webrtc/signaling) çakışmadan çalışır.
  const wss = new WebSocketServer({ noServer: true });
  server.on('upgrade', (req, socket, head) => {
    if ((req.url ?? '').split('?')[0] === path) {
      wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
    }
  });
  const rooms = new Map<string, Set<SignalClient>>();

  const peersOf = (room: string, exceptId?: string): SignalClient[] => {
    const set = rooms.get(room);
    if (!set) return [];
    return [...set].filter((c) => c.id !== exceptId);
  };

  wss.on('connection', (ws: WebSocket) => {
    let client: SignalClient | null = null;

    ws.on('message', (raw) => {
      let msg: SignalMessage;
      try {
        msg = JSON.parse(raw.toString()) as SignalMessage;
      } catch {
        return;
      }
      if (!msg || typeof msg.type !== 'string') return;

      if (msg.type === 'join') {
        const room = String(msg.room ?? '').trim().slice(0, 80);
        if (!room) {
          safeSend(ws, { type: 'error', message: 'Oda anahtarı gerekli' });
          return;
        }
        const set = rooms.get(room) ?? new Set<SignalClient>();
        if (set.size >= MAX_ROOM_SIZE) {
          safeSend(ws, { type: 'error', message: 'Oda dolu' });
          return;
        }
        client = {
          id: randomUUID(),
          ws,
          room,
          role: String(msg.role ?? 'guest').slice(0, 40),
          name: String(msg.name ?? '').slice(0, 80),
        };
        set.add(client);
        rooms.set(room, set);

        safeSend(ws, {
          type: 'joined',
          id: client.id,
          room,
          peers: peersOf(room, client.id).map((p) => ({ id: p.id, role: p.role, name: p.name })),
        });
        for (const peer of peersOf(room, client.id)) {
          safeSend(peer.ws, {
            type: 'peer-joined',
            id: client.id,
            role: client.role,
            name: client.name,
          });
        }
        return;
      }

      if (!client) return;

      if (RELAY_TYPES.has(msg.type)) {
        const targetId = typeof msg.to === 'string' ? msg.to : null;
        const targets = targetId
          ? peersOf(client.room).filter((p) => p.id === targetId)
          : peersOf(client.room, client.id);
        for (const peer of targets) {
          safeSend(peer.ws, { ...msg, from: client.id, role: client.role, name: client.name });
        }
      }
    });

    ws.on('close', () => {
      if (!client) return;
      const set = rooms.get(client.room);
      if (set) {
        set.delete(client);
        if (set.size === 0) rooms.delete(client.room);
      }
      for (const peer of peersOf(client.room)) {
        safeSend(peer.ws, { type: 'peer-left', id: client.id });
      }
      client = null;
    });
  });

  return wss;
}
