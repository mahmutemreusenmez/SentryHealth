import { describe, it, expect } from 'vitest';
import { buildInteractionLog } from '../../src/application/services/InteractionLogBuilder.js';
import type { PatientSchedule } from '../../src/application/ports/Anonymizer.js';
import type { HealthMetrics } from '../../src/domain/entities/HealthMetrics.js';

const schedule: PatientSchedule = {
  days: ['Pazartesi', 'Perşembe'],
  times: ['09:00', '18:00'],
  template: 'Bugün nasılsınız?',
};

describe('buildInteractionLog', () => {
  it('returns an empty log when no days are valid', () => {
    const entries = buildInteractionLog({ days: ['NotADay'], times: ['09:00'], template: 'q' }, []);
    expect(entries).toEqual([]);
  });

  it('skips invalid time strings', () => {
    const entries = buildInteractionLog({ days: ['Pazartesi'], times: ['not-a-time'], template: 'q' }, []);
    expect(entries).toEqual([]);
  });

  it('generates entries carrying the schedule template as the question', () => {
    const entries = buildInteractionLog(schedule, []);
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(entry.question).toBe('Bugün nasılsınız?');
      expect(['pending', 'answered', 'overdue']).toContain(entry.status);
    }
  });

  it('returns entries sorted chronologically', () => {
    const entries = buildInteractionLog(schedule, []);
    const times = entries.map((e) => new Date(e.time).getTime());
    const sorted = [...times].sort((a, b) => a - b);
    expect(times).toEqual(sorted);
  });

  it('marks past unanswered entries as overdue and future ones as pending', () => {
    const entries = buildInteractionLog(schedule, []);
    const now = Date.now();
    for (const entry of entries) {
      if (new Date(entry.time).getTime() < now) {
        expect(entry.status).toBe('overdue');
      } else {
        expect(entry.status).toBe('pending');
      }
    }
  });

  it('marks an entry as answered when matching health data exists', () => {
    const pending = buildInteractionLog(schedule, []);
    const target = new Date(pending[0].time);
    const reading: HealthMetrics = {
      timestamp: new Date(target.getTime() + 60 * 60 * 1000),
      heartRate: 88,
      bloodPressureSystolic: 120,
      bloodPressureDiastolic: 80,
      oxygenSaturation: 96,
      temperature: 36.9,
    };
    const entries = buildInteractionLog(schedule, [reading]);
    const answered = entries.filter((e) => e.status === 'answered');
    expect(answered.length).toBeGreaterThan(0);
    expect(answered[0].response).toContain('Nabız: 88');
    expect(answered[0].response).toContain('SpO2: %96');
  });
});
