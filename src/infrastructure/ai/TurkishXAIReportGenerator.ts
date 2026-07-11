import type { HealthMetrics } from '../../domain/entities/HealthMetrics.js';
import type { RiskAssessment } from '../../application/services/HealthAnalyzer.js';
import type { XAIReportGenerator } from '../../application/services/XAIReportGenerator.js';

export class TurkishXAIReportGenerator implements XAIReportGenerator {
  private readonly labels: Record<RiskAssessment['level'], string> = {
    critical: 'KRİTİK',
    high: 'YÜKSEK',
    medium: 'ORTA',
    low: 'DÜŞÜK',
  };

  generate(risk: Omit<RiskAssessment, 'report'>, metrics: HealthMetrics): string {
    const level = this.labels[risk.level];
    const vitals = `Nabız: ${metrics.heartRate}, SpO2: %${metrics.oxygenSaturation}, Ateş: ${metrics.temperature}°C, Tansiyon: ${metrics.bloodPressureSystolic}/${metrics.bloodPressureDiastolic}`;

    if (risk.level === 'low') {
      return `Hasta ${level} risk altında. Son ölçümde anormal bir değer tespit edilmedi (${vitals}).`;
    }

    const reasons = risk.reasons.join(' ve ');
    return `Hasta ${level} risk altında çünkü ${reasons}. (${vitals})`;
  }
}
