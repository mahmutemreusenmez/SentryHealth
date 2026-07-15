import type { ReferralLevel, TriageReferral } from "../data/types";

/**
 * SentryMD — Hekim paneli ile hasta ekranı arasındaki canlı sevk kanalı.
 *
 * - **Web:** `BroadcastChannel` ile aynı tarayıcıdaki farklı sekmeler (hekim
 *   `/doctor-panel` sekmesi ↔ hasta uygulaması) arasında sevk kararı anlık
 *   iletilir. Böylece hekim bir sevk butonuna bastığında hastanın Triyaj
 *   ekranında sevk barkodu canlı olarak belirir.
 * - **Native / desteklenmeyen ortam:** Bellek içi yayıncı (in-memory emitter)
 *   ile aynı çalışma zamanındaki dinleyicilere iletilir.
 */

const CHANNEL_NAME = "sentry-triage";

const REFERRAL_META: Record<
  ReferralLevel,
  { title: string; message: string; prefix: string }
> = {
  emergency: {
    title: "Acil Servise Sevk (Kırmızı)",
    message:
      "Hekiminiz sizi acil servise yönlendirdi. Lütfen refakatçinizle en yakın acile başvurun; barkodu görevliye gösterin.",
    prefix: "ACL",
  },
  clinic: {
    title: "Polikliniğe Sevk (Sarı)",
    message:
      "Hekiminiz sizi ilgili polikliniğe yönlendirdi. MHRS üzerinden randevu alırken bu barkodu kullanabilirsiniz.",
    prefix: "POL",
  },
  home: {
    title: "Evde Takip (Yeşil)",
    message:
      "Durumunuz evde takip için uygun görüldü. Önerilere uyun; belirtiler artarsa tekrar triyaj başlatın.",
    prefix: "EVD",
  },
};

/** Bir sevk seviyesinden tam sevk kaydı (barkod dahil) üretir. */
export function buildReferral(level: ReferralLevel): TriageReferral {
  const meta = REFERRAL_META[level];
  const serial = Math.floor(100000 + Math.random() * 900000);
  return {
    id: `ref-${Date.now()}`,
    level,
    code: `${meta.prefix}-${serial}`,
    title: meta.title,
    message: meta.message,
    issuedAt: Date.now(),
  };
}

type ReferralListener = (referral: TriageReferral) => void;

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

function isReferral(value: unknown): value is TriageReferral {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.code === "string" &&
    typeof v.level === "string"
  );
}

class TriageChannel {
  private listeners = new Set<ReferralListener>();
  private channel: BroadcastChannelLike | null = null;

  private ensureChannel(): void {
    if (this.channel) return;
    const Ctor = getBroadcastCtor();
    if (!Ctor) return;
    this.channel = new Ctor(CHANNEL_NAME);
    this.channel.onmessage = (event) => {
      if (isReferral(event.data)) {
        this.listeners.forEach((listener) => listener(event.data as TriageReferral));
      }
    };
  }

  /** Sevk kararını yayınlar (hekim panelinden çağrılır). */
  publish(referral: TriageReferral): void {
    this.ensureChannel();
    // Aynı çalışma zamanındaki dinleyicilere de anında ilet.
    this.listeners.forEach((listener) => listener(referral));
    this.channel?.postMessage(referral);
  }

  /** Sevk kararlarına abone olur (hasta Triyaj ekranından çağrılır). */
  subscribe(listener: ReferralListener): () => void {
    this.ensureChannel();
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const triageChannel = new TriageChannel();
