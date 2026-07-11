import { createHmac } from 'node:crypto';
import type { Patient } from '../../domain/entities/Patient.js';
import type { AnonymizedPatient, Anonymizer } from '../../application/ports/Anonymizer.js';
import { AnonymizationError } from '../../application/errors/AnonymizationError.js';

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
    const ageGroup = this.deriveAgeGroup(patient.dateOfBirth);

    return {
      id: patient.id.toString(),
      pseudonym,
      ageGroup,
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

  private deriveAgeGroup(dateOfBirth: Date): string {
    const age = new Date().getFullYear() - dateOfBirth.getFullYear();
    if (age < 18) return '0-17';
    if (age < 35) return '18-34';
    if (age < 50) return '35-49';
    if (age < 65) return '50-64';
    return '65+';
  }
}
