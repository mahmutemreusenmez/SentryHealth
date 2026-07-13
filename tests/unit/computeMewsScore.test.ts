import { describe, it, expect } from 'vitest';
import { computeMewsScore } from '../../src/application/services/MewsScore.js';

const normal = {
  heartRate: 75,
  oxygenSaturation: 98,
  temperature: 36.6,
  bloodPressureSystolic: 120,
  respiratoryRate: 16,
};

describe('computeMewsScore', () => {
  it('returns a low score for normal vitals', () => {
    const { score, level } = computeMewsScore(normal);
    expect(score).toBe(0);
    expect(level).toBe('low');
  });

  it('scores 2 for a critically high heart rate', () => {
    expect(computeMewsScore({ ...normal, heartRate: 135 }).score).toBe(2);
  });

  it('scores 1 for a mildly elevated heart rate', () => {
    expect(computeMewsScore({ ...normal, heartRate: 105 }).score).toBe(1);
  });

  it('scores low oxygen saturation', () => {
    expect(computeMewsScore({ ...normal, oxygenSaturation: 89 }).score).toBe(2);
    expect(computeMewsScore({ ...normal, oxygenSaturation: 92 }).score).toBe(1);
  });

  it('scores abnormal systolic blood pressure', () => {
    expect(computeMewsScore({ ...normal, bloodPressureSystolic: 205 }).score).toBe(2);
    expect(computeMewsScore({ ...normal, bloodPressureSystolic: 85 }).score).toBe(1);
  });

  it('scores abnormal temperature', () => {
    expect(computeMewsScore({ ...normal, temperature: 39 }).score).toBe(1);
    expect(computeMewsScore({ ...normal, temperature: 34.5 }).score).toBe(1);
  });

  it('scores abnormal respiratory rate', () => {
    expect(computeMewsScore({ ...normal, respiratoryRate: 32 }).score).toBe(2);
    expect(computeMewsScore({ ...normal, respiratoryRate: 25 }).score).toBe(1);
  });

  it('defaults respiratoryRate to 0 (out of range) when omitted', () => {
    const { score } = computeMewsScore({
      heartRate: 75,
      oxygenSaturation: 98,
      temperature: 36.6,
      bloodPressureSystolic: 120,
    });
    expect(score).toBe(2);
  });

  it('classifies medium and high risk by accumulated score', () => {
    // hr high (2) + spo2 low (2) + rr high (1) = 5 => high
    const high = computeMewsScore({ ...normal, heartRate: 135, oxygenSaturation: 89, respiratoryRate: 25 });
    expect(high.score).toBeGreaterThanOrEqual(5);
    expect(high.level).toBe('high');

    // hr mild (1) + spo2 mild (1) + temp abnormal (1) = 3 => medium
    const medium = computeMewsScore({ ...normal, heartRate: 105, oxygenSaturation: 92, temperature: 39 });
    expect(medium.score).toBe(3);
    expect(medium.level).toBe('medium');
  });
});
