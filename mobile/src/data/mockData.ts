import type {
  FeaturedAppointment,
  HealthTask,
  PatientProfile,
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

export const FEATURED_APPOINTMENT: FeaturedAppointment = {
  id: "apt-1",
  title: "Kardiyoloji Kontrolü",
  department: "Kardiyoloji",
  dayLabel: "Yarın",
  time: "10:30",
  queueNo: 12,
};

/** Kronik tansiyon geçmişi — AI'ın proaktif analizi için */
export const BP_HISTORY: VitalReading[] = [
  { label: "Bugün", systolic: 128, diastolic: 82 },
  { label: "Dün", systolic: 135, diastolic: 86 },
  { label: "2 gün önce", systolic: 142, diastolic: 90 },
  { label: "3 gün önce", systolic: 138, diastolic: 88 },
];
