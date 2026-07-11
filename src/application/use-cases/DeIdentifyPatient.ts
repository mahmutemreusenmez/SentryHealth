import type { Anonymizer } from '../ports/Anonymizer.js';

const PII_FIELDS = ['firstName', 'lastName', 'email', 'phone', 'address', 'nationalId'];

export class DeIdentifyPatient {
  constructor(private readonly anonymizer: Anonymizer) {}

  execute(raw: Record<string, unknown>): Record<string, unknown> {
    const clone = { ...raw };

    for (const key of PII_FIELDS) {
      if (typeof clone[key] === 'string') {
        clone[key] = this.anonymizer.pseudonymize(clone[key] as string);
      }
    }

    if (clone.dateOfBirth && typeof clone.dateOfBirth === 'string') {
      clone.dateOfBirth = (clone.dateOfBirth as string).slice(0, 4);
    }

    return clone;
  }
}
