import { randomUUID, randomInt } from 'node:crypto';
import type { Anonymizer, AnonymizedPatient } from '../ports/Anonymizer.js';
import type { DataRepository } from '../ports/DataRepository.js';
import { ValidationError } from '../errors/ValidationError.js';
import { buildInteractionLog } from '../services/InteractionLogBuilder.js';
import { parseCaregiver, parseSchedule } from '../services/patientPlanParsers.js';
import { deriveAgeGroup } from '../../domain/services/deriveAgeGroup.js';

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
    const ageGroup = deriveAgeGroup(new Date(input.dateOfBirth));

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

    const caregiver = parseCaregiver(body.caregiver);
    const schedule = parseSchedule(body.schedule);

    return { fullName, nationalId, dateOfBirth, condition, contactChannel, caregiver, schedule };
  }

  private maskName(name: string): string {
    return name
      .split(/\s+/)
      .map((part) => (part.length <= 1 ? '*' : part[0] + '*'.repeat(part.length - 1)))
      .join(' ');
  }

  private maskNationalId(nationalId: string): string {
    return `${nationalId.slice(0, 2)}*******${nationalId.slice(-2)}`;
  }
}
