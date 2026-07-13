import { Router, type Request, type Response, type NextFunction } from 'express';
import { repository } from '../../../infrastructure/config/dependencies.js';

const router = Router();

export interface MewsScoreEntry {
  timestamp: string;
  heartRate: number;
  oxygenSaturation: number;
  temperature: number;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  respiratoryRate: number;
  score: number;
  level: 'low' | 'medium' | 'high';
}

export function computeMewsScore(entry: {
  heartRate: number;
  oxygenSaturation: number;
  temperature: number;
  bloodPressureSystolic: number;
  respiratoryRate?: number;
}): { score: number; level: 'low' | 'medium' | 'high' } {
  const hr = Number(entry.heartRate || 0);
  const sys = Number(entry.bloodPressureSystolic || 0);
  const temp = Number(entry.temperature || 0);
  const spo2 = Number(entry.oxygenSaturation || 0);
  const rr = Number(entry.respiratoryRate ?? 0);

  let score = 0;

  if (hr >= 130 || hr < 40) score += 2;
  else if (hr >= 110 || hr < 50) score += 1;
  else if (hr >= 100) score += 1;

  if (sys >= 200 || sys < 70) score += 2;
  else if (sys >= 160 || sys < 90) score += 1;

  if (spo2 < 90) score += 2;
  else if (spo2 < 93) score += 1;

  if (temp >= 38.5 || temp < 35.0) score += 1;

  if (rr >= 30 || rr < 9) score += 2;
  else if (rr >= 21) score += 1;

  let level: 'low' | 'medium' | 'high' = 'low';
  if (score >= 5) level = 'high';
  else if (score >= 3) level = 'medium';

  return { score, level };
}

function getRespiratoryRate(healthData: any): number {
  if (healthData && healthData.respiratoryRate) return Number(healthData.respiratoryRate);
  return 0;
}

router.get('/patient/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patient = await repository.findByPseudonym(req.params.id);
    if (!patient) return res.status(404).json({ error: 'Hasta bulunamadı' });

    const scores: MewsScoreEntry[] = patient.healthData.map((h) => {
      const mews = computeMewsScore({
        heartRate: h.heartRate,
        oxygenSaturation: h.oxygenSaturation,
        temperature: h.temperature,
        bloodPressureSystolic: h.bloodPressureSystolic,
        respiratoryRate: getRespiratoryRate(h),
      });
      return {
        timestamp: h.timestamp instanceof Date ? h.timestamp.toISOString() : String(h.timestamp),
        heartRate: h.heartRate,
        oxygenSaturation: h.oxygenSaturation,
        temperature: h.temperature,
        bloodPressureSystolic: h.bloodPressureSystolic,
        bloodPressureDiastolic: h.bloodPressureDiastolic,
        respiratoryRate: getRespiratoryRate(h),
        score: mews.score,
        level: mews.level,
      };
    });

    const latest = scores.at(-1) || null;
    return res.json({
      pseudonym: patient.pseudonym,
      latest,
      history: scores,
    });
  } catch (err) {
    return next(err);
  }
});

router.get('/clinic', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const patients = await repository.findAll();
    const snapshots: { date: string; avgScore: number; low: number; medium: number; high: number }[] = [];

    const dateMap = new Map<string, { total: number; count: number; low: number; medium: number; high: number }>();

    for (const patient of patients) {
      for (const h of patient.healthData) {
        const date = h.timestamp instanceof Date ? h.timestamp.toISOString().slice(0, 10) : String(h.timestamp).slice(0, 10);
        const mews = computeMewsScore({
          heartRate: h.heartRate,
          oxygenSaturation: h.oxygenSaturation,
          temperature: h.temperature,
          bloodPressureSystolic: h.bloodPressureSystolic,
          respiratoryRate: getRespiratoryRate(h),
        });

        const existing = dateMap.get(date) || { total: 0, count: 0, low: 0, medium: 0, high: 0 };
        existing.total += mews.score;
        existing.count += 1;
        if (mews.level === 'low') existing.low += 1;
        else if (mews.level === 'medium') existing.medium += 1;
        else existing.high += 1;
        dateMap.set(date, existing);
      }
    }

    const sortedDates = Array.from(dateMap.keys()).sort();
    for (const date of sortedDates) {
      const v = dateMap.get(date)!;
      snapshots.push({ date, avgScore: v.count ? Number((v.total / v.count).toFixed(2)) : 0, low: v.low, medium: v.medium, high: v.high });
    }

    return res.json({ snapshots });
  } catch (err) {
    return next(err);
  }
});

export { router as scorecardRouter };
