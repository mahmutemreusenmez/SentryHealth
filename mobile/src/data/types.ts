export type Gender = "female" | "male" | "unspecified";

export type ChronicCondition =
  | "Diyabet"
  | "Hipertansiyon"
  | "KOAH"
  | "Kalp Yetmezliği"
  | "Astım"
  | "Böbrek Yetmezliği";

export const CHRONIC_CONDITIONS: ChronicCondition[] = [
  "Diyabet",
  "Hipertansiyon",
  "KOAH",
  "Kalp Yetmezliği",
  "Astım",
  "Böbrek Yetmezliği",
];

export interface PatientProfile {
  fullName: string;
  /** T.C. Kimlik Numarası (11 hane) */
  nationalId: string;
  age: number;
  gender: Gender;
  chronicConditions: ChronicCondition[];
}

/** Uygulama genelinde kullanılan hasta profili tipi (PatientProfile ile aynı). */
export type UserProfile = PatientProfile;

/** e-Devlet Kapısı kimlik doğrulama durumunu tutan global state. */
export interface AuthenticationState {
  /** "Giriş Başarılı" bayrağı */
  isAuthenticated: boolean;
  /** Sahte e-Devlet doğrulaması sürerken true */
  isLoading: boolean;
  /** Giriş yapan kullanıcının T.C. Kimlik Numarası */
  nationalId: string | null;
  /** Doğrulama hatası mesajı */
  error: string | null;
}

/** Ana sayfadaki "Bugünkü Sağlık Görevleriniz" zaman tüneli öğesi */
export type HealthTaskCategory = "measurement" | "medication" | "activity";
export type HealthTaskStatus = "done" | "pending" | "suggestion";

export interface HealthTask {
  id: string;
  /** "HH:MM" 24 saat formatı */
  time: string;
  title: string;
  detail?: string;
  category: HealthTaskCategory;
  status: HealthTaskStatus;
  /** Öneri/aktivite notu (ör. hava durumu uyarısı) */
  note?: string;
}

/** Ana sayfada öne çıkarılan yaklaşan randevu (MHRS) */
export interface FeaturedAppointment {
  id: string;
  title: string;
  department: string;
  /** "Bugün" | "Yarın" | "13 Tem" gibi */
  dayLabel: string;
  /** "HH:MM" */
  time: string;
  /** MHRS öncelikli sıra numarası */
  queueNo: number;
}

/** Kronik takip için geçmiş tansiyon ölçümü */
export interface VitalReading {
  label: string;
  systolic: number;
  diastolic: number;
}

/** Hastanın güvenli hafızada şifreli saklanan günlük vital ölçümü */
export interface VitalEntry {
  /** Sistolik (büyük) tansiyon — mmHg */
  systolic: number;
  /** Diyastolik (küçük) tansiyon — mmHg */
  diastolic: number;
  /** Nabız — atım/dk */
  pulse: number;
  /** Kan şekeri — mg/dL */
  glucose: number;
  /** kayıt zamanı epoch ms */
  recordedAt: number;
}

/** Yaş/kronik duruma göre üretilen dinamik tetkik önerisi */
export interface ScreeningRecommendation {
  id: string;
  title: string;
  description: string;
  cadence: string;
  status: "Süresi Yaklaşıyor" | "Planlanmalı" | "Zorunlu Takip";
  priority: "info" | "warning" | "critical";
  reason: string;
}

/** Hasta yakını (SentryGuardian) refakatçi kaydı */
export interface Guardian {
  fullName: string;
  /** Yakınlık derecesi (ör. "Oğlu", "Kızı", "Eşi") */
  relation: string;
  phone: string;
  /** Otomatik SMS bilgilendirmesinin aktif olup olmadığı */
  smsEnabled: boolean;
}

/** Refakatçiye gidecek otonom SMS taslağı */
export interface GuardianAlert {
  id: string;
  /** Tetikleyen olay türü */
  kind: "missed-dose" | "critical-triage" | "spo2-drop";
  /** SMS gövdesi (ekranda kutuda gösterilir) */
  message: string;
  /** oluşturulma epoch ms */
  timestamp: number;
}

/** Jüri için canlı push bildirim simülatörü kart türü */
export type SimNotificationKind =
  | "medication"
  | "critical"
  | "measurement"
  | "reminder";

export interface SimNotification {
  id: string;
  kind: SimNotificationKind;
  title: string;
  body: string;
  /** oluşturulma epoch ms */
  timestamp: number;
}

/** Haftalık uyum çizelgesindeki tek bir günün durumu. */
export type ComplianceStatus = "done" | "missed" | "upcoming";

export interface DailyCompliance {
  /** Kısa gün etiketi (Pzt, Sal, ...) */
  label: string;
  status: ComplianceStatus;
}

/**
 * Çevrimdışıyken kuyruğa alınan (offline-first) görev onayı.
 * Cihaz tekrar çevrimiçi olduğunda arka planda senkronize edilir.
 */
export interface SyncQueueItem {
  id: string;
  taskId: string;
  status: HealthTaskStatus;
  /** onayın yerelde alındığı epoch ms */
  queuedAt: number;
}

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  /** epoch ms */
  timestamp: number;
  viaVoice?: boolean;
}

/** Simüle edilmiş yerel bildirim kaydı */
export interface ScheduledNotification {
  id: string;
  taskId: string;
  title: string;
  body: string;
  /** tetikleneceği epoch ms */
  fireAt: number;
  fired: boolean;
}
