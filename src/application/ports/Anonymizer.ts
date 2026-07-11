import type { Patient } from '../../domain/entities/Patient.js';
import type { HealthMetrics } from '../../domain/entities/HealthMetrics.js';

export interface PatientThreshold {
  metric: 'heartRate' | 'oxygenSaturation' | 'temperature' | 'systolic' | 'diastolic';
  operator: '>' | '<' | '>=' | '<=' | '=';
  value: number;
  message: string;
}

export interface AnonymizedPatient {
  id: string;
  pseudonym: string;
  ageGroup?: string;
  displayCode?: string;
  conditionGroup?: string;
  contactChannel?: 'sms' | 'ai';
  customQuestion?: string;
  questionTimes?: string[];
  criticalThreshold?: PatientThreshold;
  warningThreshold?: PatientThreshold;
  healthData: HealthMetrics[];
}

export interface Anonymizer {
  anonymize(patient: Patient): AnonymizedPatient;
  pseudonymize(value: string): string;
}
