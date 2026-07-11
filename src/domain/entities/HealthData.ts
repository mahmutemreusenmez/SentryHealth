import type { HealthMetrics } from './HealthMetrics.js';

export interface HealthData extends HealthMetrics {
  id: string;
  patientId: string;
}
