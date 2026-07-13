import type { Patient } from '../../domain/entities/Patient.js';
import type { HealthMetrics } from '../../domain/entities/HealthMetrics.js';

export interface PatientThreshold {
  metric: 'heartRate' | 'oxygenSaturation' | 'temperature' | 'systolic' | 'diastolic';
  operator: '>' | '<' | '>=' | '<=' | '=';
  value: number;
  message: string;
}

export interface PatientCaregiver {
  name: string;
  relationship: string;
  phone: string;
  email: string;
}

export interface PatientSchedule {
  days: string[];
  times: string[];
  template: string;
}

export interface InteractionLogEntry {
  time: string;
  question: string;
  status: 'pending' | 'answered' | 'overdue';
  response?: string;
}

export interface AnonymizedPatient {
  id: string;
  pseudonym: string;
  ageGroup?: string;
  displayCode?: string;
  conditionGroup?: string;
  maskedNationalId?: string;
  phone?: string;
  contactChannel?: 'sms' | 'ai';
  customQuestion?: string;
  questionTimes?: string[];
  criticalThreshold?: PatientThreshold;
  warningThreshold?: PatientThreshold;
  caregiver?: PatientCaregiver;
  schedule?: PatientSchedule;
  interactionLog?: InteractionLogEntry[];
  healthData: HealthMetrics[];
}

export interface Anonymizer {
  anonymize(patient: Patient): AnonymizedPatient;
  pseudonymize(value: string): string;
}
