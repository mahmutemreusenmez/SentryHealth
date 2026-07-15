import type { NurseReferralLevel, NurseReferral } from "../data/types";

/**
 * SentryBaby — Ebe/Hemşire paneli ile anne (Yeni Doğan) ekranı arasındaki
 * canlı yönlendirme kanalı.
 *
 * - **Web:** `BroadcastChannel` ile aynı tarayıcıdaki farklı sekmeler
 *   (ebe/hemşire `/nurse-panel` sekmesi ↔ anne uygulaması) arasında karar
 *   anlık iletilir; anne ekranında ilgili sevk/randevu barkodu belirir.
 * - **Native / desteklenmeyen ortam:** Bellek içi yayıncı ile aynı çalışma
 *   zamanındaki dinleyicilere iletilir.
 */

const CHANNEL_NAME = "sentry-baby-triage";

const REFERRAL_META: Record<
  NurseReferralLevel,
  { title: string; message: string; prefix: string }
> = {
  pediatric: {
    title: "Uzman Çocuk Hekimine Sevk (Kırmızı)",
    message:
      "Ebe/hemşireniz bebeğinizi öncelikli olarak çocuk polikliniğine sevk etti. MHRS öncelikli randevu barkodunu görevliye gösterin.",
    prefix: "COC",
  },
  "family-health": {
    title: "Aile Sağlığı Merkezine Davet (Sarı)",
    message:
      "Aşı veya yüz yüze kontrol için Aile Sağlığı Merkezi'ne davet edildiniz. Randevu kartınızı ASM'ye giderken kullanın.",
    prefix: "ASM",
  },
  home: {
    title: "Evde Takibe Devam (Yeşil)",
    message:
      "Bebeğiniz evde takip için uygun görüldü. Bakım ve beslenme rehberine uyun; ateş veya beslenme sorunu artarsa tekrar bağlanın.",
    prefix: "EVD",
  },
};

/** Bir yönlendirme seviyesinden tam kayıt (barkod dahil) üretir. */
export function buildNurseReferral(level: NurseReferralLevel): NurseReferral {
  const meta = REFERRAL_META[level];
  const serial = Math.floor(100000 + Math.random() * 900000);
  return {
    id: `nref-${Date.now()}`,
    level,
    code: `${meta.prefix}-${serial}`,
    title: meta.title,
    message: meta.message,
    issuedAt: Date.now(),
  };
}

type ReferralListener = (referral: NurseReferral) => void;

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

function isNurseReferral(value: unknown): value is NurseReferral {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.code === "string" &&
    typeof v.level === "string"
  );
}

class BabyChannel {
  private listeners = new Set<ReferralListener>();
  private channel: BroadcastChannelLike | null = null;

  private ensureChannel(): void {
    if (this.channel) return;
    const Ctor = getBroadcastCtor();
    if (!Ctor) return;
    this.channel = new Ctor(CHANNEL_NAME);
    this.channel.onmessage = (event) => {
      if (isNurseReferral(event.data)) {
        this.listeners.forEach((listener) =>
          listener(event.data as NurseReferral),
        );
      }
    };
  }

  /** Yönlendirme kararını yayınlar (ebe/hemşire panelinden çağrılır). */
  publish(referral: NurseReferral): void {
    this.ensureChannel();
    this.listeners.forEach((listener) => listener(referral));
    this.channel?.postMessage(referral);
  }

  /** Yönlendirme kararlarına abone olur (anne Yeni Doğan ekranından çağrılır). */
  subscribe(listener: ReferralListener): () => void {
    this.ensureChannel();
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const babyChannel = new BabyChannel();
