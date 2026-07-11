import { Router, type Request, type Response, type NextFunction } from 'express';
import { userStore, sessions, generateToken, hashPassword } from '../middleware/auth.js';

const router = Router();

function userDto(user: { id: string; username: string; displayName: string; role: 'doctor' | 'admin' }) {
  return { id: user.id, username: user.username, displayName: user.displayName, role: user.role };
}

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body as Record<string, unknown>;
    const user = userStore.findByUsername(String(username ?? '').trim().toLowerCase());
    if (!user || user.passwordHash !== hashPassword(String(password ?? ''))) {
      res.status(401).json({ error: 'Hatalı kullanıcı adı veya şifre!' });
      return;
    }

    const token = generateToken();
    sessions.set(token, user);
    res.json({ token, user: userDto(user) });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      sessions.delete(header.slice(7).trim());
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Kimlik doğrulama gerekli' });
      return;
    }
    const user = sessions.get(header.slice(7).trim());
    if (!user) {
      res.status(401).json({ error: 'Oturum geçersiz' });
      return;
    }
    res.json({ user: userDto(user) });
  } catch (err) {
    next(err);
  }
});

export { router as authRouter };
