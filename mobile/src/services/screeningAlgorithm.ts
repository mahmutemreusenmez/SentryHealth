import type {
  PatientProfile,
  ScreeningRecommendation,
} from "../data/types";

/**
 * Yaşa ve kronik duruma göre zorunlu tarama/tetkik önerilerini üretir.
 * Form değerleri (yaş, kronik hastalık) değiştikçe bu liste anlık güncellenir.
 *
 * Kurallar (T.C. Sağlık Bakanlığı tarama mantığına uyumlu):
 *  - Yaş > 40  -> Yıllık EKG ve Kardiyoloji Taraması
 *  - Yaş > 50  -> Kolorektal Kanser Taraması (Kolonoskopi)
 *  - Diyabet   -> 3 Aylık HbA1c Kan Ölçümü + Yıllık Göz Dibi Muayenesi
 */
export function generateScreeningRecommendations(
  profile: PatientProfile,
): ScreeningRecommendation[] {
  const recommendations: ScreeningRecommendation[] = [];
  const { age, chronicConditions } = profile;

  if (age > 40) {
    recommendations.push({
      id: "screen-ekg",
      title: "Yıllık EKG ve Kardiyoloji Taraması",
      description:
        "40 yaş üzeri bireyler için yıllık kalp-damar risk değerlendirmesi ve EKG önerilir.",
      cadence: "Yılda 1 kez",
      status: "Süresi Yaklaşıyor",
      priority: "warning",
      reason: `Yaş ${age} > 40`,
    });
  }

  if (age > 50) {
    recommendations.push({
      id: "screen-colon",
      title: "Kolorektal Kanser Taraması (Kolonoskopi)",
      description:
        "50 yaş üzeri bireyler için gaitada gizli kan testi ve kolonoskopi taraması önerilir.",
      cadence: "10 yılda 1 kolonoskopi",
      status: "Planlanmalı",
      priority: "warning",
      reason: `Yaş ${age} > 50`,
    });
  }

  if (chronicConditions.includes("Diyabet")) {
    recommendations.push({
      id: "screen-hba1c",
      title: "3 Aylık HbA1c Kan Ölçümü",
      description:
        "Diyabet takibinde kan şekeri kontrolünü değerlendirmek için HbA1c ölçümü gereklidir.",
      cadence: "3 ayda 1 kez",
      status: "Zorunlu Takip",
      priority: "critical",
      reason: "Kronik durum: Diyabet",
    });
    recommendations.push({
      id: "screen-eye",
      title: "Yıllık Göz Dibi Muayenesi",
      description:
        "Diyabetik retinopati riskine karşı yılda bir göz dibi (fundus) muayenesi önerilir.",
      cadence: "Yılda 1 kez",
      status: "Zorunlu Takip",
      priority: "critical",
      reason: "Kronik durum: Diyabet",
    });
  }

  return recommendations;
}
