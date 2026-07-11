import { ValidationError } from '../errors/ValidationError.js';

export interface MetricsDto {
  heartRate: number;
  bloodPressure: string | { systolic: number; diastolic: number };
  oxygenSaturation: number;
  bodyTemperature: number;
}

function toNumber(value: unknown, field: string): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) throw new ValidationError(`${field} must be a valid number`);
    return parsed;
  }
  throw new ValidationError(`${field} is required and must be a number`);
}

export function parseMetricsDto(input: unknown): MetricsDto {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('Metrics payload must be a JSON object');
  }

  const raw = input as Record<string, unknown>;

  const heartRate = toNumber(raw.heartRate ?? raw.heart_rate, 'heartRate');
  const oxygenSaturation = toNumber(raw.oxygenSaturation ?? raw.oxygen_saturation, 'oxygenSaturation');
  const bodyTemperature = toNumber(raw.bodyTemperature ?? raw.body_temperature, 'bodyTemperature');

  const bloodPressure = raw.bloodPressure ?? raw.blood_pressure;
  if (bloodPressure === undefined || bloodPressure === null) {
    throw new ValidationError('bloodPressure is required');
  }

  if (typeof bloodPressure === 'string') {
    return { heartRate, bloodPressure, oxygenSaturation, bodyTemperature };
  }

  if (typeof bloodPressure === 'object' && bloodPressure !== null) {
    const bp = bloodPressure as Record<string, unknown>;
    const systolic = toNumber(bp.systolic, 'bloodPressure.systolic');
    const diastolic = toNumber(bp.diastolic, 'bloodPressure.diastolic');
    return { heartRate, bloodPressure: { systolic, diastolic }, oxygenSaturation, bodyTemperature };
  }

  throw new ValidationError('bloodPressure must be a string "systolic/diastolic" or an object with systolic/diastolic numbers');
}
