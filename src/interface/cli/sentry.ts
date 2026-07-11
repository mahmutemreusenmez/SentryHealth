import { randomUUID } from 'node:crypto';
import { CryptoAnonymizer } from '../../infrastructure/anonymization/CryptoAnonymizer.js';
import { SubmitHealthData } from '../../application/use-cases/SubmitHealthData.js';
import { InMemoryPatientRepository } from '../../infrastructure/persistence/InMemoryPatientRepository.js';
import { env } from '../../infrastructure/config/env.js';

const sample = {
  nationalId: '12345678901',
  firstName: 'Ali',
  lastName: 'Veli',
  email: 'ali@example.com',
  phone: '5551234567',
  dateOfBirth: '1985-05-20',
  address: 'Ankara',
  heartRate: 72,
  bloodPressureSystolic: 120,
  bloodPressureDiastolic: 80,
  oxygenSaturation: 98,
  temperature: 36.6,
  notes: 'Rahatsızlık yok',
};

async function run() {
  const anonymizer = new CryptoAnonymizer(env.ANONYMIZATION_KEY);
  const repo = new InMemoryPatientRepository();
  const useCase = new SubmitHealthData(anonymizer, repo);
  const result = await useCase.execute(sample);

  console.log('Generated pseudonym:', result.pseudonym);
  const stored = await repo.findByPseudonym(result.pseudonym);
  console.log('Stored record:', JSON.stringify(stored, null, 2));
}

run().catch(console.error);
