import type { InteractionLogEntry, PatientSchedule } from '../ports/Anonymizer.js';
import type { HealthMetrics } from '../../domain/entities/HealthMetrics.js';

const TURKISH_DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

export function buildInteractionLog(schedule: PatientSchedule, healthData: HealthMetrics[]): InteractionLogEntry[] {
  const entries: InteractionLogEntry[] = [];
  const now = new Date();
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - 7);
  const windowEnd = new Date();
  windowEnd.setDate(windowEnd.getDate() + 7);

  for (const day of schedule.days) {
    const dayIndex = TURKISH_DAYS.indexOf(day);
    if (dayIndex === -1) continue;
    for (const time of schedule.times) {
      const [hour, minute] = time.split(':').map(Number);
      if (Number.isNaN(hour) || Number.isNaN(minute)) continue;
      const target = new Date(windowStart);
      target.setHours(hour, minute, 0, 0);
      while (target.getDay() !== (dayIndex + 1) % 7) {
        target.setDate(target.getDate() + 1);
      }
      while (target <= windowEnd) {
        const responseEntry = healthData.find((h) => {
          const ts = new Date(h.timestamp);
          return ts >= target && ts <= new Date(target.getTime() + 24 * 60 * 60 * 1000);
        });
        let status: InteractionLogEntry['status'] = 'pending';
        let response: string | undefined;
        if (responseEntry) {
          status = 'answered';
          response = `Nabız: ${responseEntry.heartRate}, SpO2: %${responseEntry.oxygenSaturation}, Ateş: ${responseEntry.temperature}°C`;
        } else if (target < now) {
          status = 'overdue';
        }
        entries.push({ time: target.toISOString(), question: schedule.template, status, response });
        target.setDate(target.getDate() + 7);
      }
    }
  }

  return entries.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
}
