/**
 * Hafif, bağımlılıksız yerelleştirme (i18n) sözlüğü.
 *
 * Uygulama tamamen Türkçedir. Sözlük düz (nokta ayraçlı) anahtar → metin
 * eşlemesiyle tutulur; yeni bir metin eklemek için buraya karşılığını yazmak
 * yeterlidir.
 */

export type Locale = "tr";

export const LOCALES: readonly Locale[] = ["tr"] as const;

/** Her dilin yazım yönü. */
export const LOCALE_DIRECTION: Record<Locale, "ltr" | "rtl"> = {
  tr: "ltr",
};

/** Çeviri anahtarı → metin. */
type Dictionary = Record<string, string>;

const tr: Dictionary = {
  "common.confirm": "Onayla",
  "common.cancel": "Vazgeç",
  "common.close": "Kapat",
  "common.back": "Geri",

  "auth.title": "Güvenli Giriş",
  "auth.subtitle":
    "Sağlık kaydınıza erişmek için e-Devlet Kapısı ile kimliğinizi doğrulayın.",
  "auth.tc": "T.C. Kimlik Numarası",
  "auth.password": "e-Devlet Şifresi",
  "auth.login": "e-Devlet Kapısı ile Giriş Yap",
  "auth.verifying": "Kimlik Doğrulanıyor…",
  "auth.testInfo": "Test Giriş Bilgisi",
  "auth.testHint": "Aşağıdaki bilgilerle doğrudan giriş yapabilirsiniz.",
  "auth.rolePatient": "Hasta",
  "auth.roleDoctor": "Sağlık Personeli",

  "tabs.dashboard": "Ana Sayfa",
  "tabs.triage": "Canlı Triyaj",
  "tabs.chat": "Sağlık Sohbeti",
  "tabs.medication": "İlaç Takibi",
  "tabs.baby": "Yeni Doğan",
  "tabs.profile": "Profil",

  "dashboard.greeting": "Sağlıklı Günler,",
  "dashboard.mewsTitle": "Klinik Erken Uyarı",

  "mews.band.green": "YEŞİL",
  "mews.band.yellow": "SARI",
  "mews.band.red": "KIRMIZI",
  "mews.title.green": "Stabil",
  "mews.title.yellow": "Gözlem Önerilir",
  "mews.title.red": "Acil Triyaj Gerekli",
  "mews.guidance.green":
    "Vital bulgularınız stabil aralıkta. Rutin takibinize ve ilaç düzeninize devam edin.",
  "mews.guidance.yellow":
    "Bulgularınızda sınırda sapma var. Ölçümü 1 saat içinde tekrarlayın; şikayet artarsa canlı triyaj başlatın.",
  "mews.guidance.red":
    "Erken uyarı skorunuz yüksek. Lütfen vakit kaybetmeden Canlı Triyaj ile hekime/hemşireye bağlanın.",
  "mews.startTriage": "Canlı Triyaj Başlat",
  "mews.empty":
    "Profil ekranından güncel vital ölçümünüzü (solunum, nabız, tansiyon, ateş) girin; erken uyarı skorunuz otomatik hesaplansın.",

  "triage.startCall": "Görüşmeyi Başlat",
  "triage.endCall": "Görüşmeyi Bitir",
  "nurse.connect": "Ebe / Hemşireye Bağlan",

  "confirm.triage.title": "Canlı Triyaj Onayı",
  "confirm.triage.message":
    "Canlı triyaj hattına bağlanmak üzeresiniz. Bu hat acil durumlar ve klinik ön değerlendirme içindir. Aramayı başlatmak istediğinizden emin misiniz?",
  "confirm.triage.accept": "Evet, Aramayı Başlat",
  "confirm.nurse.title": "Ebe / Hemşire Triyajı Onayı",
  "confirm.nurse.message":
    "Yeni doğan gelişim ve emzirme danışmanlığı ebe hattına bağlanmak istiyor musunuz?",
  "confirm.nurse.accept": "Evet, Bağlan",

  "doctor.title": "Sağlık Personeli Paneli",
  "doctor.subtitle": "Gelen istekler ve canlı görüşme",
  "doctor.queueTitle": "Gelen İstekler",
  "doctor.queueEmpty":
    "Şu an bekleyen istek yok. Hasta arama başlattığında burada anlık olarak listelenir.",
  "doctor.incomingCall": "Canlı Görüşme Talebi Gönderdi",
  "doctor.accept": "Kabul Et",
  "doctor.reject": "Reddet",
  "doctor.hangup": "Görüşmeyi Bitir",
  "doctor.connecting": "Hastaya bağlanılıyor…",
  "doctor.connected": "Canlı görüşme bağlandı",
  "doctor.lobbyChronic": "Genel / Kronik Triyaj",
  "doctor.lobbyBaby": "Yeni Doğan Desteği",
  "doctor.referralTitle": "Sevk Kararı",
  "doctor.logout": "Panelden Çık",
  "doctor.waitingRoom": "Bekleme Odası",
  "doctor.roleTitle": "Görev Rolünüz",
  "doctor.roleDoctor": "Hekim",
  "doctor.roleNurse": "Hemşire",
  "doctor.roleMidwife": "Ebe",
  "doctor.share": "Paylaş",
  "doctor.shareTitle": "İsteği Paylaş / Koordine Et",
  "doctor.sharedWith": "Paylaşıldı",
  "doctor.chatOpen": "Hasta ile Sohbet",
  "doctor.chatTitle": "Hasta ile Canlı Sohbet",
  "doctor.chatBack": "Görüşmeye Dön",
};

export const TRANSLATIONS: Record<Locale, Dictionary> = { tr };

/** Bir çeviri anahtarını Türkçe metne çözer; yoksa anahtarın kendisine düşer. */
export function translate(_locale: Locale, key: string): string {
  return TRANSLATIONS.tr[key] ?? key;
}
