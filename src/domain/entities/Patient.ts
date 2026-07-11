import type { HealthData } from './HealthData.js';
import type { PatientId } from '../value-objects/PatientId.js';

export interface Patient {
  id: PatientId;
  nationalId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: Date;
  address?: string;
  healthData: HealthData[];
  createdAt: Date;
  updatedAt: Date;
}
