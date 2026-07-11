import { randomUUID } from 'node:crypto';
import { PatientId } from '../../domain/value-objects/PatientId.js';
import type { Patient } from '../../domain/entities/Patient.js';
import type { Anonymizer } from '../ports/Anonymizer.js';
import type { DataRepository } from '../ports/DataRepository.js';
import type { HealthDataDto } from '../dto/HealthDataDto.js';

export class SubmitHealthData {
  constructor(
    private readonly anonymizer: Anonymizer,
    private readonly repository: DataRepository
  ) {}

  async execute(dto: HealthDataDto): Promise<{ pseudonym: string }> {
    const id = randomUUID();
    const patient: Patient = {
      id: PatientId.create(id),
      nationalId: dto.nationalId,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      dateOfBirth: new Date(dto.dateOfBirth),
      address: dto.address,
      healthData: [{
        id: randomUUID(),
        patientId: id,
        timestamp: new Date(),
        heartRate: dto.heartRate,
        bloodPressureSystolic: dto.bloodPressureSystolic,
        bloodPressureDiastolic: dto.bloodPressureDiastolic,
        oxygenSaturation: dto.oxygenSaturation,
        temperature: dto.temperature,
        notes: dto.notes,
      }],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const anonymized = this.anonymizer.anonymize(patient);
    await this.repository.save(anonymized);

    return { pseudonym: anonymized.pseudonym };
  }
}
