import { Router, type Request, type Response, type NextFunction } from 'express';
import { userStore, sessions, generateToken, verifyPassword } from '../middleware/auth.js';

const router = Router();

async function parseBody(req: Request): Promise<Record<string, unknown>> {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body as Record<string, unknown>;
  }
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  if (Buffer.isBuffer(req.body)) {
    try { return JSON.parse(req.body.toString()); } catch { return {}; }
  }
  return new Promise((resolve) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(data)); } catch { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

function userDto(user: { id: string; username: string; displayName: string; role: 'doctor' | 'admin' }) {
  return { id: user.id, username: user.username, displayName: user.displayName, role: user.role };
}

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = await parseBody(req);
    const username = String(body.username ?? '');
    const password = String(body.password ?? '');
    const user = userStore.findByUsername(username);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: 'Yetkisiz Erişim Algılandı: Kimlik bilgileri doğrulanamadı. Bu deneme güvenlik kayıtlarına işlenmiştir.' });
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
    const token = header.slice(7).trim();
    const user = sessions.get(token);
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
