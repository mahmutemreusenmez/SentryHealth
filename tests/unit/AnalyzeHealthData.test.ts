import { describe, it, expect, vi } from 'vitest';
import { AnalyzeHealthData } from '../../src/application/use-cases/AnalyzeHealthData.js';
import type { HealthAnalyzer, RiskAssessment } from '../../src/application/services/HealthAnalyzer.js';
import type { AnonymizedPatient } from '../../src/application/ports/Anonymizer.js';

describe('AnalyzeHealthData', () => {
  it('delegates to the analyzer and returns its assessment', () => {
    const assessment: RiskAssessment = { level: 'high', score: 60, reasons: ['x'], report: 'r' };
    const analyzer: HealthAnalyzer = { analyze: vi.fn().mockReturnValue(assessment) };
    const useCase = new AnalyzeHealthData(analyzer);

    const patient: AnonymizedPatient = { id: 'p', pseudonym: 'x', healthData: [] };
    const result = useCase.execute(patient);

    expect(result).toBe(assessment);
    expect(analyzer.analyze).toHaveBeenCalledWith(patient);
  });
});
