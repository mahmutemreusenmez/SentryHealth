import type {
  PatientProfile,
  ScreeningRecommendation,
} from "../data/types";

/**
 * Yaşa ve kronik duruma göre akıllı tetkik / tarama önerileri üretir.
 *
 * Kurallar (T.C. Sağlık Bakanlığı tarama mantığına uyumlu, e-Nabız tarzı):
 *  - Yaş > 40  -> Yıllık Kardiyoloji Kontrolü
 *  - Yaş > 50  -> 2 Yılda Bir Mamografi (kadınlar için) + Kolon Kanseri Taraması
 *  - Diyabet   -> 3 Ayda Bir HbA1c Testi
 */
export function generateScreeningRecommendations(
  profile: PatientProfile,
): ScreeningRecommendation[] {
  const recommendations: ScreeningRecommendation[] = [];
  const { age, gender, chronicConditions } = profile;

  if (age > 40) {
    recommendations.push({
      id: "screen-cardio",
      title: "Yıllık Kardiyoloji Kontrolü",
      description:
        "40 yaş üzeri bireyler için yıllık kalp-damar risk değerlendirmesi önerilir.",
      cadence: "Yılda 1 kez",
      priority: "warning",
      reason: `Yaş ${age} > 40`,
    });
  }

  if (age > 50) {
    if (gender === "female") {
      recommendations.push({
        id: "screen-mammography",
        title: "2 Yılda Bir Mamografi",
        description:
          "50 yaş üzeri kadınlarda meme kanseri taraması için mamografi önerilir.",
        cadence: "2 yılda 1 kez",
        priority: "warning",
        reason: `Yaş ${age} > 50 ve cinsiyet kadın`,
      });
    }

    recommendations.push({
      id: "screen-colon",
      title: "Kolon Kanseri Taraması",
      description:
        "50 yaş üzeri bireyler için gaitada gizli kan testi ve kolonoskopi taraması önerilir.",
      cadence: "1-2 yılda 1 kez",
      priority: "warning",
      reason: `Yaş ${age} > 50`,
    });
  }

  if (chronicConditions.includes("Diyabet")) {
    recommendations.push({
      id: "screen-hba1c",
      title: "3 Ayda Bir HbA1c Testi",
      description:
        "Diyabet takibinde kan şekeri kontrolünü değerlendirmek için HbA1c ölçümü gereklidir.",
      cadence: "3 ayda 1 kez",
      priority: "critical",
      reason: "Kronik durum: Diyabet",
    });
  }

  return recommendations;
}
