import type { AnonymizedPatient } from '../ports/Anonymizer.js';

export interface RiskAssessment {
  level: 'critical' | 'high' | 'medium' | 'low';
  score: number;
  reasons: string[];
  report: string;
  patientMessage?: string;
  breachedThreshold?: 'critical' | 'warning' | null;
}

export interface HealthAnalyzer {
  analyze(patient: AnonymizedPatient): RiskAssessment;
}
