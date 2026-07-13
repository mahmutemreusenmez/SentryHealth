import type {
  Appointment,
  Medication,
  PatientProfile,
} from "./types";

export const INITIAL_PROFILE: PatientProfile = {
  fullName: "Ayşe Yıldız",
  nationalId: "10000000146",
  age: 67,
  gender: "female",
  chronicConditions: ["Diyabet", "Hipertansiyon"],
};

export const INITIAL_MEDICATIONS: Medication[] = [
  {
    id: "med-1",
    name: "Metformin",
    dosage: "1000 mg",
    time: "08:00",
    taken: true,
    withFood: true,
  },
  {
    id: "med-2",
    name: "Ramipril",
    dosage: "5 mg",
    time: "09:00",
    taken: true,
  },
  {
    id: "med-3",
    name: "Metformin",
    dosage: "1000 mg",
    time: "14:00",
    taken: false,
    withFood: true,
  },
  {
    id: "med-4",
    name: "Atorvastatin",
    dosage: "20 mg",
    time: "21:00",
    taken: false,
  },
];

function isoAt(daysFromNow: number, time: string): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  const [h, m] = time.split(":").map(Number);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

export const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: "apt-1",
    title: "Endokrinoloji Kontrolü",
    department: "Endokrinoloji ve Metabolizma",
    location: "Ankara Şehir Hastanesi",
    dateTime: isoAt(2, "10:30"),
  },
  {
    id: "apt-2",
    title: "Kardiyoloji Muayenesi",
    department: "Kardiyoloji",
    location: "Ankara Şehir Hastanesi",
    dateTime: isoAt(9, "14:00"),
  },
  {
    id: "apt-3",
    title: "Göz Dibi Muayenesi",
    department: "Göz Hastalıkları",
    location: "Etlik Devlet Hastanesi",
    dateTime: isoAt(18, "11:15"),
  },
];
