import { randomUUID } from 'node:crypto';
import type { Anonymizer } from '../ports/Anonymizer.js';
import type { DataRepository } from '../ports/DataRepository.js';
import type { HealthAnalyzer, RiskAssessment } from '../services/HealthAnalyzer.js';
import type { MetricsDto } from '../dto/MetricsDto.js';
import { parseMetricsDto } from '../dto/MetricsDto.js';
import type { HealthData } from '../../domain/entities/HealthData.js';
import type { AnonymizedPatient } from '../ports/Anonymizer.js';

export interface MetricsResult {
  pseudonym: string;
  risk: RiskAssessment;
}

export class RecordPatientMetrics {
  constructor(
    private readonly anonymizer: Anonymizer,
    private readonly repository: DataRepository,
    private readonly analyzer: HealthAnalyzer
  ) {}

  async execute(patientId: string, raw: unknown): Promise<MetricsResult> {
    const dto = parseMetricsDto(raw);
    const bp = this.parseBloodPressure(dto.bloodPressure);

    let patient = await this.repository.findByPseudonym(patientId);
    const pseudonym = patient ? patientId : this.anonymizer.pseudonymize(patientId);

    if (!patient) {
      patient = await this.repository.findByPseudonym(pseudonym);
    }
    if (!patient) {
      patient = {
        id: randomUUID(),
        pseudonym,
        ageGroup: undefined,
        healthData: [],
      };
    }

    const metric: HealthData = {
      id: randomUUID(),
      patientId: patient.id,
      timestamp: new Date(),
      heartRate: dto.heartRate,
      bloodPressureSystolic: bp.systolic,
      bloodPressureDiastolic: bp.diastolic,
      oxygenSaturation: dto.oxygenSaturation,
      temperature: dto.bodyTemperature,
      glucose: dto.glucose,
    };

    patient.healthData.push(metric);
    if (patient.healthData.length > 200) {
      patient.healthData.splice(0, patient.healthData.length - 200);
    }
    const risk = this.analyzer.analyze(patient);
    await this.repository.save(patient);

    return { pseudonym, risk };
  }

  private parseBloodPressure(bp: MetricsDto['bloodPressure']): { systolic: number; diastolic: number } {
    if (typeof bp === 'object') {
      return bp as { systolic: number; diastolic: number };
    }

    const parts = bp.split('/').map(s => s.trim());
    if (parts.length !== 2) {
      throw new Error('bloodPressure string must be in "systolic/diastolic" format');
    }

    const [systolic, diastolic] = parts.map(Number);
    if (Number.isNaN(systolic) || Number.isNaN(diastolic)) {
      throw new Error('bloodPressure values must be numbers');
    }

    return { systolic, diastolic };
  }
}
