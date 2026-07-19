import type { ChatLine } from "../data/types";

/**
 * Sağlık personeli paneli ile hasta ekranı arasındaki canlı sohbet kanalı.
 *
 * - **Web:** `BroadcastChannel` ile aynı tarayıcıdaki farklı sekmeler (personel
 *   paneli ↔ hasta uygulaması) arasında yazışma anlık iletilir.
 * - **Native / desteklenmeyen ortam:** Bellek içi yayıncı ile aynı çalışma
 *   zamanındaki dinleyicilere iletilir.
 *
 * Mesajlar görüşme odası (`roomId`) ile etiketlenir; her ekran yalnızca kendi
 * odasındaki satırları dinler.
 */

const CHANNEL_NAME = "sentry-live-chat";

type ChatListener = (line: ChatLine) => void;

interface BroadcastChannelLike {
  postMessage: (message: unknown) => void;
  close: () => void;
  onmessage: ((event: { data: unknown }) => void) | null;
}

type BroadcastChannelCtor = new (name: string) => BroadcastChannelLike;

function getBroadcastCtor(): BroadcastChannelCtor | null {
  const w = globalThis as unknown as { BroadcastChannel?: BroadcastChannelCtor };
  return w.BroadcastChannel ?? null;
}

function isChatLine(value: unknown): value is ChatLine {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.roomId === "string" &&
    typeof v.text === "string" &&
    (v.from === "staff" || v.from === "patient")
  );
}

class ChatChannel {
  private listeners = new Set<ChatListener>();
  private channel: BroadcastChannelLike | null = null;

  private ensureChannel(): void {
    if (this.channel) return;
    const Ctor = getBroadcastCtor();
    if (!Ctor) return;
    this.channel = new Ctor(CHANNEL_NAME);
    this.channel.onmessage = (event) => {
      if (isChatLine(event.data)) {
        this.listeners.forEach((listener) => listener(event.data as ChatLine));
      }
    };
  }

  /** Bir sohbet satırını yayınlar. */
  publish(line: ChatLine): void {
    this.ensureChannel();
    this.channel?.postMessage(line);
  }

  /** Belirli bir görüşme odasındaki sohbet satırlarına abone olur. */
  subscribe(roomId: string, listener: ChatListener): () => void {
    this.ensureChannel();
    const scoped: ChatListener = (line) => {
      if (line.roomId === roomId) listener(line);
    };
    this.listeners.add(scoped);
    return () => this.listeners.delete(scoped);
  }
}

export const chatChannel = new ChatChannel();

let counter = 0;

/** Yeni bir sohbet satırı üretir. */
export function makeChatLine(
  roomId: string,
  from: ChatLine["from"],
  text: string,
): ChatLine {
  counter += 1;
  return {
    id: `chat-${Date.now()}-${counter}`,
    roomId,
    from,
    text,
    at: Date.now(),
  };
}
