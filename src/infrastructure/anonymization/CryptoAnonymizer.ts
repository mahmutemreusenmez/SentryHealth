import { createHmac } from 'node:crypto';
import type { Patient } from '../../domain/entities/Patient.js';
import type { AnonymizedPatient, Anonymizer } from '../../application/ports/Anonymizer.js';
import { AnonymizationError } from '../../application/errors/AnonymizationError.js';
import { deriveAgeGroup } from '../../domain/services/deriveAgeGroup.js';

export class CryptoAnonymizer implements Anonymizer {
  constructor(private readonly key: string) {
    if (!key || key.length < 16) {
      throw new AnonymizationError('Anonymization key must be at least 16 characters');
    }
  }

  private hash(value: string): string {
    return createHmac('sha256', this.key).update(value).digest('hex').slice(0, 16);
  }

  pseudonymize(value: string): string {
    return this.hash(value);
  }

  anonymize(patient: Patient): AnonymizedPatient {
    const pseudonym = this.hash(patient.nationalId);
    const ageGroup = deriveAgeGroup(patient.dateOfBirth);

    return {
      id: patient.id.toString(),
      pseudonym,
      ageGroup,
      caregiver: undefined,
      schedule: undefined,
      interactionLog: undefined,
      healthData: patient.healthData.map(h => ({
        timestamp: h.timestamp,
        heartRate: h.heartRate,
        bloodPressureSystolic: h.bloodPressureSystolic,
        bloodPressureDiastolic: h.bloodPressureDiastolic,
        oxygenSaturation: h.oxygenSaturation,
        temperature: h.temperature,
        notes: h.notes,
      })),
    };
  }
}
