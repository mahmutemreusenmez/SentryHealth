import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID, randomInt } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import type { AnonymizedPatient } from '../../application/ports/Anonymizer.js';
import { healthDataRouter } from '../../interface/http/routes/healthData.js';
import { patientMetricsRouter } from '../../interface/http/routes/patientMetrics.js';
import { dashboardRouter } from '../../interface/http/routes/dashboard.js';
import { authRouter } from '../../interface/http/routes/auth.js';
import { adminRouter } from '../../interface/http/routes/admin.js';
import { authMiddleware, adminMiddleware } from '../../interface/http/middleware/auth.js';
import { ValidationError } from '../../application/errors/ValidationError.js';
import { repository, registerPatient } from '../config/dependencies.js';
import type { PatientThreshold } from '../../application/ports/Anonymizer.js';
import type { HealthMetrics } from '../../domain/entities/HealthMetrics.js';

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

async function seedMockData(): Promise<void> {
  const existing = await repository.findAll();
  if (existing.length > 0) return;

    const trFirst = ['Ahmet','Mehmet','Ayşe','Fatma','Ali','Mustafa','Emine','Hatice','Hasan','Hüseyin','Zeynep','Elif','Osman','Kemal','Murat','Selin','Burak','Cem','Canan','Nazan'];
    const trLast = ['Yılmaz','Kaya','Demir','Şahin','Yıldız','Çelik','Aydın','Öztürk','Doğan','Kılıç','Arslan','Aslan','Aksoy','Baran','Tekin','Eroğlu','Yavuz','Turan','Tuncer','Özdemir'];
    const enFirst = ['John','Michael','Emily','Sarah','David','Robert','Jessica','William','James','Jennifer','Thomas','Daniel','Mary','Patricia','Christopher','Matthew','Andrew','Joshua','Amanda','Laura'];
    const enLast = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez','Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin'];
    const arFirst = ['محمد','أحمد','علي','عمر','خالد','يوسف','حسن','فاطمة','عائشة','مريم','ساره','ليلى','نور','ريم','نورة','فهد','سلطان','عبدالله','نايف','سعد'];
    const arLast = ['الحربي','العتيبي','القحطاني','الدويسي','الزهراني','المالكي','الشمري','الرشيد','السبيعي','المطيري','البلوي','الصيعري','الجهني','الروقي','الخالدي','الغامدي','الحسين','الشريف','العباس','الفهد'];
    const namePools = { tr: { first: trFirst, last: trLast }, en: { first: enFirst, last: enLast }, ar: { first: arFirst, last: arLast } };

    const conditions = ['Diyabet','Hipertansiyon','KOAH','Kalp Yetmezliği','Astım','Kronik Böbrek Hastalığı','Diğer'];
    const questionTemplates = [
      'Son 24 saatte ne kadar su tükettiniz?',
      'İlaçlarınızı düzenli aldınız mı?',
      'Ağrı veya nefes daralması yaşıyor musunuz?',
      'Dün gece uyku düzeniniz nasıldı?',
      'Kan şekeri ölçümünüzü yaptınız mı?',
    ];

    for (let i = 0; i < 200; i++) {
      try {
        const lang = (['tr','en','ar'] as const)[randomInt(0, 3)];
        const first = namePools[lang].first[randomInt(0, namePools[lang].first.length)];
        const last = namePools[lang].last[randomInt(0, namePools[lang].last.length)];
        const fullName = `${first} ${last}`;
        const nationalId = String(10000000000 + i).padStart(11, '0');
        const year = randomInt(1940, 1995);
        const month = randomInt(1, 13);
        const day = randomInt(1, 29);
        const dateOfBirth = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const condition = conditions[randomInt(0, conditions.length)];
        const contactChannel = Math.random() < 0.5 ? 'sms' : 'ai';

        const result = await registerPatient.execute({
          fullName,
          nationalId,
          dateOfBirth,
          condition,
          contactChannel,
        });

        const patient = await repository.findByPseudonym(result.pseudonym);
        if (!patient) continue;

        const measurements: HealthMetrics[] = [];
        const count = randomInt(4, 10);
        for (let j = 0; j < count; j++) {
          const d = new Date();
          d.setMonth(d.getMonth() - randomInt(0, 12));
          d.setDate(d.getDate() - randomInt(0, 28));
          d.setHours(randomInt(8, 22), randomInt(0, 59), 0, 0);
          const hr = randomInt(55, 145);
          const sys = randomInt(100, 190);
          const dia = randomInt(60, 120);
          const spo2 = randomInt(88, 100);
          const temp = Number((36.0 + Math.random() * 3.5).toFixed(1));
          measurements.push({
            timestamp: d,
            heartRate: hr,
            bloodPressureSystolic: sys,
            bloodPressureDiastolic: dia,
            oxygenSaturation: spo2,
            temperature: temp,
          });
        }
        measurements.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        patient.healthData = measurements;

        const criticalValue = randomInt(130, 150);
        patient.criticalThreshold = {
          metric: 'heartRate',
          operator: '>',
          value: criticalValue,
          message: `${criticalValue} bpm üzeri kritik: acil servise başvurun.`,
        };
        const warningValue = randomInt(100, 120);
        patient.warningThreshold = {
          metric: 'heartRate',
          operator: '>',
          value: warningValue,
          message: `${warningValue} bpm üzeri yüksek: dinlenin ve tekrar ölçün.`,
        };
        patient.customQuestion = questionTemplates[randomInt(0, questionTemplates.length)];
        patient.questionTimes = ['09:00', '18:00'];
        await repository.save(patient);
      } catch (err) {
        console.error('Seed error:', err);
      }
    }
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

function findPublicDir(): string {
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

  throw new Error('public directory with index.html not found');
}

const publicDir = findPublicDir();

export async function createServer() {
  await seedMockData();
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

      await repository.save(patient);
      res.json({ success: true });
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
      res.json({ success: true, record });
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
      res.json({ success: true });
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
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    const status = err instanceof ValidationError ? 400 : 500;
    res.status(status).json({ error: err.message });
  });

  return app;
}
