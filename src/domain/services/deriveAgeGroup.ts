export function deriveAgeGroup(dateOfBirth: Date): string {
  const age = new Date().getFullYear() - dateOfBirth.getFullYear();
  if (age < 18) return '0-17';
  if (age < 35) return '18-34';
  if (age < 50) return '35-49';
  if (age < 65) return '50-64';
  return '65+';
}
