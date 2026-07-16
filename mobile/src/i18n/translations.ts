/**
 * Hafif, bağımlılıksız yerelleştirme (i18n) sözlüğü.
 *
 * Desteklenen diller: Türkçe (tr), İngilizce (en), Arapça (ar).
 * Sözlük düz (nokta ayraçlı) anahtar → metin eşlemesiyle tutulur; yeni anahtar
 * eklemek için üç dile de karşılığını yazmak yeterlidir. Arapça sağdan-sola
 * (RTL) bir dildir; yön bilgisi `LOCALE_DIRECTION` ile sağlanır.
 */

export type Locale = "tr" | "en" | "ar";

export const LOCALES: readonly Locale[] = ["tr", "en", "ar"] as const;

/** Dil seçicide gösterilen kısa etiketler. */
export const LOCALE_LABEL: Record<Locale, string> = {
  tr: "TR",
  en: "EN",
  ar: "AR",
};

/** Her dilin yazım yönü (Arapça sağdan sola). */
export const LOCALE_DIRECTION: Record<Locale, "ltr" | "rtl"> = {
  tr: "ltr",
  en: "ltr",
  ar: "rtl",
};

/** Çeviri anahtarı → dile göre metin. */
type Dictionary = Record<string, string>;

const tr: Dictionary = {
  "common.confirm": "Onayla",
  "common.cancel": "Vazgeç",
  "common.close": "Kapat",
  "common.back": "Geri",
  "common.language": "Dil",

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
  "auth.roleDoctor": "Hekim",

  "tabs.dashboard": "Ana Sayfa",
  "tabs.triage": "Canlı Triyaj",
  "tabs.chat": "AI Sohbet",
  "tabs.pharmacy": "Eczane",
  "tabs.baby": "Yeni Doğan",
  "tabs.profile": "Profil",

  "dashboard.greeting": "Sağlıklı Günler,",
  "dashboard.mewsTitle": "Klinik Erken Uyarı (MEWS)",

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

  "doctor.title": "SentryMD Mobil Hekim Paneli",
  "doctor.subtitle": "Aktif triyaj kuyruğu ve canlı görüşme",
  "doctor.queueTitle": "Gelen Canlı Triyaj İstekleri",
  "doctor.queueEmpty":
    "Şu an bekleyen çağrı yok. Hasta arama başlattığında burada anlık olarak listelenir.",
  "doctor.incomingCall": "Canlı Görüşme Talebi Gönderdi",
  "doctor.accept": "Kabul Et",
  "doctor.reject": "Reddet",
  "doctor.hangup": "Görüşmeyi Bitir",
  "doctor.connecting": "Hastaya bağlanılıyor…",
  "doctor.connected": "Canlı görüşme bağlandı",
  "doctor.lobbyChronic": "Kronik / Genel Triyaj",
  "doctor.lobbyBaby": "Yeni Doğan (Ebe/Hemşire)",
  "doctor.referralTitle": "Sevk Kararı",
  "doctor.logout": "Panelden Çık",
  "doctor.waitingRoom": "Bekleme Odası",
};

const en: Dictionary = {
  "common.confirm": "Confirm",
  "common.cancel": "Cancel",
  "common.close": "Close",
  "common.back": "Back",
  "common.language": "Language",

  "auth.title": "Secure Login",
  "auth.subtitle":
    "Verify your identity via the e-Devlet Gateway to access your health record.",
  "auth.tc": "National ID (T.C.)",
  "auth.password": "e-Devlet Password",
  "auth.login": "Sign in with e-Devlet Gateway",
  "auth.verifying": "Verifying identity…",
  "auth.testInfo": "Test Login Details",
  "auth.testHint": "You can sign in directly with the details below.",
  "auth.rolePatient": "Patient",
  "auth.roleDoctor": "Doctor",

  "tabs.dashboard": "Home",
  "tabs.triage": "Live Triage",
  "tabs.chat": "AI Chat",
  "tabs.pharmacy": "Pharmacy",
  "tabs.baby": "Newborn",
  "tabs.profile": "Profile",

  "dashboard.greeting": "Good health,",
  "dashboard.mewsTitle": "Clinical Early Warning (MEWS)",

  "mews.band.green": "GREEN",
  "mews.band.yellow": "AMBER",
  "mews.band.red": "RED",
  "mews.title.green": "Stable",
  "mews.title.yellow": "Observation Advised",
  "mews.title.red": "Urgent Triage Required",
  "mews.guidance.green":
    "Your vital signs are within a stable range. Continue your routine follow-up and medication schedule.",
  "mews.guidance.yellow":
    "There is a borderline deviation in your readings. Repeat the measurement within 1 hour; start live triage if symptoms worsen.",
  "mews.guidance.red":
    "Your early warning score is high. Please connect to a clinician/nurse via Live Triage without delay.",
  "mews.startTriage": "Start Live Triage",
  "mews.empty":
    "Enter your current vitals (respiration, pulse, blood pressure, temperature) on the Profile screen to auto-calculate your early warning score.",

  "triage.startCall": "Start Call",
  "triage.endCall": "End Call",
  "nurse.connect": "Connect to Midwife / Nurse",

  "confirm.triage.title": "Live Triage Confirmation",
  "confirm.triage.message":
    "You are about to connect to the live triage line. This line is for emergencies and clinical pre-assessment. Are you sure you want to start the call?",
  "confirm.triage.accept": "Yes, Start Call",
  "confirm.nurse.title": "Midwife / Nurse Triage Confirmation",
  "confirm.nurse.message":
    "Do you want to connect to the midwife line for newborn development and breastfeeding counselling?",
  "confirm.nurse.accept": "Yes, Connect",

  "doctor.title": "SentryMD Mobile Clinician Panel",
  "doctor.subtitle": "Active triage queue and live call",
  "doctor.queueTitle": "Incoming Live Triage Requests",
  "doctor.queueEmpty":
    "No waiting calls right now. When a patient starts a call it will appear here instantly.",
  "doctor.incomingCall": "sent a live call request",
  "doctor.accept": "Accept",
  "doctor.reject": "Reject",
  "doctor.hangup": "End Call",
  "doctor.connecting": "Connecting to patient…",
  "doctor.connected": "Live call connected",
  "doctor.lobbyChronic": "Chronic / General Triage",
  "doctor.lobbyBaby": "Newborn (Midwife/Nurse)",
  "doctor.referralTitle": "Referral Decision",
  "doctor.logout": "Exit Panel",
  "doctor.waitingRoom": "Waiting Room",
};

const ar: Dictionary = {
  "common.confirm": "تأكيد",
  "common.cancel": "إلغاء",
  "common.close": "إغلاق",
  "common.back": "رجوع",
  "common.language": "اللغة",

  "auth.title": "تسجيل دخول آمن",
  "auth.subtitle": "تحقّق من هويتك عبر بوابة e-Devlet للوصول إلى سجلك الصحي.",
  "auth.tc": "رقم الهوية الوطنية",
  "auth.password": "كلمة مرور e-Devlet",
  "auth.login": "الدخول عبر بوابة e-Devlet",
  "auth.verifying": "جارٍ التحقّق من الهوية…",
  "auth.testInfo": "بيانات دخول تجريبية",
  "auth.testHint": "يمكنك تسجيل الدخول مباشرة بالبيانات أدناه.",
  "auth.rolePatient": "مريض",
  "auth.roleDoctor": "طبيب",

  "tabs.dashboard": "الرئيسية",
  "tabs.triage": "الفرز المباشر",
  "tabs.chat": "المساعد الذكي",
  "tabs.pharmacy": "الصيدلية",
  "tabs.baby": "حديثو الولادة",
  "tabs.profile": "الملف",

  "dashboard.greeting": "دوام الصحة،",
  "dashboard.mewsTitle": "الإنذار المبكر السريري (MEWS)",

  "mews.band.green": "أخضر",
  "mews.band.yellow": "أصفر",
  "mews.band.red": "أحمر",
  "mews.title.green": "مستقر",
  "mews.title.yellow": "يُنصح بالمراقبة",
  "mews.title.red": "الفرز العاجل مطلوب",
  "mews.guidance.green":
    "علاماتك الحيوية ضمن النطاق المستقر. تابع متابعتك الروتينية ونظام أدويتك.",
  "mews.guidance.yellow":
    "هناك انحراف حدّي في قياساتك. كرّر القياس خلال ساعة، وابدأ الفرز المباشر إذا ازدادت الأعراض.",
  "mews.guidance.red":
    "درجة الإنذار المبكر مرتفعة. يرجى الاتصال بطبيب/ممرضة عبر الفرز المباشر دون تأخير.",
  "mews.startTriage": "ابدأ الفرز المباشر",
  "mews.empty":
    "أدخل علاماتك الحيوية الحالية (التنفّس، النبض، ضغط الدم، الحرارة) في شاشة الملف لحساب درجة الإنذار المبكر تلقائياً.",

  "triage.startCall": "بدء المكالمة",
  "triage.endCall": "إنهاء المكالمة",
  "nurse.connect": "الاتصال بالقابلة / الممرضة",

  "confirm.triage.title": "تأكيد الفرز المباشر",
  "confirm.triage.message":
    "أنت على وشك الاتصال بخط الفرز المباشر. هذا الخط مخصّص للحالات الطارئة والتقييم السريري الأولي. هل أنت متأكد أنك تريد بدء المكالمة؟",
  "confirm.triage.accept": "نعم، ابدأ المكالمة",
  "confirm.nurse.title": "تأكيد فرز القابلة / الممرضة",
  "confirm.nurse.message":
    "هل تريد الاتصال بخط القابلة لاستشارة نمو حديثي الولادة والرضاعة؟",
  "confirm.nurse.accept": "نعم، اتصل",

  "doctor.title": "لوحة الطبيب المتنقلة SentryMD",
  "doctor.subtitle": "قائمة انتظار الفرز النشطة والمكالمة المباشرة",
  "doctor.queueTitle": "طلبات الفرز المباشر الواردة",
  "doctor.queueEmpty":
    "لا توجد مكالمات في الانتظار الآن. عندما يبدأ مريض مكالمة سيظهر هنا فوراً.",
  "doctor.incomingCall": "أرسل طلب مكالمة مباشرة",
  "doctor.accept": "قبول",
  "doctor.reject": "رفض",
  "doctor.hangup": "إنهاء المكالمة",
  "doctor.connecting": "جارٍ الاتصال بالمريض…",
  "doctor.connected": "تم الاتصال المباشر",
  "doctor.lobbyChronic": "الفرز المزمن / العام",
  "doctor.lobbyBaby": "حديثو الولادة (قابلة/ممرضة)",
  "doctor.referralTitle": "قرار الإحالة",
  "doctor.logout": "خروج من اللوحة",
  "doctor.waitingRoom": "غرفة الانتظار",
};

export const TRANSLATIONS: Record<Locale, Dictionary> = { tr, en, ar };

/** Bir çeviri anahtarını verilen dile göre çözer; yoksa Türkçe'ye, o da yoksa anahtara düşer. */
export function translate(locale: Locale, key: string): string {
  return TRANSLATIONS[locale][key] ?? TRANSLATIONS.tr[key] ?? key;
}
