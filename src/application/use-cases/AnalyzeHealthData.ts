import type { AnonymizedPatient } from '../ports/Anonymizer.js';
import type { HealthAnalyzer, RiskAssessment } from '../services/HealthAnalyzer.js';

export class AnalyzeHealthData {
  constructor(private readonly analyzer: HealthAnalyzer) {}

  execute(patient: AnonymizedPatient): RiskAssessment {
    return this.analyzer.analyze(patient);
  }
}
