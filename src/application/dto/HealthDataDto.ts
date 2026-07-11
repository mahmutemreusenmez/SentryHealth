export interface HealthDataDto {
  nationalId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address?: string;
  heartRate: number;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  oxygenSaturation: number;
  temperature: number;
  notes?: string;
}
