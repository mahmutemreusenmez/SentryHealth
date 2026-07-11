import type { AnonymizedPatient } from './Anonymizer.js';

export interface DataRepository {
  save(anonymized: AnonymizedPatient): Promise<void>;
  findByPseudonym(pseudonym: string): Promise<AnonymizedPatient | undefined>;
  findAll(): Promise<AnonymizedPatient[]>;
}
