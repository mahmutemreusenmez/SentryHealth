import type { Patient } from '../entities/Patient.js';
import type { PatientId } from '../value-objects/PatientId.js';

export interface PatientRepository {
  save(patient: Patient): Promise<void>;
  findById(id: PatientId): Promise<Patient | undefined>;
  findByNationalId(nationalId: string): Promise<Patient | undefined>;
}
