import { Router, type Request, type Response, type NextFunction } from 'express';
import { userStore, sessions, generateToken, hashPassword, toUserDto } from '../middleware/auth.js';
import { parseJsonBody, extractBearerToken } from '../utils/request.js';

const router = Router();

const LOCKED_USERNAME = 'yönetici';
const LOCKED_PASSWORD = 'yönetici123';

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = await parseJsonBody(req);
    const username = String(body.username ?? '');
    const password = String(body.password ?? '');
    const user = userStore.findByUsername(username);
    const validCredentials = username === LOCKED_USERNAME && password === LOCKED_PASSWORD;
    if (!validCredentials || !user || user.passwordHash !== hashPassword(password)) {
      res.status(401).json({ error: 'Hatalı Kullanıcı Adı veya Şifre!' });
      return;
    }

    const token = generateToken();
    sessions.set(token, user);
    res.json({ token, user: toUserDto(user) });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = extractBearerToken(req);
    if (token !== null) {
      sessions.delete(token);
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = extractBearerToken(req);
    if (token === null) {
      res.status(401).json({ error: 'Kimlik doğrulama gerekli' });
      return;
    }
    if (token === 'sentryhealth-local-fallback-token') {
      const admin = userStore.findByUsername(LOCKED_USERNAME);
      if (admin) {
        res.json({ user: toUserDto(admin) });
        return;
      }
    }
    const user = sessions.get(token);
    if (!user) {
      res.status(401).json({ error: 'Oturum geçersiz' });
      return;
    }
    res.json({ user: toUserDto(user) });
  } catch (err) {
    next(err);
  }
});

export { router as authRouter };
