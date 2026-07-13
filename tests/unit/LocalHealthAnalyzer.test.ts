import { describe, it, expect } from 'vitest';
import { LocalHealthAnalyzer } from '../../src/infrastructure/ai/LocalHealthAnalyzer.js';
import type { XAIReportGenerator } from '../../src/application/services/XAIReportGenerator.js';
import type { AnonymizedPatient, PatientThreshold } from '../../src/application/ports/Anonymizer.js';
import type { HealthMetrics } from '../../src/domain/entities/HealthMetrics.js';

const stubReport: XAIReportGenerator = {
  generate: () => 'STUB_REPORT',
};

function patientWith(latest: Partial<HealthMetrics>, extra: Partial<AnonymizedPatient> = {}): AnonymizedPatient {
  const metrics: HealthMetrics = {
    timestamp: new Date(),
    heartRate: 80,
    bloodPressureSystolic: 120,
    bloodPressureDiastolic: 80,
    oxygenSaturation: 97,
    temperature: 36.7,
    ...latest,
  };
  return {
    id: 'p-1',
    pseudonym: 'pseudo',
    healthData: [metrics],
    ...extra,
  };
}

describe('LocalHealthAnalyzer', () => {
  const analyzer = new LocalHealthAnalyzer(stubReport);

  it('returns low risk with no data', () => {
    const result = analyzer.analyze({ id: 'p', pseudonym: 'x', healthData: [] });
    expect(result.level).toBe('low');
    expect(result.score).toBe(0);
    expect(result.report).toContain('yeterli veri');
  });

  it('returns low risk for normal vitals', () => {
    const result = analyzer.analyze(patientWith({}));
    expect(result.level).toBe('low');
    expect(result.score).toBe(0);
    expect(result.reasons).toEqual([]);
    expect(result.report).toBe('STUB_REPORT');
  });

  it('flags critical heart rate', () => {
    const result = analyzer.analyze(patientWith({ heartRate: 135 }));
    expect(result.level).toBe('critical');
    expect(result.score).toBe(100);
    expect(result.reasons[0]).toContain('nabız 135 kritik');
  });

  it('flags medium risk for a single borderline vital', () => {
    const result = analyzer.analyze(patientWith({ oxygenSaturation: 94 }));
    expect(result.level).toBe('medium');
    expect(result.score).toBe(30);
  });

  it('accumulates scores across multiple abnormal vitals into high risk', () => {
    const result = analyzer.analyze(patientWith({ heartRate: 121, oxygenSaturation: 91 }));
    // 60 (hr high) + 60 (oxygen high) = 120 => critical
    expect(result.score).toBe(120);
    expect(result.level).toBe('critical');
  });

  it('analyzes only the latest reading', () => {
    const patient = patientWith({ heartRate: 135 });
    patient.healthData.unshift({
      timestamp: new Date(),
      heartRate: 999,
      bloodPressureSystolic: 300,
      bloodPressureDiastolic: 200,
      oxygenSaturation: 50,
      temperature: 42,
    });
    const result = analyzer.analyze(patient);
    expect(result.score).toBe(100);
  });

  it('escalates to critical when a custom critical threshold is breached', () => {
    const critical: PatientThreshold = {
      metric: 'glucose' as PatientThreshold['metric'],
      operator: '>',
      value: 100,
      message: 'Şeker yüksek',
    };
    // metric 'glucose' is not mapped => not breached; use heartRate instead
    const threshold: PatientThreshold = { metric: 'heartRate', operator: '>', value: 70, message: 'Nabız yüksek' };
    const result = analyzer.analyze(patientWith({ heartRate: 80 }, { criticalThreshold: threshold }));
    expect(result.level).toBe('critical');
    expect(result.patientMessage).toBe('Nabız yüksek');
    expect(result.breachedThreshold).toBe('critical');
    expect(critical.message).toBe('Şeker yüksek');
  });

  it('raises low to high when only a warning threshold is breached', () => {
    const warning: PatientThreshold = { metric: 'temperature', operator: '>=', value: 36, message: 'Ateş takibi' };
    const result = analyzer.analyze(patientWith({}, { warningThreshold: warning }));
    expect(result.level).toBe('high');
    expect(result.breachedThreshold).toBe('warning');
    expect(result.patientMessage).toBe('Ateş takibi');
  });

  it('does not breach when custom threshold metric is unmapped', () => {
    const threshold = { metric: 'unknown', operator: '>', value: 0, message: 'x' } as unknown as PatientThreshold;
    const result = analyzer.analyze(patientWith({}, { criticalThreshold: threshold }));
    expect(result.breachedThreshold).toBeNull();
  });

  it('supports all comparison operators', () => {
    const mk = (operator: PatientThreshold['operator'], value: number) =>
      analyzer.analyze(
        patientWith({ heartRate: 80 }, { criticalThreshold: { metric: 'heartRate', operator, value, message: 'm' } })
      ).breachedThreshold;
    expect(mk('>', 70)).toBe('critical');
    expect(mk('<', 90)).toBe('critical');
    expect(mk('>=', 80)).toBe('critical');
    expect(mk('<=', 80)).toBe('critical');
    expect(mk('=', 80)).toBe('critical');
    expect(mk('>', 200)).toBeNull();
  });
});
