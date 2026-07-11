# SentryHealth Mimarisi

## 1. Giriş

SentryHealth, Clean Architecture prensiplerine uygun, modüler, test edilebilir ve KVKK'ya uyumlu bir uzaktan hasta takip sistemidir.

## 2. Katmanlar

### Domain
- İş kurallarının ve varlıkların bulunduğu çekirdek katman.
- `entities/`, `value-objects/`, `repositories/` (arayüz)

### Application
- Use case'ler ve uygulama iş akışları.
- `ports/` (dış dünyaya açılan arayüzler), `dto/`, `use-cases/`, `errors/`

### Infrastructure
- Teknik detaylar: web, veritabanı, anonimleştirme, AI, çevre değişkenleri.
- `anonymization/`, `ai/`, `persistence/`, `web/`, `config/`

### Interface
- Kullanıcıya veya dış sistemlere sunum katmanı.
- `http/routes/`, `cli/`

## 3. KVKK ve Veri Anonimleştirme

- **Data Minimization**: Sadece gerekli alanlar saklanır.
- **Pseudonymization**: `CryptoAnonymizer` HMAC-SHA256 ile TCKN ve kişisel bilgileri tokenize eder.
- **Generalization**: Doğum tarihi yaş grubuna dönüştürülür.
- **Lokal İşlem**: Tüm anonimleştirme uygulama sunucusu içinde, açık anahtar olmadan gerçekleştirilir.

## 4. AI Desteği

- `LocalHealthAnalyzer` yerel kurallara göre risk skoru hesaplar.
- İleride harici bir model veya ONNX Runtime ile genişletilebilir.
