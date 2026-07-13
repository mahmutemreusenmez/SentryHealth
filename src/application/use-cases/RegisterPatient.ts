import { randomUUID, randomInt } from 'node:crypto';
import type { Anonymizer, AnonymizedPatient } from '../ports/Anonymizer.js';
import type { DataRepository } from '../ports/DataRepository.js';
import { ValidationError } from '../errors/ValidationError.js';
import { buildInteractionLog } from '../services/InteractionLogBuilder.js';

export interface RegisterPatientInput {
  fullName: string;
  nationalId: string;
  dateOfBirth: string;
  condition: string;
  contactChannel: string;
  caregiver?: {
    name: string;
    relationship: string;
    phone: string;
    email: string;
  };
  schedule?: {
    days: string[];
    times: string[];
    template: string;
  };
}

export interface RegisterPatientResult {
  pseudonym: string;
  displayCode: string;
  ageGroup: string;
  conditionGroup: string;
  contactChannel: string;
  caregiver?: RegisterPatientInput['caregiver'];
  schedule?: RegisterPatientInput['schedule'];
  kvkk: {
    maskedName: string;
    maskedNationalId: string;
    pseudonym: string;
    method: 'HMAC-SHA256';
    note: string;
  };
}

const ALLOWED_CONDITIONS = ['Diyabet', 'Hipertansiyon', 'KOAH', 'Kalp Yetmezliği', 'Astım', 'Kronik Böbrek Hastalığı', 'Diğer'];
const ALLOWED_CONTACT_CHANNELS = ['sms', 'ai'];

export class RegisterPatient {
  constructor(
    private readonly anonymizer: Anonymizer,
    private readonly repository: DataRepository
  ) {}

  async execute(raw: unknown): Promise<RegisterPatientResult> {
    const input = this.validate(raw);
    const pseudonym = this.anonymizer.pseudonymize(input.nationalId);

    const existing = await this.repository.findByPseudonym(pseudonym);
    if (existing) {
      throw new ValidationError('Bu T.C. Kimlik No ile kayıtlı bir hasta zaten mevcut');
    }

    const displayCode = `H-${randomInt(10, 100)}${String.fromCharCode(65 + randomInt(0, 26))}`;
    const ageGroup = this.deriveAgeGroup(new Date(input.dateOfBirth));

    const patient: AnonymizedPatient = {
      id: randomUUID(),
      pseudonym,
      ageGroup,
      displayCode,
      conditionGroup: input.condition,
      contactChannel: input.contactChannel as 'sms' | 'ai',
      caregiver: input.caregiver,
      schedule: input.schedule,
      interactionLog: input.schedule ? buildInteractionLog(input.schedule, []) : [],
      healthData: [],
    };

    await this.repository.save(patient);

    return {
      pseudonym,
      displayCode,
      ageGroup,
      conditionGroup: input.condition,
      contactChannel: input.contactChannel,
      caregiver: input.caregiver,
      schedule: input.schedule,
      kvkk: {
        maskedName: this.maskName(input.fullName),
        maskedNationalId: this.maskNationalId(input.nationalId),
        pseudonym,
        method: 'HMAC-SHA256',
        note: 'Ad soyad ve T.C. Kimlik No sistemde SAKLANMAZ. Kimlik, geri döndürülemez HMAC-SHA256 takma adına dönüştürülür; doğum tarihi yaş grubuna genelleştirilir (K-Anonimlik).',
      },
    };
  }

  private validate(raw: unknown): RegisterPatientInput {
    if (!raw || typeof raw !== 'object') {
      throw new ValidationError('Hasta kaydı için JSON gövde gereklidir');
    }
    const body = raw as Record<string, unknown>;

    const fullName = String(body.fullName ?? '').trim();
    if (fullName.length < 3) throw new ValidationError('Adı Soyadı en az 3 karakter olmalıdır');

    const nationalId = String(body.nationalId ?? '').trim();
    if (!/^\d{11}$/.test(nationalId)) throw new ValidationError('T.C. Kimlik No 11 haneli rakam olmalıdır');

    const dateOfBirth = String(body.dateOfBirth ?? '').trim();
    const dob = new Date(dateOfBirth);
    if (!dateOfBirth || Number.isNaN(dob.getTime()) || dob > new Date()) {
      throw new ValidationError('Geçerli bir doğum tarihi giriniz');
    }

    const condition = String(body.condition ?? '').trim();
    if (!ALLOWED_CONDITIONS.includes(condition)) {
      throw new ValidationError(`Kronik hastalık grubu şunlardan biri olmalıdır: ${ALLOWED_CONDITIONS.join(', ')}`);
    }

    const rawContact = String(body.contactChannel ?? 'sms').trim();
    const contactChannel = ALLOWED_CONTACT_CHANNELS.includes(rawContact) ? rawContact : 'sms';

    const caregiver = this.parseCaregiver(body.caregiver);
    const schedule = this.parseSchedule(body.schedule);

    return { fullName, nationalId, dateOfBirth, condition, contactChannel, caregiver, schedule };
  }

  private parseCaregiver(raw: unknown): RegisterPatientInput['caregiver'] | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const c = raw as Record<string, unknown>;
    const name = String(c.name ?? '').trim();
    const relationship = String(c.relationship ?? '').trim();
    const phone = String(c.phone ?? '').trim();
    const email = String(c.email ?? '').trim();
    if (name.length === 0 && phone.length === 0 && email.length === 0) return undefined;
    return { name, relationship, phone, email };
  }

  private parseSchedule(raw: unknown): RegisterPatientInput['schedule'] | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const s = raw as Record<string, unknown>;
    const days = Array.isArray(s.days) ? s.days.map((d) => String(d).trim()).filter((d) => d.length > 0) : [];
    const times = Array.isArray(s.times) ? s.times.map((t) => String(t).trim()).filter((t) => t.length > 0) : [];
    const template = String(s.template ?? '').trim();
    if (days.length === 0 && times.length === 0 && template.length === 0) return undefined;
    return { days, times, template };
  }

  private deriveAgeGroup(dateOfBirth: Date): string {
    const age = new Date().getFullYear() - dateOfBirth.getFullYear();
    if (age < 18) return '0-17';
    if (age < 35) return '18-34';
    if (age < 50) return '35-49';
    if (age < 65) return '50-64';
    return '65+';
  }

  private maskName(name: string): string {
    return name
      .split(/\s+/)
      .map((part) => (part.length <= 1 ? '*' : part[0] + '*'.repeat(part.length - 1)))
      .join(' ');
  }

  private maskNationalId(nationalId: string): string {
    return `${nationalId.slice(0, 3)}*****${nationalId.slice(-3)}`;
  }
}
