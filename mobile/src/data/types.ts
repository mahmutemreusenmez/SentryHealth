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

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  /** "HH:MM" 24 saat formatı */
  time: string;
  taken: boolean;
  withFood?: boolean;
}

export interface Appointment {
  id: string;
  title: string;
  department: string;
  location: string;
  /** ISO 8601 tarih-saat */
  dateTime: string;
}

/** Yaş/kronik duruma göre üretilen akıllı tetkik önerisi */
export interface ScreeningRecommendation {
  id: string;
  title: string;
  description: string;
  cadence: string;
  priority: "info" | "warning" | "critical";
  reason: string;
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
  medicationId: string;
  title: string;
  body: string;
  /** tetikleneceği epoch ms */
  fireAt: number;
  fired: boolean;
}
