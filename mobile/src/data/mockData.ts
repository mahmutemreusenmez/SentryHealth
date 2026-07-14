import type {
  DailyCompliance,
  FeaturedAppointment,
  Guardian,
  HealthTask,
  MedicationStock,
  PatientProfile,
  PharmacyInfo,
  VitalReading,
} from "./types";

export const INITIAL_PROFILE: PatientProfile = {
  fullName: "Mahmut Yılmaz",
  nationalId: "10000000146",
  age: 58,
  gender: "male",
  chronicConditions: ["Diyabet", "Hipertansiyon"],
};

export const INITIAL_TASKS: HealthTask[] = [
  {
    id: "task-1",
    time: "09:00",
    title: "Sabah Tansiyon Ölçümü",
    detail: "Ölçüm: 128/82 mmHg",
    category: "measurement",
    status: "done",
  },
  {
    id: "task-2",
    time: "13:00",
    title: "Tok Karnına Diyabet İlacı",
    detail: "Metformin 1000 mg",
    category: "medication",
    status: "pending",
  },
  {
    id: "task-3",
    time: "16:00",
    title: "Günlük Tempolu Yürüyüş",
    detail: "30 dakika, orta tempo",
    category: "activity",
    status: "suggestion",
    note: "Hafif rüzgarlı havaya dikkat edin.",
  },
];

/** Kayıtlı hasta yakını (SentryGuardian refakatçisi) */
export const INITIAL_GUARDIAN: Guardian = {
  fullName: "Emre Yılmaz",
  relation: "Oğlu",
  phone: "+90 532 000 00 00",
  smsEnabled: true,
};

export const FEATURED_APPOINTMENT: FeaturedAppointment = {
  id: "apt-1",
  title: "Kardiyoloji Kontrolü",
  department: "Kardiyoloji",
  dayLabel: "Yarın",
  time: "10:30",
  queueNo: 12,
};

/**
 * Haftalık ilaç/tetkik uyum çizelgesi (Pzt-Paz).
 * Geçmiş günler onaylandı/kaçırıldı, bugün ve sonrası "yaklaşan".
 */
export const WEEKLY_COMPLIANCE: DailyCompliance[] = [
  { label: "Pzt", status: "done" },
  { label: "Sal", status: "done" },
  { label: "Çar", status: "missed" },
  { label: "Per", status: "done" },
  { label: "Cum", status: "done" },
  { label: "Cmt", status: "upcoming" },
  { label: "Paz", status: "upcoming" },
];

/**
 * SentryPharmacy: ilaç stok sayacı başlangıç değerleri.
 * `task-2` (Metformin) bilerek azalmış bırakıldı ki "İlacınız Azalıyor"
 * uyarısı jüri sunumunda anında görünsün.
 */
export const INITIAL_MEDICATION_STOCK: MedicationStock[] = [
  { taskId: "task-2", name: "Metformin 1000 mg", remaining: 3, dailyDose: 1 },
];

/**
 * SentryPharmacy: simüle GPS konumuna göre en yakın nöbetçi eczaneler.
 * Uzaklığa göre artan sırada.
 */
export const NOBETCI_PHARMACIES: PharmacyInfo[] = [
  {
    id: "ecz-1",
    name: "Şifa Nöbetçi Eczanesi",
    phone: "+90 312 400 10 20",
    address: "Cumhuriyet Cad. No:14, Çankaya",
    district: "Çankaya",
    distanceKm: 0.6,
    lat: 39.9208,
    lng: 32.8541,
  },
  {
    id: "ecz-2",
    name: "Bakanlıklar Eczanesi",
    phone: "+90 312 418 55 66",
    address: "Atatürk Bulvarı No:102, Kızılay",
    district: "Kızılay",
    distanceKm: 1.4,
    lat: 39.9179,
    lng: 32.8543,
  },
  {
    id: "ecz-3",
    name: "Yeni Umut Eczanesi",
    phone: "+90 312 231 77 88",
    address: "Gazi Mustafa Kemal Blv. No:47, Maltepe",
    district: "Maltepe",
    distanceKm: 2.1,
    lat: 39.9264,
    lng: 32.8385,
  },
  {
    id: "ecz-4",
    name: "Sağlık Nöbetçi Eczanesi",
    phone: "+90 312 285 12 34",
    address: "Anıttepe Mah. Gençlik Cad. No:9, Anıttepe",
    district: "Anıttepe",
    distanceKm: 3.3,
    lat: 39.9276,
    lng: 32.8298,
  },
];

/** Kronik tansiyon geçmişi — AI'ın proaktif analizi için */
export const BP_HISTORY: VitalReading[] = [
  { label: "Bugün", systolic: 128, diastolic: 82 },
  { label: "Dün", systolic: 135, diastolic: 86 },
  { label: "2 gün önce", systolic: 142, diastolic: 90 },
  { label: "3 gün önce", systolic: 138, diastolic: 88 },
];
