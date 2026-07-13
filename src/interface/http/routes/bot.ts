import { Router, type Request, type Response, type NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { repository, recordPatientMetrics } from '../../../infrastructure/config/dependencies.js';
import { ValidationError } from '../../../application/errors/ValidationError.js';

const router = Router();

interface BotOutboundPayload {
  pseudonym: string;
  channel?: 'voice' | 'sms';
  messageTemplate?: string;
}

function parseBloodPressure(raw: unknown): string | { systolic: number; diastolic: number } {
  if (typeof raw === 'string') {
    const parts = raw.split('/').map((s) => s.trim());
    if (parts.length === 2) return raw;
    throw new ValidationError('Tansiyon değeri "sistolik/diastolik" formatında olmalıdır');
  }
  if (typeof raw === 'object' && raw !== null) {
    const bp = raw as Record<string, unknown>;
    const systolic = Number(bp.systolic);
    const diastolic = Number(bp.diastolic);
    if (Number.isNaN(systolic) || Number.isNaN(diastolic)) {
      throw new ValidationError('Tansiyon değerleri sayı olmalıdır');
    }
    return { systolic, diastolic };
  }
  throw new ValidationError('Tansiyon değeri geçersiz');
}

function simulateBotResponse(pseudonym: string, channel: 'voice' | 'sms') {
  const hr = Math.round(60 + Math.random() * 40);
  const sys = Math.round(110 + Math.random() * 30);
  const dia = Math.round(70 + Math.random() * 20);
  const spo2 = Math.round(94 + Math.random() * 6);
  const temp = Number((36.2 + Math.random() * 1.8).toFixed(1));

  const jobId = `bot-${randomUUID().slice(0, 8)}`;
  const provider = channel === 'voice' ? 'vapi' : 'twilio';
  const providerId = `${provider}-${randomUUID().slice(0, 12)}`;

  return {
    jobId,
    provider,
    providerId,
    simulatedValues: {
      heartRate: hr,
      bloodPressure: `${sys}/${dia}`,
      oxygenSaturation: spo2,
      bodyTemperature: temp,
    },
    transcript: `${pseudonym} numaralı hasta ile ${channel === 'voice' ? 'sesli' : 'SMS'} etkileşim tamamlandı. Yanıtlar: Nabız ${hr}, SpO2 %${spo2}, Tansiyon ${sys}/${dia}.`,
  };
}

router.post('/trigger', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) ? req.body as Record<string, unknown> : {};
    const pseudonym = String(body.pseudonym || '').trim();
    if (!pseudonym) throw new ValidationError('Hasta pseudonym gerekli');

    const patient = await repository.findByPseudonym(pseudonym);
    if (!patient) return res.status(404).json({ error: 'Hasta bulunamadı' });

    const channel = String(body.channel || 'voice').trim() as 'voice' | 'sms';
    if (channel !== 'voice' && channel !== 'sms') throw new ValidationError('Geçersiz kanal');

    const simulation = simulateBotResponse(pseudonym, channel);
    const result = await recordPatientMetrics.execute(pseudonym, simulation.simulatedValues);

    return res.json({
      success: true,
      jobId: simulation.jobId,
      channel,
      provider: simulation.provider,
      providerId: simulation.providerId,
      status: 'completed',
      transcript: simulation.transcript,
      values: simulation.simulatedValues,
      result,
    });
  } catch (err) {
    return next(err);
  }
});

router.post('/webhook', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) ? req.body as Record<string, unknown> : {};
    const pseudonym = String(body.pseudonym || '').trim();
    if (!pseudonym) throw new ValidationError('Hasta pseudonym gerekli');

    const values = (body.values ?? body) as Record<string, unknown>;
    const heartRate = Number(values.heartRate ?? values.heart_rate);
    const oxygenSaturation = Number(values.oxygenSaturation ?? values.oxygen_saturation);
    const bodyTemperature = Number(values.bodyTemperature ?? values.body_temperature);
    const bloodPressure = parseBloodPressure(values.bloodPressure ?? values.blood_pressure ?? values.bp);

    if (Number.isNaN(heartRate) || Number.isNaN(oxygenSaturation) || Number.isNaN(bodyTemperature)) {
      throw new ValidationError('Vital değerler sayı olmalıdır');
    }

    const payload = { heartRate, bloodPressure, oxygenSaturation, bodyTemperature };
    const result = await recordPatientMetrics.execute(pseudonym, payload);

    return res.json({ success: true, ...result, message: 'Bot verisi başarıyla kaydedildi.' });
  } catch (err) {
    return next(err);
  }
});

export { router as botRouter };
