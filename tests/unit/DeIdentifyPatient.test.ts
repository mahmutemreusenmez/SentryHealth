import { describe, it, expect } from 'vitest';
import { DeIdentifyPatient } from '../../src/application/use-cases/DeIdentifyPatient.js';
import type { Anonymizer } from '../../src/application/ports/Anonymizer.js';

const fakeAnonymizer: Anonymizer = {
  pseudonymize: (value: string) => `token(${value})`,
  anonymize: () => {
    throw new Error('not used');
  },
};

describe('DeIdentifyPatient', () => {
  const useCase = new DeIdentifyPatient(fakeAnonymizer);

  it('pseudonymizes all known PII string fields', () => {
    const result = useCase.execute({
      firstName: 'Ali',
      lastName: 'Veli',
      email: 'ali@example.com',
      phone: '5551234567',
      address: 'Ankara',
      nationalId: '12345678901',
    });
    expect(result.firstName).toBe('token(Ali)');
    expect(result.lastName).toBe('token(Veli)');
    expect(result.email).toBe('token(ali@example.com)');
    expect(result.phone).toBe('token(5551234567)');
    expect(result.address).toBe('token(Ankara)');
    expect(result.nationalId).toBe('token(12345678901)');
  });

  it('truncates dateOfBirth to the year', () => {
    const result = useCase.execute({ dateOfBirth: '1985-05-20' });
    expect(result.dateOfBirth).toBe('1985');
  });

  it('leaves non-string PII fields untouched', () => {
    const result = useCase.execute({ firstName: 123, extra: 'keep' });
    expect(result.firstName).toBe(123);
    expect(result.extra).toBe('keep');
  });

  it('does not mutate the original input', () => {
    const input = { firstName: 'Ali' };
    useCase.execute(input);
    expect(input.firstName).toBe('Ali');
  });
});
