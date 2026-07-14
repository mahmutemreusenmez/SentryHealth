import { BP_HISTORY } from "../data/mockData";
import type { ChatMessage, PatientProfile, VitalReading } from "../data/types";

interface Rule {
  keywords: string[];
  reply: (profile: PatientProfile) => string;
}

/** Geçmiş tansiyon ölçümlerinden en yüksek sistolik değeri bulur. */
function peakSystolic(history: VitalReading[]): VitalReading {
  return history.reduce((max, r) => (r.systolic > max.systolic ? r : max));
}

/**
 * Basit, kural tabanlı çevrimdışı asistan.
 * Hastanın kronik tansiyon geçmişini analiz ederek proaktif, tıbbi dilde
 * yanıt üretir. Gerçek dağıtımda SentryHealth'in klinik AI servisine bağlanır.
 */
const RULES: Rule[] = [
  {
    keywords: ["baş dönmesi", "başım dönüyor", "sersemlik", "denge"],
    reply: (profile) => {
      const peak = peakSystolic(BP_HISTORY);
      const hypertensive = profile.chronicConditions.includes("Hipertansiyon");
      const bpNote = hypertensive
        ? `Kayıtlarınıza göre son ölçümlerinizde tansiyonunuz ${peak.label.toLocaleLowerCase("tr-TR")} ${peak.systolic}/${peak.diastolic} mmHg'ye kadar yükselmiş. `
        : "";
      return (
        `${bpNote}Baş dönmesi tansiyon veya kan şekeri değişimiyle ilişkili olabilir. ` +
        "Lütfen oturun, birkaç dakika dinlenin ve su için. Tansiyon ve şeker " +
        "ölçüm cihazınız varsa değerlerinizi ölçüp uygulamaya işleyin. Şikâyet 15 " +
        "dakikada geçmezse veya bilinç bulanıklığı, göğüs ağrısı eklenirse 112'yi arayın."
      );
    },
  },
  {
    keywords: ["tansiyon", "hipertansiyon", "tansiyonum"],
    reply: (profile) => {
      const peak = peakSystolic(BP_HISTORY);
      const latest = BP_HISTORY[0];
      const trend =
        latest.systolic < peak.systolic
          ? "son ölçümünüzde bir miktar gerilemiş olması olumlu"
          : "yükseliş eğiliminde olması takip gerektiriyor";
      return (
        `Son ${BP_HISTORY.length} tansiyon ölçümünüzü inceledim: en yüksek ${peak.systolic}/${peak.diastolic}, ` +
        `en güncel ${latest.systolic}/${latest.diastolic} mmHg. Değerlerin ${trend}. ` +
        "Tuz tüketimini azaltın, ilaçlarınızı düzenli alın ve ölçümlerinizi her gün " +
        "aynı saatte tekrarlayın. 180/110 üzeri bir değerde vakit kaybetmeden 112'yi arayın."
      );
    },
  },
  {
    keywords: ["şeker", "kan şekeri", "hipoglisemi", "glukoz"],
    reply: (p) =>
      p.chronicConditions.includes("Diyabet")
        ? "Diyabet takibinizde kan şekeri düşerse (terleme, titreme) 15 gr hızlı " +
          "karbonhidrat alın ve 15 dakika sonra tekrar ölçün. Yüksekse su için ve " +
          "doktorunuzun planına uyun. HbA1c ölçüm zamanınızı Profil sekmesinden takip edebilirsiniz."
        : "Kan şekeri şikâyetlerinizi kaydedin; belirtiler sürerse hekiminize danışın.",
  },
  {
    keywords: ["ilaç", "doz", "hap", "unuttum"],
    reply: () =>
      "İlaç dozunu unuttuysanız hatırladığınızda alın; ancak sonraki doza çok " +
      "yakınsa atlayın, çift doz almayın. Bugünkü sağlık görevlerinizi Ana Sayfa'daki " +
      "zaman tünelinden takip edebilirsiniz.",
  },
  {
    keywords: ["randevu", "muayene", "kontrol"],
    reply: () =>
      "Yaklaşan randevunuz yarın 10:30'da Kardiyoloji Kontrolü (MHRS öncelikli sıra no: 12). " +
      "Ana Sayfa'daki randevu kartından detayları görebilirsiniz.",
  },
];

const FALLBACK =
  "Sizi anlıyorum. Şikâyetinizi biraz daha detaylandırır mısınız? " +
  "Acil bir durum (şiddetli ağrı, nefes darlığı, bilinç kaybı) varsa lütfen 112'yi arayın.";

export function generateAssistantReply(
  userText: string,
  profile: PatientProfile,
): string {
  const normalized = userText.toLocaleLowerCase("tr-TR");
  const matched = RULES.find((rule) =>
    rule.keywords.some((kw) => normalized.includes(kw)),
  );
  return matched ? matched.reply(profile) : FALLBACK;
}

let counter = 0;
export function createMessage(
  role: ChatMessage["role"],
  text: string,
  viaVoice = false,
): ChatMessage {
  counter += 1;
  return {
    id: `msg-${Date.now()}-${counter}`,
    role,
    text,
    timestamp: Date.now(),
    viaVoice,
  };
}
