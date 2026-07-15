import type { BabyGender, GrowthMetric, GrowthReferencePoint } from "./types";

/**
 * Dünya Sağlık Örgütü (WHO) Çocuk Gelişim Standartları'na dayalı, cinsiyete
 * göre P3 / P50 / P97 persentil referans değerleri (0-24 ay).
 *
 * Değerler grafik gösterimi için yaklaşık/özet tablolardır; klinik tanı yerine
 * geçmez. Grafik, bebeğin ölçümlerini bu bantlar üzerinde konumlandırır.
 */
type ReferenceTable = Record<
  BabyGender,
  Record<GrowthMetric, GrowthReferencePoint[]>
>;

const rows = (
  values: [number, number, number, number][],
): GrowthReferencePoint[] =>
  values.map(([ageMonths, p3, p50, p97]) => ({ ageMonths, p3, p50, p97 }));

export const GROWTH_REFERENCE: ReferenceTable = {
  female: {
    weightKg: rows([
      [0, 2.4, 3.2, 4.2],
      [1, 3.2, 4.2, 5.5],
      [2, 4.0, 5.1, 6.6],
      [3, 4.6, 5.8, 7.5],
      [4, 5.1, 6.4, 8.2],
      [5, 5.5, 6.9, 8.8],
      [6, 5.8, 7.3, 9.3],
      [9, 6.6, 8.2, 10.5],
      [12, 7.1, 8.9, 11.5],
      [18, 8.1, 10.2, 13.2],
      [24, 9.0, 11.5, 14.8],
    ]),
    heightCm: rows([
      [0, 45.6, 49.1, 52.7],
      [1, 50.0, 53.7, 57.4],
      [2, 53.2, 57.1, 60.9],
      [3, 55.8, 59.8, 63.8],
      [4, 58.0, 62.1, 66.2],
      [5, 59.9, 64.0, 68.2],
      [6, 61.5, 65.7, 70.0],
      [9, 65.3, 70.1, 74.8],
      [12, 68.9, 74.0, 79.2],
      [18, 74.9, 80.7, 86.5],
      [24, 80.0, 86.4, 92.9],
    ]),
    headCm: rows([
      [0, 32.0, 33.9, 35.8],
      [1, 34.8, 36.5, 38.3],
      [2, 36.5, 38.3, 40.1],
      [3, 37.9, 39.5, 41.2],
      [4, 38.9, 40.6, 42.2],
      [5, 39.7, 41.5, 43.2],
      [6, 40.5, 42.2, 43.9],
      [9, 42.0, 43.8, 45.5],
      [12, 43.0, 44.9, 46.7],
      [18, 44.5, 46.2, 48.0],
      [24, 45.5, 47.2, 49.0],
    ]),
  },
  male: {
    weightKg: rows([
      [0, 2.5, 3.3, 4.3],
      [1, 3.4, 4.5, 5.7],
      [2, 4.4, 5.6, 7.0],
      [3, 5.1, 6.4, 7.9],
      [4, 5.6, 7.0, 8.6],
      [5, 6.1, 7.5, 9.2],
      [6, 6.4, 7.9, 9.7],
      [9, 7.2, 8.9, 10.9],
      [12, 7.8, 9.6, 11.8],
      [18, 8.8, 10.9, 13.5],
      [24, 9.7, 12.2, 15.3],
    ]),
    heightCm: rows([
      [0, 46.1, 49.9, 53.7],
      [1, 50.8, 54.7, 58.6],
      [2, 54.4, 58.4, 62.4],
      [3, 57.3, 61.4, 65.5],
      [4, 59.7, 63.9, 68.0],
      [5, 61.7, 65.9, 70.1],
      [6, 63.3, 67.6, 71.9],
      [9, 67.5, 72.0, 76.5],
      [12, 71.0, 75.7, 80.5],
      [18, 76.9, 82.3, 87.7],
      [24, 81.7, 87.8, 93.9],
    ]),
    headCm: rows([
      [0, 32.4, 34.5, 36.6],
      [1, 35.4, 37.3, 39.2],
      [2, 37.2, 39.1, 41.0],
      [3, 38.6, 40.5, 42.4],
      [4, 39.7, 41.6, 43.5],
      [5, 40.6, 42.6, 44.5],
      [6, 41.5, 43.3, 45.2],
      [9, 43.0, 45.2, 46.9],
      [12, 44.2, 46.1, 48.0],
      [18, 45.5, 47.4, 49.3],
      [24, 46.5, 48.3, 50.2],
    ]),
  },
};

/** Lineer interpolasyonla verilen yaş (ay) için referans değerini döndürür. */
function interp(points: { ageMonths: number; value: number }[], age: number): number {
  if (points.length === 0) return 0;
  if (age <= points[0].ageMonths) return points[0].value;
  const last = points[points.length - 1];
  if (age >= last.ageMonths) return last.value;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    if (age <= b.ageMonths) {
      const t = (age - a.ageMonths) / (b.ageMonths - a.ageMonths);
      return a.value + t * (b.value - a.value);
    }
  }
  return last.value;
}

/** Bir ölçüm değerinin yaşına göre yaklaşık persentil konumunu sınıflandırır. */
export function classifyPercentile(
  gender: BabyGender,
  metric: GrowthMetric,
  ageMonths: number,
  value: number,
): { label: string; tone: "low" | "normal" | "high" } {
  const table = GROWTH_REFERENCE[gender][metric];
  const p3 = interp(table.map((r) => ({ ageMonths: r.ageMonths, value: r.p3 })), ageMonths);
  const p50 = interp(table.map((r) => ({ ageMonths: r.ageMonths, value: r.p50 })), ageMonths);
  const p97 = interp(table.map((r) => ({ ageMonths: r.ageMonths, value: r.p97 })), ageMonths);

  if (value < p3) return { label: "3. persentil altı", tone: "low" };
  if (value > p97) return { label: "97. persentil üstü", tone: "high" };
  if (value < p50) return { label: "3-50. persentil arası", tone: "normal" };
  return { label: "50-97. persentil arası", tone: "normal" };
}
