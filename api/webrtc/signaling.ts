import http from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';

interface Client {
  ws: WebSocket;
  peerId: string;
  roomId: string | null;
}

const rooms = new Map<string, Map<string, WebSocket>>();
const peerMap = new Map<string, WebSocket>();

/**
 * WebRTC sinyal protokolünü mevcut bir HTTP sunucusuna bağlar.
 *
 * Aynı oda tabanlı mantık hem bağımsız (Vercel) sunucuda hem de yerel Express
 * sunucusunda (canlı triyaj) yeniden kullanılır. Protokol:
 *  - welcome / join -> joined / peer-joined / peer-left
 *  - broadcast (oda içi duyuru) ve signal (SDP/ICE hedefli aktarım)
 */
export function attachWebrtcSignaling(
  server: http.Server,
  path = '/api/webrtc/signaling',
): WebSocketServer {
  // noServer + yönlendirmeli upgrade: aynı HTTP sunucusunda /rtc gibi başka bir
  // WebSocket yoluyla birlikte çakışmadan çalışabilmesi için.
  const wss = new WebSocketServer({ noServer: true });
  server.on('upgrade', (req, socket, head) => {
    if ((req.url ?? '').split('?')[0] === path) {
      wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
    }
  });
  wss.on('connection', handleConnection);
  return wss;
}

function handleConnection(ws: WebSocket) {
  const peerId = `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  const client: Client = { ws, peerId, roomId: null };
  peerMap.set(peerId, ws);

  ws.send(JSON.stringify({ type: 'welcome', peerId }));

  ws.on('message', (raw) => {
    let msg: any;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.type === 'join' && msg.roomId) {
      if (client.roomId) {
        const oldRoom = rooms.get(client.roomId);
        if (oldRoom) {
          oldRoom.delete(peerId);
          if (oldRoom.size === 0) {
            rooms.delete(client.roomId);
          } else {
            for (const [id, other] of oldRoom) {
              if (id !== peerId) {
                other.send(JSON.stringify({ type: 'peer-left', peerId, roomId: client.roomId }));
              }
            }
          }
        }
      }

      client.roomId = String(msg.roomId);
      if (!rooms.has(client.roomId)) {
        rooms.set(client.roomId, new Map<string, WebSocket>());
      }
      const room = rooms.get(client.roomId)!;
      room.set(peerId, ws);

      const peerIds = Array.from(room.keys()).filter((id) => id !== peerId);
      ws.send(JSON.stringify({ type: 'joined', peerId, roomId: client.roomId, peers: peerIds }));

      for (const [id, other] of room) {
        if (id !== peerId) {
          other.send(JSON.stringify({ type: 'peer-joined', peerId, roomId: client.roomId }));
        }
      }
      return;
    }

    if (msg.type === 'signal' && msg.to && msg.data) {
      const target = peerMap.get(String(msg.to));
      if (target && target.readyState === 1) {
        target.send(JSON.stringify({ type: 'signal', from: peerId, data: msg.data }));
      }
      return;
    }

    if (msg.type === 'broadcast' && msg.roomId && msg.data) {
      const room = rooms.get(String(msg.roomId));
      if (room) {
        for (const [id, other] of room) {
          if (id !== peerId) {
            other.send(JSON.stringify({ type: 'broadcast', from: peerId, data: msg.data }));
          }
        }
      }
      return;
    }
  });

  ws.on('close', () => {
    peerMap.delete(peerId);
    if (client.roomId) {
      const room = rooms.get(client.roomId);
      if (room) {
        room.delete(peerId);
        for (const [id, other] of room) {
          other.send(JSON.stringify({ type: 'peer-left', peerId, roomId: client.roomId }));
        }
        if (room.size === 0) {
          rooms.delete(client.roomId);
        }
      }
    }
  });
}

// Bağımsız çalıştırma (ör. Vercel): kendi HTTP sunucusunu oluşturup bağlar.
const server = http.createServer((req, res) => {
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  const host = req.headers.host || 'localhost';
  res.end(
    JSON.stringify({
      ok: true,
      type: 'webrtc-signaling',
      url: `wss://${host}/api/webrtc/signaling`,
    }),
  );
});

attachWebrtcSignaling(server);

export default server;
