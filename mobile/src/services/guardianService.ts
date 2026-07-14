import type {
  GuardianAlert,
  HealthTask,
  PatientProfile,
  SimNotification,
  SimNotificationKind,
} from "../data/types";

let seq = 0;
function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}-${Date.now()}-${seq}`;
}

/**
 * Hastanın durumuna göre canlı push bildirim içeriği üretir.
 * Test butonu her basıldığında sırayla farklı, duruma özel bir bildirim döner.
 */
export function buildSimNotification(
  profile: PatientProfile,
  tasks: HealthTask[],
  index: number,
): SimNotification {
  const firstName = profile.fullName.split(" ")[0];
  const pendingMed = tasks.find(
    (t) => t.category === "medication" && t.status === "pending",
  );

  const variants: { kind: SimNotificationKind; title: string; body: string }[] =
    [
      {
        kind: "medication",
        title: "İlaç Saati",
        body: `${firstName} Bey, ${
          pendingMed ? pendingMed.title.toLowerCase() : "tansiyon ilacınızı"
        } içme vaktiniz geldi. Lütfen onaylayın.`,
      },
      {
        kind: "critical",
        title: "Kritik Uyarı",
        body: "SpO2 seviyeniz %91'e düştü. Lütfen nefes egzersizine başlayın veya triyaj odasına bağlanın.",
      },
      {
        kind: "measurement",
        title: "Ölçüm Hatırlatıcısı",
        body: `${firstName} Bey, akşam tansiyon ölçümünüzü kaydetmeyi unutmayın.`,
      },
    ];

  const v = variants[index % variants.length];
  return {
    id: nextId("sim"),
    kind: v.kind,
    title: v.title,
    body: v.body,
    timestamp: Date.now(),
  };
}

/** Kaçırılan doz için refakatçiye gidecek otonom SMS taslağı. */
export function buildMissedDoseAlert(profile: PatientProfile): GuardianAlert {
  const firstName = profile.fullName.split(" ")[0];
  return {
    id: nextId("alert"),
    kind: "missed-dose",
    message: `SentryCompanion Bilgilendirmesi: Yakınınız ${firstName} Bey akşam dozaj ilacını saatinde almamıştır. Lütfen kontrol ediniz.`,
    timestamp: Date.now(),
  };
}

/** Görüntülü triyajda kırmızı kod / kritik durum için SMS taslağı. */
export function buildCriticalAlert(profile: PatientProfile): GuardianAlert {
  const firstName = profile.fullName.split(" ")[0];
  return {
    id: nextId("alert"),
    kind: "critical-triage",
    message: `SentryCompanion Kritik Uyarı: Yakınınız ${firstName} Bey için triyaj değerlendirmesinde acil (kırmızı kod) sevk önerildi. Lütfen acilen ulaşın.`,
    timestamp: Date.now(),
  };
}
