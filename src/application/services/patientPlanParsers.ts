import type { PatientCaregiver, PatientSchedule } from '../ports/Anonymizer.js';

/**
 * Normalizes raw caregiver input into a {@link PatientCaregiver}, or undefined
 * when no meaningful contact details (name/phone/email) are provided.
 */
export function parseCaregiver(raw: unknown): PatientCaregiver | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const c = raw as Record<string, unknown>;
  const name = String(c.name ?? '').trim();
  const relationship = String(c.relationship ?? '').trim();
  const phone = String(c.phone ?? '').trim();
  const email = String(c.email ?? '').trim();
  if (name.length === 0 && phone.length === 0 && email.length === 0) return undefined;
  return { name, relationship, phone, email };
}

/**
 * Normalizes raw schedule input into a {@link PatientSchedule}, or undefined
 * when no days, times or template are provided.
 */
export function parseSchedule(raw: unknown): PatientSchedule | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const s = raw as Record<string, unknown>;
  const days = Array.isArray(s.days) ? s.days.map((d) => String(d).trim()).filter((d) => d.length > 0) : [];
  const times = Array.isArray(s.times) ? s.times.map((t) => String(t).trim()).filter((t) => t.length > 0) : [];
  const template = String(s.template ?? '').trim();
  if (days.length === 0 && times.length === 0 && template.length === 0) return undefined;
  return { days, times, template };
}
