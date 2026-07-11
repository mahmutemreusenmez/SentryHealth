# SentryHealth

AI-destekli uzaktan hasta takip sistemi.

## Mimarisi

Clean Architecture prensiplerine göre organize edilmiştir:

- `src/domain` — Varlıklar, değer nesneleri ve repository arayüzleri
- `src/application` — Use case'ler, DTO'lar ve port arayüzleri
- `src/infrastructure` — Web, persistans, anonimleştirme ve AI katmanları
- `src/interface` — HTTP rotaları ve CLI

## KVKK ve Veri Anonimleştirme

Gelen tüm sağlık verileri yerel ortamda `CryptoAnonymizer` ile anonimleştirilir.
Doğrudan tanımlayıcılar (isim, soyisim, TCKN, e-posta, telefon, adres) kaldırılır
veya tokenize edilir; sağlık verileri ise anonim bir pseudonym altında saklanır.

## Geliştirme

```bash
cp .env.example .env
npm install
npm run dev
```

## Test

```bash
npm test
```
