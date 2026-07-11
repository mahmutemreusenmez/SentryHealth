import type { AnonymizedPatient, PatientThreshold } from '../../application/ports/Anonymizer.js';
import type { HealthAnalyzer, RiskAssessment } from '../../application/services/HealthAnalyzer.js';
import type { HealthMetrics } from '../../domain/entities/HealthMetrics.js';
import type { XAIReportGenerator } from '../../application/services/XAIReportGenerator.js';

interface Finding {
  severity: 'critical' | 'high' | 'medium';
  score: number;
  reason: string;
}

interface ThresholdCheck {
  test: (value: number) => boolean;
  severity: 'critical' | 'high' | 'medium';
  score: number;
  reason: (value: number) => string;
}

export class LocalHealthAnalyzer implements HealthAnalyzer {
  constructor(private readonly reportGenerator: XAIReportGenerator) {}

  analyze(patient: AnonymizedPatient): RiskAssessment {
    const latest = patient.healthData.at(-1);
    if (!latest) {
      return { level: 'low', score: 0, reasons: [], report: 'Risk analizi için yeterli veri bulunamadı.' };
    }

    const findings: Finding[] = [
      this.evaluate(latest.heartRate, heartRateChecks),
      this.evaluate(latest.oxygenSaturation, oxygenChecks),
      this.evaluate(latest.temperature, temperatureChecks),
      this.evaluate(latest.bloodPressureSystolic, systolicChecks),
      this.evaluate(latest.bloodPressureDiastolic, diastolicChecks),
    ].filter((f): f is Finding => f !== null);

    const score = findings.reduce((sum, f) => sum + f.score, 0);
    const reasons = findings.map(f => f.reason);
    let level = this.determineLevel(score);
    const customThreshold = this.evaluateCustomThreshold(patient, latest);
    const patientMessage = customThreshold?.message;
    const breachedThreshold = customThreshold?.level ?? null;
    if (breachedThreshold === 'critical') level = 'critical';
    else if (breachedThreshold === 'warning' && level === 'low') level = 'high';
    const riskWithoutReport: Omit<RiskAssessment, 'report'> = { level, score, reasons, patientMessage, breachedThreshold };
    const report = this.reportGenerator.generate(riskWithoutReport, latest);

    return { ...riskWithoutReport, report };
  }

  private evaluate(value: number, checks: ThresholdCheck[]): Finding | null {
    for (const check of checks) {
      if (check.test(value)) {
        return { severity: check.severity, score: check.score, reason: check.reason(value) };
      }
    }
    return null;
  }

  private determineLevel(score: number): RiskAssessment['level'] {
    if (score >= 100) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  }

  private evaluateCustomThreshold(patient: AnonymizedPatient, latest: HealthMetrics): { message: string; level: 'critical' | 'warning' } | undefined {
    const critical = patient.criticalThreshold;
    const warning = patient.warningThreshold;
    if (critical && this.thresholdBreached(critical, latest)) return { message: critical.message, level: 'critical' };
    if (warning && this.thresholdBreached(warning, latest)) return { message: warning.message, level: 'warning' };
    return undefined;
  }

  private thresholdBreached(threshold: PatientThreshold, latest: HealthMetrics): boolean {
    const value = this.getMetricValue(threshold.metric, latest);
    if (value === undefined || Number.isNaN(value)) return false;
    switch (threshold.operator) {
      case '>': return value > threshold.value;
      case '<': return value < threshold.value;
      case '>=': return value >= threshold.value;
      case '<=': return value <= threshold.value;
      case '=': return value === threshold.value;
      default: return false;
    }
  }

  private getMetricValue(metric: PatientThreshold['metric'], latest: HealthMetrics): number | undefined {
    switch (metric) {
      case 'heartRate': return latest.heartRate;
      case 'oxygenSaturation': return latest.oxygenSaturation;
      case 'temperature': return latest.temperature;
      case 'systolic': return latest.bloodPressureSystolic;
      case 'diastolic': return latest.bloodPressureDiastolic;
      default: return undefined;
    }
  }
}

const heartRateChecks: ThresholdCheck[] = [
  { test: v => v > 130 || v < 40, severity: 'critical', score: 100, reason: v => `nabız ${v} kritik seviyede` },
  { test: v => v > 120 || v < 50, severity: 'high', score: 60, reason: v => `nabız ${v} yüksek/düşük seviyede` },
  { test: v => v > 100 || v < 60, severity: 'medium', score: 30, reason: v => `nabız ${v} sınır değerlerde` },
];

const oxygenChecks: ThresholdCheck[] = [
  { test: v => v < 90, severity: 'critical', score: 100, reason: v => `oksijen seviyesi %${v} kritik düşük` },
  { test: v => v < 92, severity: 'high', score: 60, reason: v => `oksijen seviyesi %${v} düşük` },
  { test: v => v < 95, severity: 'medium', score: 30, reason: v => `oksijen seviyesi %${v} sınırda` },
];

const temperatureChecks: ThresholdCheck[] = [
  { test: v => v > 39.5 || v < 35, severity: 'critical', score: 100, reason: v => `ateş ${v}°C kritik seviyede` },
  { test: v => v > 38.5 || v < 35.5, severity: 'high', score: 60, reason: v => `ateş ${v}°C yüksek` },
  { test: v => v > 37.8 || v < 36, severity: 'medium', score: 30, reason: v => `ateş ${v}°C sınırda` },
];

const systolicChecks: ThresholdCheck[] = [
  { test: v => v > 180 || v < 90, severity: 'critical', score: 100, reason: v => `sistolik tansiyon ${v} kritik` },
  { test: v => v > 160 || v < 100, severity: 'high', score: 60, reason: v => `sistolik tansiyon ${v} yüksek/düşük` },
  { test: v => v > 140 || v < 110, severity: 'medium', score: 30, reason: v => `sistolik tansiyon ${v} sınırda` },
];

const diastolicChecks: ThresholdCheck[] = [
  { test: v => v > 110 || v < 60, severity: 'critical', score: 100, reason: v => `diastolik tansiyon ${v} kritik` },
  { test: v => v > 100 || v < 70, severity: 'high', score: 60, reason: v => `diastolik tansiyon ${v} yüksek/düşük` },
  { test: v => v > 90 || v < 80, severity: 'medium', score: 30, reason: v => `diastolik tansiyon ${v} sınırda` },
];
