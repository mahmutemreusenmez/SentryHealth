import { Router, type Request, type Response, type NextFunction } from 'express';
import { repository, analyzer } from '../../../infrastructure/config/dependencies.js';
import type { AnonymizedPatient } from '../../../application/ports/Anonymizer.js';

const router = Router();

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

  let hasData = false;
  for (const patient of patients) {
    for (const entry of patient.healthData) {
      hasData = true;
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

  if (!hasData) {
    const demoResponses = [12, 15, 10, 14, 18, 20, 22, 19, 25, 28, 30, 35];
    const demoAlarms = [1, 0, 2, 1, 3, 2, 4, 1, 2, 3, 5, 4];
    months.forEach((m, i) => {
      responses.set(m, demoResponses[i]);
      alarms.set(m, demoAlarms[i]);
    });
  }

  const distributionMap = new Map<string, number>();
  const knownConditions = ['Diyabet', 'Hipertansiyon', 'KOAH', 'Diğer'];
  for (const patient of patients) {
    const cg = patient.conditionGroup || 'Diğer';
    distributionMap.set(cg, (distributionMap.get(cg) ?? 0) + 1);
  }
  if (distributionMap.size === 0) {
    distributionMap.set('Diyabet', 4);
    distributionMap.set('Hipertansiyon', 3);
    distributionMap.set('KOAH', 2);
    distributionMap.set('Diğer', 1);
  }
  const distribution = Array.from(distributionMap.entries()).map(([label, value]) => ({ label, value }));

  return {
    months,
    responses: months.map((m) => responses.get(m) ?? 0),
    alarms: months.map((m) => alarms.get(m) ?? 0),
    distribution,
  };
}

router.get('/patients', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const patients = await repository.findAll();
    const payload = patients.map((patient) => {
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
      return {
        pseudonym: patient.pseudonym,
        displayCode: patient.displayCode ?? null,
        conditionGroup: patient.conditionGroup ?? null,
        ageGroup: patient.ageGroup ?? null,
        contactChannel: patient.contactChannel ?? null,
        customQuestion: patient.customQuestion ?? null,
        questionTimes: patient.questionTimes ?? [],
        criticalThreshold: patient.criticalThreshold ?? null,
        warningThreshold: patient.warningThreshold ?? null,
        patientMessage: risk.patientMessage ?? null,
        latest,
        history,
        risk,
      };
    });
    const analytics = buildAnalytics(patients);
    res.json({ generatedAt: new Date().toISOString(), patients: payload, analytics });
  } catch (err) {
    next(err);
  }
});

export { router as dashboardRouter };
