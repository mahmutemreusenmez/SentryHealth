import { Router, type Request, type Response, type NextFunction } from 'express';
import { patients, analytics } from '../../../data/patientsMockData.js';

const router = Router();

router.get('/patients', (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ generatedAt: new Date().toISOString(), patients, analytics });
  } catch (err) {
    next(err);
  }
});

export { router as dashboardRouter };
