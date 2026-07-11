import type { HealthMetrics } from '../../domain/entities/HealthMetrics.js';
import type { RiskAssessment } from './HealthAnalyzer.js';

export interface XAIReportGenerator {
  generate(risk: Omit<RiskAssessment, 'report'>, metrics: HealthMetrics): string;
}
