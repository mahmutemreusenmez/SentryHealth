import type {
  ConsciousnessLevel,
  MewsBand,
  MewsParameterScore,
  MewsResult,
  VitalEntry,
} from "../data/types";

/**
 * Klinik Karar Destek Sistemi (CDSS) — Modified Early Warning Score (MEWS).
 *
 * Basit "if-else" tarama mantığının yerine geçen, uluslararası kabul görmüş
 * (Subbe et al. 2001) erken uyarı skorlama algoritmasıdır. Hastanın girdiği
 * vital verileri (solunum hızı, nabız, sistolik kan basıncı, vücut sıcaklığı,
 * bilinç durumu) parametre bazlı puanlanır; toplam skora göre klinik risk
 * bandı (Yeşil/Sarı/Kırmızı) ve yönlendirme üretilir.
 *
 * Ölçüm dışında kalan (NaN/0) parametreler skora dahil edilmez; böylece eksik
 * veri hatalı bir yükseltmeye yol açmaz.
 */

/** MEWS motoruna verilen ham vital girdisi. */
export interface MewsInput {
  respiratoryRate: number;
  pulse: number;
  systolic: number;
  temperature: number;
  consciousness: ConsciousnessLevel;
}

/** Tek bir parametreyi MEWS eşik tablosuna göre puanlar. */
function scoreRespiratory(rate: number): number {
  if (rate <= 0) return 0;
  if (rate < 9) return 2;
  if (rate <= 14) return 0;
  if (rate <= 20) return 1;
  if (rate <= 29) return 2;
  return 3;
}

function scorePulse(pulse: number): number {
  if (pulse <= 0) return 0;
  if (pulse < 40) return 2;
  if (pulse <= 50) return 1;
  if (pulse <= 100) return 0;
  if (pulse <= 110) return 1;
  if (pulse <= 129) return 2;
  return 3;
}

function scoreSystolic(systolic: number): number {
  if (systolic <= 0) return 0;
  if (systolic <= 70) return 3;
  if (systolic <= 80) return 2;
  if (systolic <= 100) return 1;
  if (systolic <= 199) return 0;
  return 2;
}

function scoreTemperature(temp: number): number {
  if (temp <= 0) return 0;
  if (temp < 35) return 2;
  if (temp <= 38.4) return 0;
  return 2;
}

const CONSCIOUSNESS_POINTS: Record<ConsciousnessLevel, number> = {
  alert: 0,
  voice: 1,
  pain: 2,
  unresponsive: 3,
};

const CONSCIOUSNESS_LABEL: Record<ConsciousnessLevel, string> = {
  alert: "Bilinç açık (A)",
  voice: "Sözel uyarana yanıt (V)",
  pain: "Ağrılı uyarana yanıt (P)",
  unresponsive: "Yanıtsız (U)",
};

function bandFor(total: number, hasSevereParam: boolean): MewsBand {
  // Tek bir parametrenin 3 puan alması (kritik sapma) tek başına kırmızı bant
  // tetikler — klinik yükseltme (escalation) kuralı.
  if (total >= 4 || hasSevereParam) return "red";
  if (total >= 2) return "yellow";
  return "green";
}

const BAND_META: Record<MewsBand, { title: string; guidance: string }> = {
  green: {
    title: "Stabil",
    guidance:
      "Vital bulgularınız stabil aralıkta. Rutin takibinize ve ilaç düzeninize devam edin.",
  },
  yellow: {
    title: "Gözlem Önerilir",
    guidance:
      "Bulgularınızda sınırda sapma var. Ölçümü 1 saat içinde tekrarlayın; şikayet artarsa canlı triyaj başlatın.",
  },
  red: {
    title: "Acil Triyaj Gerekli",
    guidance:
      "Erken uyarı skorunuz yüksek. Lütfen vakit kaybetmeden Canlı Triyaj ile hekime/hemşireye bağlanın.",
  },
};

/**
 * Verilen vital girdisi için MEWS skorunu, risk bandını ve klinik
 * yönlendirmeyi hesaplar.
 */
export function calculateMews(input: MewsInput): MewsResult {
  const parts: { label: string; display: string; points: number }[] = [
    {
      label: "Solunum Hızı",
      display: input.respiratoryRate > 0 ? `${input.respiratoryRate} /dk` : "—",
      points: scoreRespiratory(input.respiratoryRate),
    },
    {
      label: "Nabız",
      display: input.pulse > 0 ? `${input.pulse} atım/dk` : "—",
      points: scorePulse(input.pulse),
    },
    {
      label: "Sistolik KB",
      display: input.systolic > 0 ? `${input.systolic} mmHg` : "—",
      points: scoreSystolic(input.systolic),
    },
    {
      label: "Vücut Sıcaklığı",
      display: input.temperature > 0 ? `${input.temperature.toFixed(1)} °C` : "—",
      points: scoreTemperature(input.temperature),
    },
    {
      label: "Bilinç (AVPU)",
      display: CONSCIOUSNESS_LABEL[input.consciousness],
      points: CONSCIOUSNESS_POINTS[input.consciousness],
    },
  ];

  const breakdown: MewsParameterScore[] = parts;
  const total = parts.reduce((sum, p) => sum + p.points, 0);
  const hasSevereParam = parts.some((p) => p.points >= 3);
  const band = bandFor(total, hasSevereParam);
  const meta = BAND_META[band];

  return {
    total,
    band,
    title: meta.title,
    guidance: meta.guidance,
    breakdown,
    triageAdvised: band !== "green",
  };
}

/** Sonlu bir sayı değilse 0 döndürür (eski kayıtlarda eksik alanlar için). */
function finite(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** Kayıtlı vital ölçümünden MEWS girdisi türetir (eksik alanlar için varsayılan). */
export function mewsFromVitals(vitals: VitalEntry): MewsResult {
  return calculateMews({
    respiratoryRate: finite(vitals.respiratoryRate),
    pulse: finite(vitals.pulse),
    systolic: finite(vitals.systolic),
    temperature: finite(vitals.temperature),
    consciousness: vitals.consciousness ?? "alert",
  });
}
