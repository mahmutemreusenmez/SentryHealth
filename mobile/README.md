# SentryCompanion AI (Mobil)

Kronik hastalar ve yaşlı bireyler için **çapraz platform** (React Native + Expo,
TypeScript) mobil sağlık asistanı. **SentryHealth** ekosisteminin hasta tarafı
uygulamasıdır ve e-Nabız kurumsal sadeliğinde tasarlanmıştır.

## Özellikler

- **Ana Sayfa (Dashboard):** Bugünkü ilaçları, saatlerini ve yaklaşan
  randevuları gösteren zaman çizelgesi (timeline). İlaç uyum özeti ve akıllı
  tetkik önerileri.
- **Profil ve Sağlık Geçmişi:** Ad-soyad, T.C. Kimlik No (11 hane doğrulamalı),
  yaş, cinsiyet ve kronik hastalık seçimi. Değişiklikler önerileri anında
  günceller.
- **AI Asistan Sohbeti:** Sesli (simüle) veya yazılı olarak soru sorulabilen
  minimalist chat arayüzü (ör. "Başım dönüyor, ne yapmalıyım?").

## Akıllı Tetkik Algoritması

`src/services/screeningAlgorithm.ts` yaş ve kronik duruma göre öneri üretir:

| Koşul | Öneri |
| --- | --- |
| Yaş > 40 | Yıllık Kardiyoloji Kontrolü |
| Yaş > 50 (kadın) | 2 Yılda Bir Mamografi |
| Yaş > 50 | Kolon Kanseri Taraması |
| Kronik: Diyabet | 3 Ayda Bir HbA1c Testi |

## Bildirim Simülasyonu

`src/services/notificationService.ts` ilaç saatleri yaklaştığında yerel bildirim
tetikleyen arka plan servisidir. `expo-notifications` varsa gerçek yerel
bildirim planlar; yoksa (Expo Go / web) tamamen bellek içinde simülasyona düşer
ve uygulama içi banner (`NotificationBanner`) gösterir.

## Kurulum

```bash
cd mobile
npm install
npm run start      # Expo geliştirme sunucusu (a: Android, i: iOS, w: web)
npm run typecheck  # TypeScript denetimi
npm run lint       # ESLint
```

## Teknolojiler

Expo SDK 51, React Native 0.74, React Navigation 6, NativeWind 4 (Tailwind CSS),
`@expo/vector-icons` (Ionicons), `expo-notifications`.

## Mimari

```
mobile/
├── App.tsx                      # Kök bileşen (provider + navigator + banner)
├── src/
│   ├── navigation/              # Bottom-tab navigasyon
│   ├── screens/                 # Dashboard, Chat, Profile
│   ├── components/              # Paylaşılan UI + bildirim banner'ı
│   ├── context/                 # PatientProvider (durum yönetimi)
│   ├── services/                # Tetkik algoritması, bildirim, asistan
│   ├── data/                    # Tipler ve mock veriler
│   └── utils/                   # Tarih/saat biçimlendirme
```

> Not: İskelet aşamasında veriler mock'tur ve cihazda yereldir. Üretimde
> SentryHealth API/AI servislerine bağlanacaktır.
