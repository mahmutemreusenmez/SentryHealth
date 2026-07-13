import { describe, it, expect } from 'vitest';
import { parseMetricsDto } from '../../src/application/dto/MetricsDto.js';
import { ValidationError } from '../../src/application/errors/ValidationError.js';

const base = {
  heartRate: 72,
  oxygenSaturation: 98,
  bodyTemperature: 36.6,
  bloodPressure: '120/80',
};

describe('parseMetricsDto', () => {
  it('parses a valid payload with a string blood pressure', () => {
    const dto = parseMetricsDto(base);
    expect(dto).toEqual({
      heartRate: 72,
      oxygenSaturation: 98,
      bodyTemperature: 36.6,
      bloodPressure: '120/80',
      glucose: undefined,
    });
  });

  it('parses a blood pressure object', () => {
    const dto = parseMetricsDto({ ...base, bloodPressure: { systolic: 120, diastolic: 80 } });
    expect(dto.bloodPressure).toEqual({ systolic: 120, diastolic: 80 });
  });

  it('accepts snake_case field aliases', () => {
    const dto = parseMetricsDto({
      heart_rate: '80',
      oxygen_saturation: '97',
      body_temperature: '37',
      blood_pressure: '130/85',
    });
    expect(dto.heartRate).toBe(80);
    expect(dto.oxygenSaturation).toBe(97);
    expect(dto.bodyTemperature).toBe(37);
    expect(dto.bloodPressure).toBe('130/85');
  });

  it('coerces numeric strings to numbers', () => {
    const dto = parseMetricsDto({ ...base, heartRate: '99' });
    expect(dto.heartRate).toBe(99);
  });

  it('parses glucose when provided via various aliases', () => {
    expect(parseMetricsDto({ ...base, glucose: 110 }).glucose).toBe(110);
    expect(parseMetricsDto({ ...base, blood_glucose: '120' }).glucose).toBe(120);
    expect(parseMetricsDto({ ...base, glukoz: 130 }).glucose).toBe(130);
  });

  it('treats empty-string or null glucose as undefined', () => {
    expect(parseMetricsDto({ ...base, glucose: '' }).glucose).toBeUndefined();
    expect(parseMetricsDto({ ...base, glucose: null }).glucose).toBeUndefined();
  });

  it('throws when the payload is not an object', () => {
    expect(() => parseMetricsDto(null)).toThrow(ValidationError);
    expect(() => parseMetricsDto('nope')).toThrow('Metrics payload must be a JSON object');
  });

  it('throws when a required numeric field is missing', () => {
    const { heartRate, ...rest } = base;
    expect(() => parseMetricsDto(rest)).toThrow('heartRate is required and must be a number');
  });

  it('throws when a numeric field is a non-numeric string', () => {
    expect(() => parseMetricsDto({ ...base, heartRate: 'abc' })).toThrow('heartRate must be a valid number');
  });

  it('throws when blood pressure is missing', () => {
    const { bloodPressure, ...rest } = base;
    expect(() => parseMetricsDto(rest)).toThrow('bloodPressure is required');
  });

  it('throws when blood pressure object has a non-numeric systolic', () => {
    expect(() =>
      parseMetricsDto({ ...base, bloodPressure: { systolic: 'x', diastolic: 80 } })
    ).toThrow('bloodPressure.systolic must be a valid number');
  });
});
