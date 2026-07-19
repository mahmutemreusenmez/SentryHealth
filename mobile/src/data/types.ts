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
  /** Kan grubu (ör. "A Rh+"). */
  bloodType: string;
  /** Bağlı olunan aile hekimi. */
  familyPhysician: string;
}

/** Uygulama genelinde kullanılan hasta profili tipi (PatientProfile ile aynı). */
export type UserProfile = PatientProfile;

/** Giriş yapan kullanıcının rolü (hasta veya hekim/sağlık personeli). */
export type UserRole = "patient" | "doctor";

/** e-Devlet Kapısı kimlik doğrulama durumunu tutan global state. */
export interface AuthenticationState {
  /** "Giriş Başarılı" bayrağı */
  isAuthenticated: boolean;
  /** Kimlik doğrulaması sürerken true */
  isLoading: boolean;
  /** Giriş yapan kullanıcının T.C. Kimlik Numarası */
  nationalId: string | null;
  /** Giriş yapan kullanıcının rolü (hasta / hekim). */
  role: UserRole;
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

/** Hastanın bilinç durumu — MEWS "AVPU" ölçeği. */
export type ConsciousnessLevel = "alert" | "voice" | "pain" | "unresponsive";

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
  /** Solunum hızı — soluk/dk (MEWS için) */
  respiratoryRate: number;
  /** Vücut sıcaklığı — °C (MEWS için) */
  temperature: number;
  /** Bilinç durumu (AVPU); girilmezse "alert" kabul edilir. */
  consciousness?: ConsciousnessLevel;
  /** kayıt zamanı epoch ms */
  recordedAt: number;
}

/* ------------------------------------------------------------------ */
/* Klinik Karar Destek Sistemi (CDSS) — MEWS                           */
/* ------------------------------------------------------------------ */

/** MEWS klinik risk bandı: Yeşil (stabil) / Sarı (gözlem) / Kırmızı (acil). */
export type MewsBand = "green" | "yellow" | "red";

/** MEWS skoruna katkı veren tek bir vital parametrenin dökümü. */
export interface MewsParameterScore {
  /** Parametre etiketi (ör. "Solunum Hızı"). */
  label: string;
  /** Ölçülen değer + birim (ör. "22 /dk"). */
  display: string;
  /** Bu parametrenin MEWS alt puanı (0-3). */
  points: number;
}

/** MEWS motorunun ürettiği klinik karar sonucu. */
export interface MewsResult {
  /** Toplam MEWS skoru. */
  total: number;
  /** Risk bandı. */
  band: MewsBand;
  /** Banda karşılık gelen kısa başlık (ör. "Acil Triyaj Gerekli"). */
  title: string;
  /** Hastaya yönelik sade klinik yönlendirme. */
  guidance: string;
  /** Parametre bazlı puan dökümü (şeffaflık için). */
  breakdown: MewsParameterScore[];
  /** Kırmızı/sarı bandda triyaj yönlendirmesi önerilir mi? */
  triageAdvised: boolean;
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

/** Canlı push bildirim kart türü */
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

/* ------------------------------------------------------------------ */
/* Sürüm 2.0 — Gelişmiş Klinik ve Donanımsal Entegrasyon               */
/* ------------------------------------------------------------------ */

/** İlaç Takip Sistemi: bir ilacın açlık/tokluk durumu. */
export type MedicationFoodTiming = "before" | "after" | "independent";

/**
 * İlaç Takip Sistemi (MedicationTracker) — hastanın takip ettiği bir ilaç.
 * Eczane modülünün yerini alan yeni klinik ilaç takip modeli.
 */
export interface Medication {
  id: string;
  /** İlaç adı (ör. "Metformin 1000 mg"). */
  name: string;
  /** Dozaj (ör. "1 Tablet", "2 Puf"). */
  dosage: string;
  /** Periyot (ör. "Günde 2 kez", "8 saatte bir"). */
  period: string;
  /** Açlık / tokluk / bağımsız. */
  foodTiming: MedicationFoodTiming;
  /** Bir sonraki doz saati "HH:MM" (Yaklaşan İlaçlar sıralaması için). */
  nextTime: string;
  /** İlgili sağlık görevi (HealthTask) kimliği — varsa. */
  taskId?: string;
  /** Kalan adet (tablet/doz) — reçete yenileme uyarısı için opsiyonel. */
  remaining?: number;
  /** Günlük tüketilen doz sayısı — reçete yenileme uyarısı için opsiyonel. */
  dailyDose?: number;
}

/** Giyilebilir cihazdan gelen anlık vital örneği. */
export interface PulseSample {
  /** Nabız — atım/dk. */
  heartRate: number;
  /** SpO2 — oksijen satürasyonu %. */
  spo2: number;
  /** O ana kadarki günlük adım sayısı. */
  steps: number;
  /** Ölçüm zamanı epoch ms. */
  at: number;
}

/** Giyilebilir cihaz erişim izni durumu. */
export type WearablePermission = "unknown" | "granted" | "denied";

/** Hekimin verdiği 3 yönlü sevk kararı seviyesi. */
export type ReferralLevel = "emergency" | "clinic" | "home";

/** Hekimden hastaya canlı iletilen sevk kaydı. */
export interface TriageReferral {
  id: string;
  level: ReferralLevel;
  /** Ekranda gösterilecek sevk barkodu değeri. */
  code: string;
  /** Sevk başlığı (ör. "Acil Servise Sevk"). */
  title: string;
  /** Hastaya yönelik açıklama. */
  message: string;
  /** oluşturulma epoch ms. */
  issuedAt: number;
}

/* ------------------------------------------------------------------ */
/* SentryBaby — Yeni Doğan Takip ve Canlı Ebe/Hemşire Triyajı          */
/* ------------------------------------------------------------------ */

export type BabyGender = "female" | "male";

/** Profilde tanımlı yeni doğan bebek. Kronik hasta profilinden ayrık tutulur. */
export interface BabyProfile {
  fullName: string;
  /** Doğum tarihi ISO (YYYY-MM-DD). Aşı ve gelişim hesapları buna dayanır. */
  birthDate: string;
  gender: BabyGender;
}

/** Bebeğin bir gelişim (persentil) ölçümü. */
export interface GrowthMeasurement {
  /** Ölçüm yaşı (ay, 0-24). */
  ageMonths: number;
  /** Boy (cm). */
  heightCm: number;
  /** Kilo (kg). */
  weightKg: number;
  /** Baş çevresi (cm). */
  headCm: number;
}

/** Persentil grafiğinde ölçülebilen gelişim metriği. */
export type GrowthMetric = "weightKg" | "heightCm" | "headCm";

/** Bir yaş (ay) için P3 / P50 / P97 referans değerleri. */
export interface GrowthReferencePoint {
  ageMonths: number;
  p3: number;
  p50: number;
  p97: number;
}

/** Sağlık Bakanlığı çocukluk çağı aşı takvimi kaydı. */
export interface VaccineEntry {
  id: string;
  name: string;
  /** Doğumdan itibaren gün (0 = doğumda). */
  dueDayOffset: number;
  /** Doz açıklaması (ör. "1. Doz"). */
  dose: string;
}

/** Ebe/Hemşire triyajı sonrası 3 yönlü sevk/yönlendirme seviyesi. */
export type NurseReferralLevel = "pediatric" | "family-health" | "home";

/** Ebe/Hemşireden anneye canlı iletilen yönlendirme kaydı. */
export interface NurseReferral {
  id: string;
  level: NurseReferralLevel;
  /** Ekranda gösterilecek sevk/randevu barkodu. */
  code: string;
  title: string;
  /** Anneye yönelik açıklama. */
  message: string;
  issuedAt: number;
}

/** Ebe/Hemşire paneline canlı aktarılan bebek vital metadatası. */
export interface BabyVitals {
  /** Son ölçülen ateş (°C). */
  temperature: number;
  /** Son tartılan kilo (kg). */
  weightKg: number;
  /** Günlük emzirme sıklığı (24 saatte). */
  feedingsPerDay: number;
}

/** Alt sekme (bottom tab) navigasyon parametre listesi. */
export type RootTabParamList = {
  Dashboard: undefined;
  Triage: undefined;
  Chat: undefined;
  Medication: undefined;
  Baby: undefined;
  Profile: undefined;
};

/** Kök yığın (stack) navigasyon parametre listesi. */
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  /** Giriş yapan sağlık personelinin ana ekranı (Sağlık Personeli Paneli). */
  DoctorHome: undefined;
};

/** Canlı sohbette bir satırı gönderen taraf. */
export type ChatFrom = "staff" | "patient";

/** Hasta ile sağlık personeli arasındaki canlı sohbet satırı. */
export interface ChatLine {
  id: string;
  /** Görüşme odası anahtarı (call-...). */
  roomId: string;
  from: ChatFrom;
  text: string;
  /** epoch ms */
  at: number;
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
