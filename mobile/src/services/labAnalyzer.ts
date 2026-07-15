import type { LabAnalysis, LabFinding } from "../data/types";

/**
 * SentryLens — Tahlil (laboratuvar) raporu OCR/metin analiz istemcisi.
 *
 * Gerçek bir dağıtımda yüklenen PDF/görüntü bir OCR + LLM zincirine gönderilir.
 * Bu istemci, çıkarılmış metni satır satır tarayıp "TestAdı: değer birim"
 * kalıbını yakalar, bilinen referans aralıklarıyla karşılaştırır ve referans
 * dışı değerleri hastanın anlayacağı sade, korkutmayan bir dille özetler.
 *
 * Cihazdan gerçek OCR yapılamadığında (web/Expo Go) gerçekçi bir örnek tahlil
 * metni analiz edilerek uçtan uca akış çalışır durumda gösterilir.
 */

interface ReferenceRange {
  /** Eşleşme için küçük harf anahtar kelimeler. */
  keywords: string[];
  label: string;
  unit: string;
  low: number;
  high: number;
  lowSummary: string;
  highSummary: string;
}

const REFERENCE_RANGES: ReferenceRange[] = [
  {
    keywords: ["b12", "vitamin b12", "kobalamin"],
    label: "B12 Vitamini",
    unit: "pg/mL",
    low: 197,
    high: 771,
    lowSummary:
      "B12 vitamininiz biraz düşük görünüyor. Genellikle beslenme veya takviye ile kolayca dengelenir; doktorunuz uygun bir takviye önerebilir.",
    highSummary:
      "B12 vitamininiz referansın üzerinde. Çoğunlukla önemli değildir; doktorunuz takviye kullanımınızı gözden geçirebilir.",
  },
  {
    keywords: ["demir", "iron", "ferritin"],
    label: "Demir",
    unit: "ug/dL",
    low: 60,
    high: 170,
    lowSummary:
      "Demir değeriniz düşük çıkmış. Yorgunluk hissettirebilir; demir açısından zengin beslenme ve doktorunuzun önerisiyle takviye faydalı olabilir.",
    highSummary:
      "Demir değeriniz referansın üzerinde. Doktorunuz nedenini birlikte değerlendirmek isteyebilir.",
  },
  {
    keywords: ["hemoglobin", "hgb", "hb"],
    label: "Hemoglobin",
    unit: "g/dL",
    low: 13.5,
    high: 17.5,
    lowSummary:
      "Hemoglobininiz hafif düşük. Kansızlık belirtisi olabilir; doktorunuz beslenme ve takviye açısından yönlendirecektir.",
    highSummary:
      "Hemoglobininiz referansın biraz üzerinde. Sıvı alımınız ve doktor değerlendirmesiyle netleşir.",
  },
  {
    keywords: ["hba1c", "a1c", "glikohemoglobin"],
    label: "HbA1c",
    unit: "%",
    low: 4,
    high: 5.7,
    lowSummary:
      "HbA1c değeriniz düşük aralıkta. Genelde sorun değildir; doktorunuzla birlikte değerlendirebilirsiniz.",
    highSummary:
      "HbA1c değeriniz hedefin üzerinde. Şeker dengenizi doktorunuzla gözden geçirmeniz iyi olur; beslenme ve düzenli takip yardımcı olacaktır.",
  },
  {
    keywords: ["tsh", "tiroid"],
    label: "TSH (Tiroid)",
    unit: "mIU/L",
    low: 0.4,
    high: 4.0,
    lowSummary:
      "Tiroid değeriniz (TSH) düşük görünüyor. Doktorunuz tiroid çalışmanızı birlikte değerlendirecektir.",
    highSummary:
      "Tiroid değeriniz (TSH) yüksek görünüyor. Doktorunuz ek kontrol önerebilir; çoğunlukla kolay yönetilir.",
  },
  {
    keywords: ["d vitamini", "vitamin d", "25-oh", "25 oh"],
    label: "D Vitamini",
    unit: "ng/mL",
    low: 30,
    high: 100,
    lowSummary:
      "D vitamininiz düşük. Ülkemizde çok yaygındır; güneş ışığı ve doktor önerisiyle takviye ile kolayca yükselir.",
    highSummary:
      "D vitamininiz referansın üzerinde. Takviye dozunuzu doktorunuzla gözden geçirebilirsiniz.",
  },
];

/** Örnek (demo) tahlil metni — gerçek OCR çıktısını temsil eder. */
export const SAMPLE_LAB_TEXT = [
  "T.C. Sağlık Bakanlığı - Laboratuvar Sonuç Raporu",
  "Hasta: Mahmut Yılmaz",
  "B12 Vitamini: 120 pg/mL",
  "Demir: 40 ug/dL",
  "Hemoglobin: 14.2 g/dL",
  "HbA1c: 7.8 %",
  "D Vitamini: 18 ng/mL",
  "TSH: 2.1 mIU/L",
].join("\n");

const NUMBER_RE = /(-?\d+(?:[.,]\d+)?)/;

/** Ham tahlil metnini tarayıp referans aralıklarıyla karşılaştırır. */
export function analyzeLabText(text: string): LabFinding[] {
  const findings: LabFinding[] = [];
  const lines = text.split(/\r?\n/);

  for (const range of REFERENCE_RANGES) {
    const line = lines.find((l) => {
      const lower = l.toLocaleLowerCase("tr-TR");
      return range.keywords.some((k) => lower.includes(k));
    });
    if (!line) continue;

    const match = line.match(NUMBER_RE);
    if (!match) continue;
    const value = Number.parseFloat(match[1].replace(",", "."));
    if (!Number.isFinite(value)) continue;

    let status: LabFinding["status"] = "normal";
    let plainSummary = `${range.label} değeriniz referans aralığında. Bu sonuç için endişelenmenize gerek yok.`;
    if (value < range.low) {
      status = "low";
      plainSummary = range.lowSummary;
    } else if (value > range.high) {
      status = "high";
      plainSummary = range.highSummary;
    }

    findings.push({
      name: range.label,
      value,
      unit: range.unit,
      refLow: range.low,
      refHigh: range.high,
      status,
      plainSummary,
    });
  }

  return findings;
}

/** Bulguları hasta dostu bir analiz sonucuna dönüştürür. */
export function buildLabAnalysis(
  fileName: string,
  text: string,
): LabAnalysis {
  const findings = analyzeLabText(text);
  const abnormal = findings.filter((f) => f.status !== "normal");
  const abnormalCount = abnormal.length;

  let overallSummary: string;
  if (findings.length === 0) {
    overallSummary =
      "Yüklenen belgede tanıyabildiğimiz bir laboratuvar değeri bulunamadı. Net bir sonuç için raporun okunaklı bir fotoğrafını veya PDF'ini yükleyebilirsiniz.";
  } else if (abnormalCount === 0) {
    overallSummary =
      "Sonuçlarınızın tamamı referans aralığında görünüyor. Yine de düzenli kontrollerinizi doktorunuzla sürdürmeniz faydalı olacaktır.";
  } else {
    overallSummary = `Sonuçlarınızda ${abnormalCount} değer referans aralığının dışında. Bu genellikle kolay yönetilebilen bir durumdur; aşağıdaki notları doktorunuzla paylaşmanız yeterli olacaktır.`;
  }

  return { fileName, findings, abnormalCount, overallSummary };
}

/** Analiz gecikmesini (OCR + model) simüle eder. */
export async function runLabAnalysis(
  fileName: string,
  text: string,
): Promise<LabAnalysis> {
  await new Promise((resolve) => setTimeout(resolve, 1800));
  return buildLabAnalysis(fileName, text);
}
