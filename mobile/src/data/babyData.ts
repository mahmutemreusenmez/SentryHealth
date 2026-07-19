import type {
  BabyProfile,
  BabyVitals,
  GrowthMeasurement,
  VaccineEntry,
} from "./types";

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export const INITIAL_BABY: BabyProfile = {
  fullName: "Elif Yılmaz",
  birthDate: daysAgoISO(92), // ~3 aylık
  gender: "female",
};

/**
 * T.C. Sağlık Bakanlığı Genişletilmiş Bağışıklama Programı (GBP) çocukluk
 * çağı aşı takvimi. `dueDayOffset` doğumdan itibaren gün cinsindendir.
 * (30 gün ≈ 1 ay kabul edilmiştir.)
 */
export const VACCINE_SCHEDULE: VaccineEntry[] = [
  { id: "hepb-0", name: "Hepatit B", dueDayOffset: 0, dose: "1. Doz" },
  { id: "hepb-1", name: "Hepatit B", dueDayOffset: 30, dose: "2. Doz" },
  { id: "bcg", name: "BCG (Verem)", dueDayOffset: 60, dose: "Tek Doz" },
  { id: "dabt-2", name: "DaBT-İPA-Hib (Beşli)", dueDayOffset: 60, dose: "1. Doz" },
  { id: "kpa-2", name: "KPA (Konjuge Pnömokok)", dueDayOffset: 60, dose: "1. Doz" },
  { id: "dabt-4", name: "DaBT-İPA-Hib (Beşli)", dueDayOffset: 120, dose: "2. Doz" },
  { id: "kpa-4", name: "KPA (Konjuge Pnömokok)", dueDayOffset: 120, dose: "2. Doz" },
  { id: "dabt-6", name: "DaBT-İPA-Hib (Beşli)", dueDayOffset: 180, dose: "3. Doz" },
  { id: "opa-6", name: "OPA (Oral Polio)", dueDayOffset: 180, dose: "1. Doz" },
  { id: "hepb-6", name: "Hepatit B", dueDayOffset: 180, dose: "3. Doz" },
  { id: "kpa-12", name: "KPA (Konjuge Pnömokok)", dueDayOffset: 360, dose: "Rapel" },
  { id: "kkk-12", name: "KKK (Kızamık-Kızamıkçık-Kabakulak)", dueDayOffset: 360, dose: "1. Doz" },
  { id: "sucicegi-12", name: "Su Çiçeği", dueDayOffset: 360, dose: "1. Doz" },
  { id: "hepa-18", name: "Hepatit A", dueDayOffset: 540, dose: "1. Doz" },
  { id: "dabt-18", name: "DaBT-İPA-Hib (Beşli)", dueDayOffset: 540, dose: "Rapel" },
  { id: "opa-18", name: "OPA (Oral Polio)", dueDayOffset: 540, dose: "2. Doz" },
  { id: "hepa-24", name: "Hepatit A", dueDayOffset: 720, dose: "2. Doz" },
];

/** Bebeğin girilmiş gelişim ölçümleri (persentil grafiği için). */
export const INITIAL_GROWTH: GrowthMeasurement[] = [
  { ageMonths: 0, heightCm: 49, weightKg: 3.2, headCm: 34 },
  { ageMonths: 1, heightCm: 53, weightKg: 4.1, headCm: 36 },
  { ageMonths: 2, heightCm: 57, weightKg: 5.0, headCm: 38 },
  { ageMonths: 3, heightCm: 60, weightKg: 5.8, headCm: 39.5 },
];

/** Ebe/Hemşire paneline aktarılan son bebek vital metadatası. */
export const INITIAL_BABY_VITALS: BabyVitals = {
  temperature: 37.1,
  weightKg: 5.8,
  feedingsPerDay: 8,
};
