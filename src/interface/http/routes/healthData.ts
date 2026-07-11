import { Router, type Request, type Response, type NextFunction } from 'express';
import { submitUseCase, analyzeUseCase, repository } from '../../../infrastructure/config/dependencies.js';

const router = Router();

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await submitUseCase.execute(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/:pseudonym', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await repository.findByPseudonym(req.params.pseudonym);
    if (!data) return res.status(404).json({ error: 'Not found' });

    const assessment = analyzeUseCase.execute(data);
    res.json({ ...data, risk: assessment });
  } catch (err) {
    next(err);
  }
});

export { router as healthDataRouter };
