export interface MewsScoreEntry {
  timestamp: string;
  heartRate: number;
  oxygenSaturation: number;
  temperature: number;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  respiratoryRate: number;
  score: number;
  level: 'low' | 'medium' | 'high';
}

export function computeMewsScore(entry: {
  heartRate: number;
  oxygenSaturation: number;
  temperature: number;
  bloodPressureSystolic: number;
  respiratoryRate?: number;
}): { score: number; level: 'low' | 'medium' | 'high' } {
  const hr = Number(entry.heartRate || 0);
  const sys = Number(entry.bloodPressureSystolic || 0);
  const temp = Number(entry.temperature || 0);
  const spo2 = Number(entry.oxygenSaturation || 0);
  const rr = Number(entry.respiratoryRate ?? 0);

  let score = 0;

  if (hr >= 130 || hr < 40) score += 2;
  else if (hr >= 110 || hr < 50) score += 1;
  else if (hr >= 100) score += 1;

  if (sys >= 200 || sys < 70) score += 2;
  else if (sys >= 160 || sys < 90) score += 1;

  if (spo2 < 90) score += 2;
  else if (spo2 < 93) score += 1;

  if (temp >= 38.5 || temp < 35.0) score += 1;

  if (rr >= 30 || rr < 9) score += 2;
  else if (rr >= 21) score += 1;

  let level: 'low' | 'medium' | 'high' = 'low';
  if (score >= 5) level = 'high';
  else if (score >= 3) level = 'medium';

  return { score, level };
}
