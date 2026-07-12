import { randomInt } from 'node:crypto';
import { repository, registerPatient } from './dependencies.js';

const TR_FIRST_NAMES = [
  'Ahmet', 'Mehmet', 'Ali', 'Mustafa', 'Hasan', 'Hüseyin', 'İbrahim', 'Osman', 'Kemal', 'Murat',
  'Burak', 'Cem', 'Can', 'Barış', 'Emre', 'Serkan', 'Tolga', 'Umut', 'Yusuf', 'Oğuz',
  'Ayşe', 'Fatma', 'Emine', 'Hatice', 'Zeynep', 'Elif', 'Meryem', 'Suna', 'Sevim', 'Leyla',
  'Selin', 'Ceren', 'Büşra', 'Esra', 'Nazan', 'Derya', 'Aslı', 'Pınar', 'Gizem', 'Hülya',
  'Cengiz', 'Erdal', 'Fikret', 'Gürkan', 'Halil', 'İsmail', 'Kadir', 'Levent', 'Mahmut', 'Necmi'
];

const TR_LAST_NAMES = [
  'Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Yıldız', 'Çelik', 'Aydın', 'Öztürk', 'Doğan', 'Kılıç',
  'Arslan', 'Aslan', 'Aksoy', 'Baran', 'Tekin', 'Eroğlu', 'Yavuz', 'Turan', 'Tuncer', 'Özdemir',
  'Korkmaz', 'Polat', 'Koç', 'Güneş', 'Balcı', 'Ateş', 'Yalçın', 'Ünlü', 'Keskin', 'Şen',
  'Karaca', 'Mutlu', 'Sönmez', 'Özkan', 'Acar', 'Duman', 'Akın', 'Taş', 'Ceylan', 'Yüksel',
  'Sarı', 'Avcı', 'Güler', 'Başar', 'Toprak', 'Yıldırım', 'Soylu', 'Koca', 'Çetin', 'Kurt'
];

const RELATIONSHIPS = ['Eş', 'Çocuk', 'Kardeş', 'Anne', 'Baba', 'Yeğen', 'Dost/Akraba'];

const CONDITIONS = ['KOAH', 'Diyabet', 'Hipertansiyon', 'Kalp Yetmezliği'];

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

function generateMaskedTC(): string {
  const base = randomInt(100000000, 999999999);
  const tc = String(base).padStart(9, '0') + String(randomInt(0, 99)).padStart(2, '0') + String(randomInt(0, 9));
  return tc.padStart(11, '0');
}

function deriveDateOfBirth(age: number): string {
  const year = new Date().getFullYear() - age;
  const month = randomInt(1, 13);
  const day = randomInt(1, 29);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function randomPhone(): string {
  const prefix = ['530', '531', '532', '533', '534', '535', '536', '537', '538', '539', '505', '506', '507', '551', '552', '553', '554', '555'][randomInt(0, 18)];
  return `0${prefix} ${randomInt(100, 1000)} ${String(randomInt(10, 100)).padStart(2, '0')} ${String(randomInt(10, 100)).padStart(2, '0')}`;
}

function generateMeasurements(condition: string, count: number) {
  const measurements: { timestamp: Date; heartRate: number; bloodPressureSystolic: number; bloodPressureDiastolic: number; oxygenSaturation: number; temperature: number }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 2);
    d.setHours(randomInt(8, 22), randomInt(0, 60), 0, 0);

    let hr = randomInt(60, 110);
    let sys = randomInt(110, 150);
    let dia = randomInt(70, 95);
    let spo2 = randomInt(92, 100);
    let temp = Number((36.2 + Math.random() * 1.0).toFixed(1));

    if (condition === 'KOAH') {
      spo2 = randomInt(86, 97);
      hr = randomInt(70, 120);
    } else if (condition === 'Hipertansiyon') {
      sys = randomInt(120, 180);
      dia = randomInt(80, 110);
    } else if (condition === 'Diyabet') {
      temp = Number((36.4 + Math.random() * 0.6).toFixed(1));
    } else if (condition === 'Kalp Yetmezliği') {
      hr = randomInt(75, 130);
      spo2 = randomInt(90, 98);
    }

    if (Math.random() < 0.15) {
      hr = randomInt(50, 145);
      sys = randomInt(100, 190);
      spo2 = randomInt(85, 98);
    }

    measurements.push({
      timestamp: d,
      heartRate: hr,
      bloodPressureSystolic: sys,
      bloodPressureDiastolic: dia,
      oxygenSaturation: spo2,
      temperature: temp,
    });
  }
  return measurements.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

export async function seedPatients(): Promise<void> {
  const existing = await repository.findAll();
  if (existing.length > 0) return;

  for (let i = 0; i < 200; i++) {
    const first = TR_FIRST_NAMES[i % TR_FIRST_NAMES.length];
    const last = TR_LAST_NAMES[(i + Math.floor(i / TR_FIRST_NAMES.length)) % TR_LAST_NAMES.length];
    const fullName = `${first} ${last}`;
    const nationalId = generateMaskedTC();
    const age = randomInt(45, 90);
    const dateOfBirth = deriveDateOfBirth(age);
    const condition = CONDITIONS[i % CONDITIONS.length];
    const contactChannel = Math.random() < 0.6 ? 'sms' : 'ai';

    const caregiver = {
      name: `${TR_FIRST_NAMES[(i + 5) % TR_FIRST_NAMES.length]} ${TR_LAST_NAMES[(i + 3) % TR_LAST_NAMES.length]}`,
      relationship: RELATIONSHIPS[i % RELATIONSHIPS.length],
      phone: randomPhone(),
      email: `${fullName.toLowerCase().replace(/\s+/g, '.')}@yakinmail.com`,
    };

    const dayCount = randomInt(1, 8);
    const days: string[] = [];
    while (days.length < dayCount) {
      const d = DAYS[randomInt(0, DAYS.length)];
      if (!days.includes(d)) days.push(d);
    }

    const timeCount = randomInt(1, 4);
    const times: string[] = [];
    for (let t = 0; t < timeCount; t++) {
      times.push(TIME_OPTIONS[t % TIME_OPTIONS.length]);
    }

    const schedule = {
      days,
      times,
      template: QUESTION_TEMPLATES[i % QUESTION_TEMPLATES.length],
    };

    try {
      const result = await registerPatient.execute({
        fullName,
        nationalId,
        dateOfBirth,
        condition,
        contactChannel,
        caregiver,
        schedule,
      });

      const patient = await repository.findByPseudonym(result.pseudonym);
      if (!patient) continue;

      patient.healthData = generateMeasurements(condition, randomInt(6, 16));
      patient.customQuestion = QUESTION_TEMPLATES[i % QUESTION_TEMPLATES.length];
      patient.questionTimes = times;
      await repository.save(patient);
    } catch (err) {
      console.error('Seed patient error:', err);
    }
  }
}
