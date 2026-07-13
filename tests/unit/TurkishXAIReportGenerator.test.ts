import { describe, it, expect } from 'vitest';
import { TurkishXAIReportGenerator } from '../../src/infrastructure/ai/TurkishXAIReportGenerator.js';
import type { HealthMetrics } from '../../src/domain/entities/HealthMetrics.js';

const metrics: HealthMetrics = {
  timestamp: new Date('2024-01-01T00:00:00Z'),
  heartRate: 80,
  bloodPressureSystolic: 120,
  bloodPressureDiastolic: 80,
  oxygenSaturation: 97,
  temperature: 36.7,
};

describe('TurkishXAIReportGenerator', () => {
  const generator = new TurkishXAIReportGenerator();

  it('produces a "no anomaly" report for low risk', () => {
    const report = generator.generate({ level: 'low', score: 0, reasons: [] }, metrics);
    expect(report).toContain('DÜŞÜK');
    expect(report).toContain('anormal bir değer tespit edilmedi');
    expect(report).toContain('Nabız: 80');
  });

  it('joins reasons with "ve" for non-low risk', () => {
    const report = generator.generate(
      { level: 'high', score: 60, reasons: ['nabız yüksek', 'ateş yüksek'] },
      metrics
    );
    expect(report).toContain('YÜKSEK');
    expect(report).toContain('nabız yüksek ve ateş yüksek');
  });

  it('uses the Turkish label for each risk level', () => {
    expect(generator.generate({ level: 'critical', score: 100, reasons: ['x'] }, metrics)).toContain('KRİTİK');
    expect(generator.generate({ level: 'medium', score: 30, reasons: ['x'] }, metrics)).toContain('ORTA');
  });

  it('includes vitals in the report', () => {
    const report = generator.generate({ level: 'medium', score: 30, reasons: ['x'] }, metrics);
    expect(report).toContain('SpO2: %97');
    expect(report).toContain('Tansiyon: 120/80');
  });
});
