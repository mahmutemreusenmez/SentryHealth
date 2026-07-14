# SentryCompanion AI (Mobil)

Kronik hastalar ve yaşlı bireyler için **çapraz platform** (React Native + Expo,
TypeScript) mobil sağlık asistanı. **SentryHealth** ekosisteminin hasta tarafı
uygulamasıdır ve e-Nabız kurumsal sadeliğinde tasarlanmıştır.

## Ekranlar (4'lü Alt Menü / Tab Navigation)

- **Ana Sayfa (Dashboard):** "Sağlıklı Günler, Mahmut Bey" karşılama alanı +
  e-Nabız logo simülasyonu, "Bugünkü Sağlık Görevleriniz" zaman tüneli
  (ölçüm/ilaç/aktivite kartları, bekleyen görev için mavi tamamlama butonu) ve
  MHRS öncelikli sıra numaralı yaklaşan randevu kartı.
- **Canlı Triyaj Odası (Video Triage):** Yapay zeka hekimi bağlantısını simüle
  eden görüntülü görüşme ekranı; kamera görünümü, Görüşmeyi Başlat/Bitir ve
  mikrofon kontrolleri, altyazı gibi akan klinik analiz notu.
- **SentryCompanion AI (Sohbet):** Steril gri-beyaz sohbet arayüzü. Hastanın
  kronik tansiyon geçmişini analiz ederek proaktif, tıbbi dilde yanıt üretir
  (ör. "Bugün başım dönüyor, ne yapmalıyım?"). Sesli giriş simülasyonu.
- **Profil ve Dinamik Tetkikler:** Yaş ve kronik hastalık formu; değerler
  değiştikçe zorunlu tetkik listesi anlık güncellenir.

## Akıllı Tetkik Algoritması

`src/services/screeningAlgorithm.ts` yaş ve kronik duruma göre öneri üretir:

| Koşul | Öneri | Durum |
| --- | --- | --- |
| Yaş > 40 | Yıllık EKG ve Kardiyoloji Taraması | Süresi Yaklaşıyor |
| Yaş > 50 | Kolorektal Kanser Taraması (Kolonoskopi) | Planlanmalı |
| Kronik: Diyabet | 3 Aylık HbA1c Kan Ölçümü | Zorunlu Takip |
| Kronik: Diyabet | Yıllık Göz Dibi Muayenesi | Zorunlu Takip |

## Bildirim Simülasyonu

`src/services/notificationService.ts` bekleyen sağlık görevleri yaklaştığında
yerel bildirim tetikleyen arka plan servisidir. `expo-notifications` varsa gerçek
yerel bildirim planlar; yoksa (Expo Go / web) tamamen bellek içinde simülasyona
düşer ve uygulama içi banner (`NotificationBanner`) gösterir.

## Kurumsal Kimlik / Renk Paleti

Yalnızca e-Nabız yeşili (`#10b981`), Sağlık Bakanlığı mavisi (`#0284c7`), temiz
beyaz ve gri tonları kullanılır. Parlak/neon renk yoktur.

## Kurulum

```bash
cd mobile
npm install
npm run start      # Expo geliştirme sunucusu (a: Android, i: iOS, w: web)
npm run web        # Tarayıcıda Expo Web
npm run typecheck  # TypeScript denetimi
npm run lint       # ESLint
```

## Teknolojiler

Expo SDK 51, React Native 0.74, React Navigation 6, NativeWind 4 (Tailwind CSS),
`lucide-react-native` (+ `react-native-svg`), `expo-notifications`.

## Mimari

```
mobile/
├── App.tsx                      # Kök bileşen (provider + navigator + banner)
├── src/
│   ├── navigation/              # 4'lü bottom-tab navigasyon (Lucide ikonlar)
│   ├── screens/                 # Dashboard, VideoTriage, Chat, Profile
│   ├── components/              # Paylaşılan UI + bildirim banner'ı
│   ├── context/                 # PatientProvider (durum yönetimi)
│   ├── services/                # Tetkik algoritması, bildirim, asistan
│   ├── data/                    # Tipler ve mock veriler
│   └── utils/                   # Tarih/saat biçimlendirme
```

> Not: İskelet aşamasında veriler mock'tur ve cihazda yereldir. Üretimde
> SentryHealth API/AI servislerine bağlanacaktır.
