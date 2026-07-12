import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import type { AnonymizedPatient } from '../../application/ports/Anonymizer.js';
import { healthDataRouter } from '../../interface/http/routes/healthData.js';
import { patientMetricsRouter } from '../../interface/http/routes/patientMetrics.js';
import { dashboardRouter } from '../../interface/http/routes/dashboard.js';
import { authRouter } from '../../interface/http/routes/auth.js';
import { adminRouter } from '../../interface/http/routes/admin.js';
import { authMiddleware, adminMiddleware } from '../../interface/http/middleware/auth.js';
import { ValidationError } from '../../application/errors/ValidationError.js';
import { repository } from '../config/dependencies.js';
import type { PatientThreshold } from '../../application/ports/Anonymizer.js';
import { buildInteractionLog } from '../../application/services/InteractionLogBuilder.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PORT = process.env.PORT || 3000;

const ALLOWED_METRICS = ['heartRate', 'oxygenSaturation', 'temperature', 'systolic', 'diastolic'];
const ALLOWED_OPERATORS = ['>', '<', '>=', '<=', '='];

const ONE_HOUR = 60 * 60 * 1000;
const ONE_YEAR = 365 * 24 * 60 * 60 * 1000;

interface BroadcastRecord {
  id: string;
  branch: string;
  template: string;
  message: string;
  channel: 'sms' | 'push' | 'both';
  targetCount: number;
  createdAt: string;
}

interface VoiceScenario {
  prompt: string;
  voiceKey: string;
  rate: number;
  updatedAt: string;
}

const broadcasts: BroadcastRecord[] = [];
let voiceScenario: VoiceScenario = {
  prompt: 'Merhaba [Hasta Adı], son ölçümünüz [Son Ölçüm] ve [Hastalık Tipi] takibiniz için sizi arıyorum. Lütfen ilacınızı düzenli alın ve su tüketimine dikkat edin.',
  voiceKey: 'trF',
  rate: 1,
  updatedAt: new Date().toISOString(),
};

const branchConditionMap: Record<string, string[]> = {
  gastroenterology: ['Diğer'],
  cardiology: ['Kalp Yetmezliği', 'Hipertansiyon'],
  nephrology: ['Kronik Böbrek Hastalığı'],
  endocrinology: ['Diyabet'],
};

function computeBranchTarget(branch: string, patients: AnonymizedPatient[]): number {
  const conditions = branchConditionMap[branch] || [];
  if (conditions.length === 0) return 0;
  return patients.filter((p) => conditions.includes(p.conditionGroup || '')).length;
}

function sanitizeThreshold(raw: unknown): PatientThreshold {
  if (!raw || typeof raw !== 'object') {
    throw new ValidationError('Geçersiz eşik verisi');
  }
  const t = raw as any;
  const metric = String(t.metric ?? '').trim();
  if (!ALLOWED_METRICS.includes(metric)) {
    throw new ValidationError('Geçersiz vital parametre');
  }
  const operator = String(t.operator ?? '').trim();
  if (!ALLOWED_OPERATORS.includes(operator)) {
    throw new ValidationError('Geçersiz operatör');
  }
  const value = Number(t.value);
  if (Number.isNaN(value)) {
    throw new ValidationError('Eşik değeri sayı olmalıdır');
  }
  const message = String(t.message ?? '').trim();
  if (message.length === 0) {
    throw new ValidationError('Eşik mesajı boş olamaz');
  }
  return { metric: metric as PatientThreshold['metric'], operator: operator as PatientThreshold['operator'], value, message };
}

function findPublicDir(): string | null {
  const candidates = [
    path.resolve(process.cwd(), 'public'),
    path.resolve(__dirname, '..', '..', 'public'),
    path.resolve(__dirname, '..', '..', '..', 'public'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'index.html'))) {
      return candidate;
    }
  }

  let dir = __dirname;
  while (dir !== path.dirname(dir)) {
    const candidate = path.resolve(dir, 'public');
    if (fs.existsSync(path.join(candidate, 'index.html'))) {
      return candidate;
    }
    dir = path.dirname(dir);
  }

  return null;
}

const publicDir = findPublicDir();

export async function createServer() {
  const app = express();
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  if (publicDir) {
    app.use(express.static(publicDir, {
      index: ['index.html'],
      maxAge: '1h',
      etag: true,
      lastModified: true,
      setHeaders: (res: Response, filePath: string) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        } else if (filePath.match(/\.(js|css|svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$/)) {
          res.setHeader('Cache-Control', `public, max-age=${ONE_YEAR / 1000}, immutable`);
        } else {
          res.setHeader('Cache-Control', `public, max-age=${ONE_HOUR / 1000}`);
        }
      },
    }));

    app.get('/', (_req: Request, res: Response) => {
      res.sendFile(path.join(publicDir, 'index.html'));
    });
  }

  app.put('/api/patients/:id/clinical-plan', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const patient = await repository.findByPseudonym(req.params.id);
      if (!patient) {
        return res.status(404).json({ error: 'Hasta bulunamadı' });
      }

      const body = req.body as any;
      if (body.contactChannel !== undefined) {
        const channel = String(body.contactChannel).trim();
        if (channel === 'sms' || channel === 'ai') {
          patient.contactChannel = channel;
        }
      }
      if (body.customQuestion !== undefined) {
        patient.customQuestion = String(body.customQuestion).trim();
      }
      if (body.questionTimes !== undefined) {
        patient.questionTimes = Array.isArray(body.questionTimes)
          ? body.questionTimes.map((t: unknown) => String(t).trim()).filter((t: string) => t.length > 0)
          : [];
      }
      if (body.criticalThreshold) {
        patient.criticalThreshold = sanitizeThreshold(body.criticalThreshold);
      } else if (body.criticalThreshold === null) {
        delete patient.criticalThreshold;
      }
      if (body.warningThreshold) {
        patient.warningThreshold = sanitizeThreshold(body.warningThreshold);
      } else if (body.warningThreshold === null) {
        delete patient.warningThreshold;
      }
      if (body.caregiver !== undefined) {
        const c = body.caregiver;
        const name = String(c.name ?? '').trim();
        const relationship = String(c.relationship ?? '').trim();
        const phone = String(c.phone ?? '').trim();
        const email = String(c.email ?? '').trim();
        if (name || phone || email) {
          patient.caregiver = { name, relationship, phone, email };
        } else {
          delete patient.caregiver;
        }
      }
      if (body.schedule !== undefined) {
        const s = body.schedule;
        const days = Array.isArray(s.days) ? s.days.map((d: unknown) => String(d).trim()).filter((d: string) => d.length > 0) : [];
        const times = Array.isArray(s.times) ? s.times.map((t: unknown) => String(t).trim()).filter((t: string) => t.length > 0) : [];
        const template = String(s.template ?? '').trim();
        if (days.length || times.length || template) {
          patient.schedule = { days, times, template };
          patient.interactionLog = buildInteractionLog(patient.schedule, patient.healthData);
        } else {
          delete patient.schedule;
          delete patient.interactionLog;
        }
      }

      await repository.save(patient);
      res.json({ success: true, message: 'Klinik plan başarıyla güncellendi.' });
    } catch (err) {
      next(err);
    }
  });

  app.use('/api/auth', authRouter);
  app.use('/api/admin', authMiddleware, adminMiddleware, adminRouter);
  app.use('/api/v1/health-data', authMiddleware, healthDataRouter);
  app.use('/api/patients', authMiddleware, patientMetricsRouter);
  app.use('/api/dashboard', authMiddleware, dashboardRouter);

  app.get('/api/broadcasts', authMiddleware, (_req: Request, res: Response) => {
    res.json(broadcasts);
  });

  app.post('/api/broadcasts', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as Record<string, unknown>;
      const branch = String(body.branch || '').trim();
      const template = String(body.template || '').trim();
      const message = String(body.message || '').trim();
      const rawChannel = String(body.channel || 'sms').trim();
      const channel: BroadcastRecord['channel'] = rawChannel === 'push' || rawChannel === 'both' ? rawChannel : 'sms';
      if (!branch || !message) {
        throw new ValidationError('Branş ve mesaj zorunludur');
      }
      const patients = await repository.findAll();
      const targetCount = computeBranchTarget(branch, patients);
      const record: BroadcastRecord = {
        id: randomUUID(),
        branch,
        template,
        message,
        channel,
        targetCount,
        createdAt: new Date().toISOString(),
      };
      broadcasts.unshift(record);
      if (broadcasts.length > 100) broadcasts.pop();
      res.json({ success: true, message: 'Anons başarıyla oluşturuldu.', record });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/voice-assistant', authMiddleware, (_req: Request, res: Response) => {
    res.json(voiceScenario);
  });

  app.post('/api/voice-assistant', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as Record<string, unknown>;
      const prompt = String(body.prompt || '').trim();
      const voiceKey = String(body.voiceKey || 'trF').trim();
      const rate = Math.min(2, Math.max(0.5, Number(body.rate || 1)));
      if (!prompt) {
        throw new ValidationError('Prompt boş olamaz');
      }
      voiceScenario = { prompt, voiceKey, rate, updatedAt: new Date().toISOString() };
      res.json({ success: true, message: 'Sesli asistan senaryosu güncellendi.' });
    } catch (err) {
      next(err);
    }
  });

  app.get('/health', (_req: Request, res: Response) => res.json({ status: 'ok' }));

  app.use((_req: Request, res: Response, next: NextFunction) => {
    if (_req.path.startsWith('/api/')) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    if (publicDir) {
      res.sendFile(path.join(publicDir, 'index.html'));
      return;
    }
    res.status(404).json({ error: 'Not found' });
  });

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    const status = err instanceof ValidationError ? 400 : 500;
    res.status(status).json({ error: err.message });
  });

  return app;
}
