import { writeFileSync, mkdirSync } from 'node:fs';
import { STATIC_MOCK_PATIENTS } from '../src/infrastructure/config/seedPatients.js';
import { analyzer } from '../src/infrastructure/config/dependencies.js';
import { buildInteractionLog } from '../src/application/services/InteractionLogBuilder.js';
import type { AnonymizedPatient } from '../src/application/ports/Anonymizer.js';

function monthKey(d: Date) {
  const m = d.getMonth() + 1;
  return `${d.getFullYear()}-${m < 10 ? '0' : ''}${m}`;
}

function last12Months() {
  const months: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(monthKey(d));
  }
  return months;
}

function buildAnalytics(patients: AnonymizedPatient[]) {
  const months = last12Months();
  const responses = new Map<string, number>(months.map((m) => [m, 0]));
  const alarms = new Map<string, number>(months.map((m) => [m, 0]));

  for (const patient of patients) {
    for (const entry of patient.healthData) {
      const m = monthKey(entry.timestamp);
      if (responses.has(m)) {
        responses.set(m, (responses.get(m) ?? 0) + 1);
      }
      const synthetic: AnonymizedPatient = { ...patient, healthData: [entry] };
      const risk = analyzer.analyze(synthetic);
      if ((risk.level === 'high' || risk.level === 'critical') && alarms.has(m)) {
        alarms.set(m, (alarms.get(m) ?? 0) + 1);
      }
    }
  }

  const distributionMap = new Map<string, number>();
  for (const patient of patients) {
    const cg = patient.conditionGroup || 'Diğer';
    distributionMap.set(cg, (distributionMap.get(cg) ?? 0) + 1);
  }
  const distribution = Array.from(distributionMap.entries()).map(([label, value]) => ({ label, value }));

  return {
    months,
    responses: months.map((m) => responses.get(m) ?? 0),
    alarms: months.map((m) => alarms.get(m) ?? 0),
    distribution,
  };
}

function buildPayload(patient: AnonymizedPatient) {
  const latest = patient.healthData.at(-1) ?? null;
  const history = patient.healthData.slice(-20).map((h) => ({
    timestamp: h.timestamp,
    heartRate: h.heartRate,
    oxygenSaturation: h.oxygenSaturation,
    temperature: h.temperature,
    bloodPressureSystolic: h.bloodPressureSystolic,
    bloodPressureDiastolic: h.bloodPressureDiastolic,
  }));
  const risk = analyzer.analyze(patient);
  const interactionLog = patient.schedule ? buildInteractionLog(patient.schedule, patient.healthData) : [];

  return {
    pseudonym: patient.pseudonym,
    displayCode: patient.displayCode ?? null,
    name: patient.name ?? null,
    nationalId: patient.nationalId ?? null,
    conditionGroup: patient.conditionGroup ?? null,
    diagnosis: patient.diagnosis ?? null,
    clinicalStatus: patient.clinicalStatus ?? null,
    maskedNationalId: patient.maskedNationalId ?? null,
    phone: patient.phone ?? null,
    ageGroup: patient.ageGroup ?? null,
    contactChannel: patient.contactChannel ?? null,
    customQuestion: patient.customQuestion ?? null,
    questionTimes: patient.questionTimes ?? [],
    criticalThreshold: patient.criticalThreshold ?? null,
    warningThreshold: patient.warningThreshold ?? null,
    patientMessage: risk.patientMessage ?? null,
    caregiver: patient.caregiver ?? null,
    schedule: patient.schedule ?? null,
    interactionLog,
    latest,
    history,
    risk,
  };
}

const patients = STATIC_MOCK_PATIENTS.map(buildPayload);
const analytics = buildAnalytics(STATIC_MOCK_PATIENTS);

function serializeWithDates(obj: unknown): string {
  let json = JSON.stringify(obj);
  // Rehydrate ISO timestamp strings into Date instances so the static arrays are typed correctly
  json = json.replace(/"timestamp":\s*"([^"]+)"/g, '"timestamp": new Date("$1")');
  return json;
}

const tsContent = `export const patients: any[] = ${serializeWithDates(patients)};\n\nexport const analytics: any = ${serializeWithDates(analytics)};\n`;
const jsContent = `export const patients = ${serializeWithDates(patients)};\n\nexport const analytics = ${serializeWithDates(analytics)};\n`;

mkdirSync('src/data', { recursive: true });
mkdirSync('public/data', { recursive: true });
writeFileSync('src/data/patientsMockData.ts', tsContent);
writeFileSync('public/data/patientsMockData.js', jsContent);

console.log(`Generated static patients: ${patients.length} rows`);
console.log(`Files: src/data/patientsMockData.ts, public/data/patientsMockData.js`);
