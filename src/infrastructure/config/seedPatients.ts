import { createHash } from 'node:crypto';
import type { AnonymizedPatient, PatientCaregiver, PatientSchedule } from '../../application/ports/Anonymizer.js';
import type { HealthMetrics } from '../../domain/entities/HealthMetrics.js';
import { repository } from './dependencies.js';
import { buildInteractionLog } from '../../application/services/InteractionLogBuilder.js';

const TR_FIRST_NAMES = [
  'Ahmet', 'Mehmet', 'Ali', 'Mustafa', 'Hasan', 'Hüseyin', 'İbrahim', 'Osman', 'Kemal', 'Murat',
  'Burak', 'Cem', 'Can', 'Barış', 'Emre', 'Serkan', 'Tolga', 'Umut', 'Yusuf', 'Oğuz',
  'Ayşe', 'Fatma', 'Emine', 'Hatice', 'Zeynep', 'Elif', 'Meryem', 'Suna', 'Sevim', 'Leyla',
  'Selin', 'Ceren', 'Büşra', 'Esra', 'Nazan', 'Derya', 'Aslı', 'Pınar', 'Gizem', 'Hülya',
  'Cengiz', 'Erdal', 'Fikret', 'Gürkan', 'Halil', 'İsmail', 'Kadir', 'Levent', 'Mahmut', 'Necmi',
];

const TR_LAST_NAMES = [
  'Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Yıldız', 'Çelik', 'Aydın', 'Öztürk', 'Doğan', 'Kılıç',
  'Arslan', 'Aslan', 'Aksoy', 'Baran', 'Tekin', 'Eroğlu', 'Yavuz', 'Turan', 'Tuncer', 'Özdemir',
  'Korkmaz', 'Polat', 'Koç', 'Güneş', 'Balcı', 'Ateş', 'Yalçın', 'Ünlü', 'Keskin', 'Şen',
  'Karaca', 'Mutlu', 'Sönmez', 'Özkan', 'Acar', 'Duman', 'Akın', 'Taş', 'Ceylan', 'Yüksel',
  'Sarı', 'Avcı', 'Güler', 'Başar', 'Toprak', 'Yıldırım', 'Soylu', 'Koca', 'Çetin', 'Kurt',
];

const RELATIONSHIPS = ['Eş', 'Çocuk', 'Kardeş', 'Anne', 'Baba', 'Yeğen', 'Dost/Akraba'];
const CONDITIONS = ['KOAH', 'Diyabet', 'Hipertansiyon', 'Kalp Yetmezliği'] as const;
const QUESTION_TEMPLATES = [
  'Açlık kan şekerinizi ölçtünüz mü?',
  'Tansiyon ölçümünüzü yaptınız mı?',
  'Oksijen satürasyonunuz şu an kaç?',
  'Nefes darlığınız var mı?',
  'Son 24 saatte ayak / bacak şişmesi oldu mu?',
  'İlaçlarınızı düzenli aldınız mı?',
];
const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const TIME_OPTIONS = ['08:00', '12:00', '16:00', '20:00'];
const PHONE_PREFIXES = [
  '530', '531', '532', '533', '534', '535', '536', '537', '538', '539',
  '505', '506', '507', '551', '552', '553', '554', '555',
];

function deriveAgeGroup(age: number): string {
  if (age < 18) return '0-17';
  if (age < 35) return '18-34';
  if (age < 50) return '35-49';
  if (age < 65) return '50-64';
  return '65+';
}

function buildNationalId(index: number): string {
  return String(10000000000 + index).padStart(11, '0');
}

function buildPseudonym(nationalId: string): string {
  return createHash('sha256').update(`sentry-static-seed:${nationalId}`).digest('hex').slice(0, 16).toUpperCase();
}

function buildPhone(index: number): string {
  const prefix = PHONE_PREFIXES[index % PHONE_PREFIXES.length];
  const mid = String(100 + (index * 7) % 900).padStart(3, '0');
  const a = String(10 + (index * 3) % 90).padStart(2, '0');
  const b = String(10 + (index * 5) % 90).padStart(2, '0');
  return `0${prefix} ${mid} ${a} ${b}`;
}

function buildSchedule(index: number): PatientSchedule {
  const dayCount = 1 + (index % 7);
  const days = DAYS.slice(0, dayCount);
  const timeCount = 1 + (index % 4);
  const times = TIME_OPTIONS.slice(0, timeCount);
  return {
    days,
    times,
    template: QUESTION_TEMPLATES[index % QUESTION_TEMPLATES.length],
  };
}

function buildCaregiver(index: number, fullName: string): PatientCaregiver {
  const first = TR_FIRST_NAMES[(index + 5) % TR_FIRST_NAMES.length];
  const last = TR_LAST_NAMES[(index + 3) % TR_LAST_NAMES.length];
  return {
    name: `${first} ${last}`,
    relationship: RELATIONSHIPS[index % RELATIONSHIPS.length],
    phone: buildPhone(index + 17),
    email: `${fullName.toLocaleLowerCase('tr-TR').replace(/\s+/g, '.')}@yakinmail.com`,
  };
}

function buildMeasurements(condition: string, index: number): HealthMetrics[] {
  const count = 6 + (index % 10);
  const measurements: HealthMetrics[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 2);
    d.setHours(8 + ((index + i) % 12), (index * 7 + i * 11) % 60, 0, 0);

    let heartRate = 60 + ((index + i * 3) % 50);
    let bloodPressureSystolic = 110 + ((index + i * 2) % 40);
    let bloodPressureDiastolic = 70 + ((index + i) % 25);
    let oxygenSaturation = 92 + ((index + i) % 8);
    let temperature = Number((36.2 + ((index + i) % 10) / 10).toFixed(1));

    if (condition === 'KOAH') {
      oxygenSaturation = 86 + ((index + i) % 11);
      heartRate = 70 + ((index + i) % 45);
    } else if (condition === 'Hipertansiyon') {
      bloodPressureSystolic = 120 + ((index + i) % 55);
      bloodPressureDiastolic = 80 + ((index + i) % 28);
    } else if (condition === 'Diyabet') {
      temperature = Number((36.4 + ((index + i) % 6) / 10).toFixed(1));
    } else if (condition === 'Kalp Yetmezliği') {
      heartRate = 75 + ((index + i) % 50);
      oxygenSaturation = 90 + ((index + i) % 8);
    }

    if ((index + i) % 7 === 0) {
      heartRate = 50 + ((index + i) % 90);
      bloodPressureSystolic = 100 + ((index + i) % 85);
      oxygenSaturation = 85 + ((index + i) % 13);
    }

    measurements.push({
      timestamp: d,
      heartRate,
      bloodPressureSystolic,
      bloodPressureDiastolic,
      oxygenSaturation,
      temperature,
    });
  }
  return measurements.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

function buildStaticPatient(index: number): AnonymizedPatient {
  const first = TR_FIRST_NAMES[index % TR_FIRST_NAMES.length];
  const last = TR_LAST_NAMES[(index + Math.floor(index / TR_FIRST_NAMES.length)) % TR_LAST_NAMES.length];
  const fullName = `${first} ${last}`;
  const nationalId = buildNationalId(index);
  const age = 45 + (index % 45);
  const condition = CONDITIONS[index % CONDITIONS.length];
  const schedule = buildSchedule(index);
  const healthData = buildMeasurements(condition, index);
  const pseudonym = buildPseudonym(nationalId);
  const displayCode = `H-${String(10 + (index % 90)).padStart(2, '0')}${String.fromCharCode(65 + (index % 26))}`;

  return {
    id: `static-patient-${String(index + 1).padStart(3, '0')}`,
    pseudonym,
    displayCode,
    ageGroup: deriveAgeGroup(age),
    conditionGroup: condition,
    maskedNationalId: `${nationalId.slice(0, 3)}*****${nationalId.slice(-3)}`,
    phone: buildPhone(index),
    contactChannel: index % 5 === 0 ? 'ai' : 'sms',
    caregiver: buildCaregiver(index, fullName),
    schedule,
    customQuestion: schedule.template,
    questionTimes: schedule.times,
    interactionLog: buildInteractionLog(schedule, healthData),
    healthData,
    criticalThreshold: {
      metric: 'heartRate',
      operator: '>',
      value: 130 + (index % 15),
      message: 'Kritik nabız eşiği aşıldı: acil değerlendirme önerilir.',
    },
    warningThreshold: {
      metric: 'heartRate',
      operator: '>',
      value: 100 + (index % 15),
      message: 'Yüksek nabız: dinlenin ve ölçümü tekrarlayın.',
    },
  };
}

/** Permanent 300-patient seed dataset embedded in codebase (deterministic, restart-safe). */
export const STATIC_MOCK_PATIENTS: AnonymizedPatient[] = Array.from({ length: 300 }, (_, i) => buildStaticPatient(i));

export async function seedPatients(): Promise<void> {
  const existing = await repository.findAll();
  if (existing.length >= 300) return;

  for (const patient of STATIC_MOCK_PATIENTS) {
    const current = await repository.findByPseudonym(patient.pseudonym);
    if (!current) {
      await repository.save(structuredClone(patient));
    }
  }
}
