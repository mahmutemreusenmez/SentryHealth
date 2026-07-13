import { describe, it, expect } from 'vitest';
import { SubmitHealthData } from '../../src/application/use-cases/SubmitHealthData.js';
import { CryptoAnonymizer } from '../../src/infrastructure/anonymization/CryptoAnonymizer.js';
import { InMemoryPatientRepository } from '../../src/infrastructure/persistence/InMemoryPatientRepository.js';
import type { HealthDataDto } from '../../src/application/dto/HealthDataDto.js';

const dto: HealthDataDto = {
  nationalId: '12345678901',
  firstName: 'Ali',
  lastName: 'Veli',
  email: 'ali@example.com',
  phone: '5551234567',
  dateOfBirth: '1985-05-20',
  address: 'Ankara',
  heartRate: 80,
  bloodPressureSystolic: 120,
  bloodPressureDiastolic: 80,
  oxygenSaturation: 97,
  temperature: 36.6,
  notes: 'ok',
};

describe('SubmitHealthData', () => {
  it('anonymizes and persists the patient, returning the pseudonym', async () => {
    const anonymizer = new CryptoAnonymizer('test-secret-key-123');
    const repository = new InMemoryPatientRepository();
    const useCase = new SubmitHealthData(anonymizer, repository);

    const { pseudonym } = await useCase.execute(dto);
    expect(pseudonym).toBe(anonymizer.pseudonymize(dto.nationalId));

    const stored = await repository.findByPseudonym(pseudonym);
    expect(stored).toBeDefined();
    expect(stored!.healthData).toHaveLength(1);
    expect(stored!.healthData[0].heartRate).toBe(80);
    expect(stored!.ageGroup).toBe('35-49');
  });

  it('does not persist raw PII on the anonymized record', async () => {
    const anonymizer = new CryptoAnonymizer('test-secret-key-123');
    const repository = new InMemoryPatientRepository();
    const useCase = new SubmitHealthData(anonymizer, repository);

    const { pseudonym } = await useCase.execute(dto);
    const stored = await repository.findByPseudonym(pseudonym);
    const serialized = JSON.stringify(stored);
    expect(serialized).not.toContain('Ali');
    expect(serialized).not.toContain('12345678901');
    expect(serialized).not.toContain('ali@example.com');
  });
});
