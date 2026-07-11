import { describe, it, expect } from 'vitest';
import { CryptoAnonymizer } from '../../src/infrastructure/anonymization/CryptoAnonymizer.js';
import { PatientId } from '../../src/domain/value-objects/PatientId.js';

describe('CryptoAnonymizer', () => {
  const anonymizer = new CryptoAnonymizer('test-secret-key-123');

  it('pseudonymizes deterministically', () => {
    const a = anonymizer.pseudonymize('12345678901');
    const b = anonymizer.pseudonymize('12345678901');
    expect(a).toBe(b);
    expect(a).not.toBe('12345678901');
  });

  it('anonymizes patient and removes PII', () => {
    const patient = {
      id: PatientId.create('p-001'),
      nationalId: '12345678901',
      firstName: 'Ali',
      lastName: 'Veli',
      email: 'ali@example.com',
      phone: '5551234567',
      dateOfBirth: new Date('1985-05-20'),
      address: 'Ankara',
      healthData: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = anonymizer.anonymize(patient);
    expect(result.pseudonym).toBeTruthy();
    expect(result.healthData).toEqual([]);
    expect(result.ageGroup).toBe('35-49');
  });
});
