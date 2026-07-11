import type { DataRepository } from '../../application/ports/DataRepository.js';
import type { AnonymizedPatient } from '../../application/ports/Anonymizer.js';

export class InMemoryPatientRepository implements DataRepository {
  private patients = new Map<string, AnonymizedPatient>();

  async save(anonymized: AnonymizedPatient): Promise<void> {
    this.patients.set(anonymized.pseudonym, anonymized);
  }

  async findByPseudonym(pseudonym: string): Promise<AnonymizedPatient | undefined> {
    return this.patients.get(pseudonym);
  }

  async findAll(): Promise<AnonymizedPatient[]> {
    return Array.from(this.patients.values());
  }
}
