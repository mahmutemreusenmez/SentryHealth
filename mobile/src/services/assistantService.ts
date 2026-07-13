import type { ChatMessage, PatientProfile } from "../data/types";

interface Rule {
  keywords: string[];
  reply: (profile: PatientProfile) => string;
}

/**
 * Basit, kural tabanlı çevrimdışı asistan.
 * Gerçek dağıtımda SentryHealth'in klinik AI servisine bağlanacak;
 * iskelet aşamasında güvenli, deterministik yanıtlar üretir.
 */
const RULES: Rule[] = [
  {
    keywords: ["baş dönmesi", "başım dönüyor", "sersemlik", "denge"],
    reply: () =>
      "Baş dönmesi tansiyon veya kan şekeri değişimiyle ilişkili olabilir. " +
      "Lütfen oturun, birkaç dakika dinlenin ve su için. Tansiyon ve şeker " +
      "ölçüm cihazınız varsa değerlerinizi ölçün. Şikâyet 15 dakikada geçmezse " +
      "veya bilinç bulanıklığı, göğüs ağrısı eklenirse 112'yi arayın.",
  },
  {
    keywords: ["göğüs ağrısı", "göğsüm", "nefes", "nefes darlığı"],
    reply: () =>
      "Göğüs ağrısı veya nefes darlığı acil bir durum olabilir. Lütfen hemen " +
      "112'yi arayın ve hareketsiz kalın. Bu bir acil sağlık uyarısıdır.",
  },
  {
    keywords: ["şeker", "kan şekeri", "hipoglisemi", "glukoz"],
    reply: (p) =>
      p.chronicConditions.includes("Diyabet")
        ? "Diyabet takibinizde kan şekeri düşerse (terleme, titreme) 15 gr hızlı " +
          "karbonhidrat alın ve 15 dakika sonra tekrar ölçün. Yüksekse su için ve " +
          "doktorunuzun planına uyun."
        : "Kan şekeri şikâyetlerinizi kaydedin; belirtiler sürerse hekiminize danışın.",
  },
  {
    keywords: ["ilaç", "doz", "hap", "unuttum"],
    reply: () =>
      "İlaç dozunu unuttuysanız hatırladığınızda alın; ancak sonraki doza çok " +
      "yakınsa atlayın, çift doz almayın. Bugünkü ilaç planınızı Ana Sayfa'daki " +
      "zaman çizelgesinden takip edebilirsiniz.",
  },
  {
    keywords: ["randevu", "muayene", "kontrol"],
    reply: () =>
      "Yaklaşan randevularınızı Ana Sayfa'daki zaman çizelgesinde görebilirsiniz. " +
      "MHRS üzerinden yeni randevu almak için hastane ve bölüm seçmeniz yeterli.",
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
