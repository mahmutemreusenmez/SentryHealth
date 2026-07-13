import { describe, it, expect } from 'vitest';
import { RecordPatientMetrics } from '../../src/application/use-cases/RecordPatientMetrics.js';
import { InMemoryPatientRepository } from '../../src/infrastructure/persistence/InMemoryPatientRepository.js';
import { LocalHealthAnalyzer } from '../../src/infrastructure/ai/LocalHealthAnalyzer.js';
import { TurkishXAIReportGenerator } from '../../src/infrastructure/ai/TurkishXAIReportGenerator.js';
import type { Anonymizer, AnonymizedPatient } from '../../src/application/ports/Anonymizer.js';
import { ValidationError } from '../../src/application/errors/ValidationError.js';

const fakeAnonymizer: Anonymizer = {
  pseudonymize: (value: string) => `pseudo-${value}`,
  anonymize: () => {
    throw new Error('not used');
  },
};

function makeUseCase() {
  const repository = new InMemoryPatientRepository();
  const analyzer = new LocalHealthAnalyzer(new TurkishXAIReportGenerator());
  return { repository, useCase: new RecordPatientMetrics(fakeAnonymizer, repository, analyzer) };
}

const rawMetrics = {
  heartRate: 80,
  oxygenSaturation: 97,
  bodyTemperature: 36.6,
  bloodPressure: '120/80',
};

describe('RecordPatientMetrics', () => {
  it('creates a new patient record keyed by pseudonym', async () => {
    const { useCase, repository } = makeUseCase();
    const result = await useCase.execute('patient-1', rawMetrics);

    expect(result.pseudonym).toBe('pseudo-patient-1');
    expect(result.risk.level).toBe('low');

    const stored = await repository.findByPseudonym('pseudo-patient-1');
    expect(stored!.healthData).toHaveLength(1);
    expect(stored!.healthData[0].bloodPressureSystolic).toBe(120);
    expect(stored!.healthData[0].bloodPressureDiastolic).toBe(80);
  });

  it('appends to an existing patient found directly by pseudonym', async () => {
    const { useCase, repository } = makeUseCase();
    const existing: AnonymizedPatient = { id: 'id-1', pseudonym: 'known', healthData: [] };
    await repository.save(existing);

    const result = await useCase.execute('known', rawMetrics);
    expect(result.pseudonym).toBe('known');

    const stored = await repository.findByPseudonym('known');
    expect(stored!.healthData).toHaveLength(1);

    await useCase.execute('known', rawMetrics);
    const stored2 = await repository.findByPseudonym('known');
    expect(stored2!.healthData).toHaveLength(2);
  });

  it('parses a blood pressure object', async () => {
    const { useCase, repository } = makeUseCase();
    await useCase.execute('p-obj', { ...rawMetrics, bloodPressure: { systolic: 130, diastolic: 85 } });
    const stored = await repository.findByPseudonym('pseudo-p-obj');
    expect(stored!.healthData[0].bloodPressureSystolic).toBe(130);
  });

  it('reports critical risk for dangerous vitals', async () => {
    const { useCase } = makeUseCase();
    const result = await useCase.execute('p-crit', { ...rawMetrics, heartRate: 140 });
    expect(result.risk.level).toBe('critical');
  });

  it('rejects an invalid blood pressure string', async () => {
    const { useCase } = makeUseCase();
    await expect(useCase.execute('p-bad', { ...rawMetrics, bloodPressure: '120-80' })).rejects.toThrow(
      'systolic/diastolic'
    );
  });

  it('rejects non-numeric blood pressure string parts', async () => {
    const { useCase } = makeUseCase();
    await expect(useCase.execute('p-bad2', { ...rawMetrics, bloodPressure: 'hi/there' })).rejects.toThrow(
      'must be numbers'
    );
  });

  it('propagates validation errors from the DTO parser', async () => {
    const { useCase } = makeUseCase();
    await expect(useCase.execute('p', { ...rawMetrics, heartRate: 'abc' })).rejects.toThrow(ValidationError);
  });

  it('caps stored health data at 200 entries', async () => {
    const { useCase, repository } = makeUseCase();
    const healthData = Array.from({ length: 200 }, (_, i) => ({
      timestamp: new Date(),
      heartRate: i,
      bloodPressureSystolic: 120,
      bloodPressureDiastolic: 80,
      oxygenSaturation: 97,
      temperature: 36.6,
    }));
    await repository.save({ id: 'id-cap', pseudonym: 'capped', healthData });

    await useCase.execute('capped', rawMetrics);
    const stored = await repository.findByPseudonym('capped');
    expect(stored!.healthData).toHaveLength(200);
  });
});
