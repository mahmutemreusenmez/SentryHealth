import { Router, type Request, type Response, type NextFunction } from 'express';
import { repository } from '../../../infrastructure/config/dependencies.js';
import { computeMewsScore, type MewsScoreEntry } from '../../../application/services/MewsScore.js';

const router = Router();

export { computeMewsScore, type MewsScoreEntry };

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
