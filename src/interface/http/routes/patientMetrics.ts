import { Router, type Request, type Response, type NextFunction } from 'express';
import {
  recordPatientMetrics,
  registerPatient,
  repository,
  analyzer,
} from '../../../infrastructure/config/dependencies.js';
import { getJsonBody } from '../utils/request.js';

const router = Router({ mergeParams: true });

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = getJsonBody(req);
    const result = await registerPatient.execute(body);
    res.status(201).json({ success: true, message: 'Hasta kaydı başarıyla tamamlandı.', ...result });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const patients = await repository.findAll();
    const payload = patients.map((patient) => ({
      pseudonym: patient.pseudonym,
      displayCode: patient.displayCode ?? null,
      ageGroup: patient.ageGroup ?? null,
      conditionGroup: patient.conditionGroup ?? null,
      measurementCount: patient.healthData.length,
      latest: patient.healthData.at(-1) ?? null,
      risk: analyzer.analyze(patient),
    }));
    res.json({ patients: payload });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/metrics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = getJsonBody(req);
    const result = await recordPatientMetrics.execute(req.params.id, body);
    res.status(201).json({ success: true, message: 'Vital ölçüm başarıyla kaydedildi.', ...result });
  } catch (err) {
    next(err);
  }
});

export { router as patientMetricsRouter };
