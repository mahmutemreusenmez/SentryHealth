import { describe, it, expect } from 'vitest';
import { RegisterPatient } from '../../src/application/use-cases/RegisterPatient.js';
import { InMemoryPatientRepository } from '../../src/infrastructure/persistence/InMemoryPatientRepository.js';
import { ValidationError } from '../../src/application/errors/ValidationError.js';
import type { Anonymizer } from '../../src/application/ports/Anonymizer.js';

const fakeAnonymizer: Anonymizer = {
  pseudonymize: (value: string) => `pseudo-${value}`,
  anonymize: () => {
    throw new Error('not used');
  },
};

function makeUseCase() {
  const repository = new InMemoryPatientRepository();
  return { repository, useCase: new RegisterPatient(fakeAnonymizer, repository) };
}

const validInput = {
  fullName: 'Ali Veli',
  nationalId: '12345678901',
  dateOfBirth: '1985-05-20',
  condition: 'Diyabet',
  contactChannel: 'ai',
};

describe('RegisterPatient', () => {
  it('registers a patient and returns masked KVKK data', async () => {
    const { useCase, repository } = makeUseCase();
    const result = await useCase.execute(validInput);

    expect(result.pseudonym).toBe('pseudo-12345678901');
    expect(result.conditionGroup).toBe('Diyabet');
    expect(result.contactChannel).toBe('ai');
    expect(result.ageGroup).toBe('35-49');
    expect(result.displayCode).toMatch(/^H-\d{2}[A-Z]$/);
    expect(result.kvkk.maskedName).toBe('A** V***');
    expect(result.kvkk.maskedNationalId).toBe('12*******01');
    expect(result.kvkk.method).toBe('HMAC-SHA256');

    const stored = await repository.findByPseudonym('pseudo-12345678901');
    expect(stored).toBeDefined();
  });

  it('rejects a duplicate national id', async () => {
    const { useCase } = makeUseCase();
    await useCase.execute(validInput);
    await expect(useCase.execute(validInput)).rejects.toThrow(ValidationError);
  });

  it('rejects a non-object body', async () => {
    const { useCase } = makeUseCase();
    await expect(useCase.execute(null)).rejects.toThrow('JSON gövde gereklidir');
  });

  it('rejects a short full name', async () => {
    const { useCase } = makeUseCase();
    await expect(useCase.execute({ ...validInput, fullName: 'Al' })).rejects.toThrow('en az 3 karakter');
  });

  it('rejects an invalid national id', async () => {
    const { useCase } = makeUseCase();
    await expect(useCase.execute({ ...validInput, nationalId: '123' })).rejects.toThrow('11 haneli');
  });

  it('rejects an invalid or future date of birth', async () => {
    const { useCase } = makeUseCase();
    await expect(useCase.execute({ ...validInput, dateOfBirth: 'not-a-date' })).rejects.toThrow('doğum tarihi');
    await expect(useCase.execute({ ...validInput, dateOfBirth: '2999-01-01' })).rejects.toThrow('doğum tarihi');
  });

  it('rejects a condition outside the allowed list', async () => {
    const { useCase } = makeUseCase();
    await expect(useCase.execute({ ...validInput, condition: 'Grip' })).rejects.toThrow('Kronik hastalık grubu');
  });

  it('defaults an unknown contact channel to sms', async () => {
    const { useCase } = makeUseCase();
    const result = await useCase.execute({ ...validInput, contactChannel: 'carrier-pigeon' });
    expect(result.contactChannel).toBe('sms');
  });

  it('parses caregiver and schedule and builds an interaction log', async () => {
    const { useCase, repository } = makeUseCase();
    const result = await useCase.execute({
      ...validInput,
      caregiver: { name: 'Ayşe', relationship: 'Eş', phone: '5550000000', email: 'ayse@example.com' },
      schedule: { days: ['Pazartesi'], times: ['09:00'], template: 'Nasılsınız?' },
    });
    expect(result.caregiver?.name).toBe('Ayşe');
    expect(result.schedule?.days).toEqual(['Pazartesi']);

    const stored = await repository.findByPseudonym(result.pseudonym);
    expect(stored!.interactionLog!.length).toBeGreaterThan(0);
  });

  it('omits an empty caregiver and schedule', async () => {
    const { useCase, repository } = makeUseCase();
    const result = await useCase.execute({
      ...validInput,
      caregiver: { name: '', relationship: '', phone: '', email: '' },
      schedule: { days: [], times: [], template: '' },
    });
    expect(result.caregiver).toBeUndefined();
    expect(result.schedule).toBeUndefined();

    const stored = await repository.findByPseudonym(result.pseudonym);
    expect(stored!.interactionLog).toEqual([]);
  });
});
