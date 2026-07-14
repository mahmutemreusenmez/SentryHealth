import { Router, type Request, type Response, type NextFunction } from 'express';
import { repository, analyzer } from '../../../infrastructure/config/dependencies.js';
import type { AnonymizedPatient } from '../../../application/ports/Anonymizer.js';
import { buildInteractionLog } from '../../../application/services/InteractionLogBuilder.js';

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
        interactionLog: patient.schedule ? buildInteractionLog(patient.schedule, patient.healthData) : [],
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
