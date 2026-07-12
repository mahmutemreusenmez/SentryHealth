import { Router, type Request, type Response, type NextFunction } from 'express';
import { userStore } from '../middleware/auth.js';

const router = Router();

router.get('/doctors', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const doctors = userStore.findAll().filter((user) => user.role === 'doctor');
    res.json({ doctors });
  } catch (err) {
    next(err);
  }
});

router.post('/doctors', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body))
      ? (req.body as Record<string, unknown>)
      : {};
    const { username, displayName, password } = body;
    const doctor = userStore.createDoctor({
      username: String(username ?? ''),
      displayName: String(displayName ?? ''),
      password: String(password ?? ''),
    });
    res.status(201).json({ success: true, message: 'Doktor başarıyla sisteme tanımlanmıştır ve TÜSEB Sağlık Ağına senkronize edilmiştir.', doctor });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Doktor eklenemedi' });
  }
});

router.delete('/doctors/:username', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const username = req.params.username.trim().toLowerCase();
    const deleted = userStore.delete(username);
    if (!deleted) {
      res.status(404).json({ error: 'Doktor bulunamadı' });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Silme işlemi başarısız' });
  }
});

export { router as adminRouter };
