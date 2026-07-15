---
name: testing-mobile-web
description: Run and end-to-end test the SentryCompanion AI Expo/React Native app in a browser via Expo Web. Use when verifying mobile UI/state changes (Dashboard, Video Triage, AI Chat, Profile) without a device/emulator.
---

# Testing SentryCompanion AI (mobile) on Expo Web

The `mobile/` app is Expo SDK 51 + React Native + NativeWind. It runs in a desktop
browser via Expo Web, which is the fastest way to test UI/state end-to-end here.

## Run it
```bash
cd mobile
npm install
npm run web        # or: npx expo start --web --port 8081
```
Then open `http://localhost:8081` in Chrome. The app now boots on the **e-Devlet Auth
screen** (`AuthScreen`), gated by `AuthContext` in `RootNavigator`. After a successful
(simulated) login the four tabs mount under `/Main/*`: `/Main/Dashboard`, `/Main/Triage`,
`/Main/Chat`, `/Main/Profile`.

## Logging in (simulation — no real auth)
The current single valid test account is **`11111111111` / `1234`** (whitelisted; may be
exempt from the checksum rule). Enter it and press "e-Devlet Kapısı ile Giriş Yap" → after
a "Doğrulanıyor..." spinner it routes to Dashboard. Invalid TC / wrong password sets
`auth.error` (inline Turkish message) and does NOT navigate. Log out via Profile → "Güvenli
Çıkış Yap". Note: the set of valid credentials has changed repeatedly across tasks — always
confirm the current whitelist in `AuthContext`/validation before assuming an old TC works.

## Validation commands
```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint .
npx expo export --platform web   # cold-cache full web build; clear node_modules/.cache first to catch cold-start bugs
```

## Known Expo Web gotchas (already fixed — check these if the page is blank)
- **Blank/white page + `_interopRequireDefault is not a function`**: a `@babel/runtime`
  ESM/CJS interop issue. Fix in `metro.config.js`:
  `config.resolver.unstable_enablePackageExports = false;` (restart Metro after editing).
- **`color-scheme` console error** ("Cannot manually set color scheme, dark mode type 'media'"):
  set `darkMode: "class"` in `tailwind.config.js`.
- **`props.pointerEvents is deprecated`** (RN Web): use `style={{ pointerEvents: ... }}`
  instead of the `pointerEvents` prop.
- `expo start` may auto-rewrite `tsconfig.json`/`.gitignore`; those edits are spurious —
  don't commit them (revert with `git restore`).
- NativeWind cold-cache web build can fail on older 4.0.x; 4.1.x builds cleanly.

## What to verify (golden path, all mock data, no backend/secrets)
- **Dashboard**: greeting "Sağlıklı Günler, Mahmut Bey" + e-Nabız badge; MHRS appointment
  card; timeline; the 13:00 pending task's blue "Aldım / Tamamladım" button flips it to
  "Tamamlandı" (state via `PatientContext.completeTask`).
- **Video Triage** (`VideoTriageScreen`): "Görüşmeyi Başlat" → CANLI + streaming clinical
  note; mic button toggles "Mikrofonunuz kapalı"; "Görüşmeyi Bitir" resets to inactive.
- **AI Chat** (`assistantService.ts` rule-based): "başım dönüyor" reply cites BP history
  (`BP_HISTORY`, peak 142/90) and "112"; mic button simulates voice → input shows
  "Dinleniyor...".
- **Profile** (`ProfileScreen` + `screeningAlgorithm.ts`): editing age recomputes
  screenings live (>40 EKG, >50 Kolorektal); toggling Diyabet adds/removes HbA1c + Göz Dibi;
  invalid T.C. (not 11 digits or leading 0) shows red border + validation error.
- **Global state propagation** (single source: `PatientContext`): changes on Profile
  flow to Dashboard and Chat instantly. Set age to 52 on Profile, go back to Dashboard →
  the "Belli Yaş Üstü Zorunlu Tetkikler" section shows the Kolonoskopi card ("Yaş 52 > 50").
  This is the key regression: if the Dashboard cards don't change with age, the shared
  context is broken. AI Chat quick prompt "Yaşım ve hastalığıma göre ne yapmalıyım?" reads
  the same profile → reply starts "Yaşınız 52. 50 yaşın üzerinde olduğunuz için..." and
  references chronic conditions (see `personalizedAdvice` in `assistantService.ts`).
  Note: the personalized rule must NOT use the generic keyword "ne yapmalıyım" — that would
  hijack the "başım dönüyor" prompt; it matches "yaşıma/hastalığıma göre" instead.

## Gold Sürüm features (secure store, WebRTC triage, LLM client, Zod/RHF)
- **Zod + React Hook Form** (`src/utils/validation.ts`): login uses `loginSchema` with a
  real T.C. checksum (`isValidTcKimlik`). Adversarial check: a numerically-11-digit but
  checksum-invalid TC like `12345678901` must be **rejected** ("...kontrol hanesi tutmuyor"),
  while `10000000146` passes. Profile vitals use `vitalsSchema`/`VITAL_LIMITS` — pulse `500`
  and glucose `0` must show range errors and NOT save.
- **Video triage** (`LiveVideoPanel.tsx` web): "Görüşmeyi Başlat" calls real
  `navigator.mediaDevices.getUserMedia`, generates a room like `sentry-triage-mahmut-XXXX`
  and shows a real `https://meet.jit.si/<room>` link. **Camera caveat:** this VM has no
  camera (`ls /dev/video*` → none) and Chrome isn't launched with fake-media flags, so the
  video area stays black and end-call shows "Kamera/mikrofon izni reddedildi veya cihaz
  bulunamadı." The API path/room/link/release are still verifiable; a real frame needs a
  device with a camera (or relaunching Chrome with `--use-fake-device-for-media-stream`,
  which may not be possible mid-session). Report this as an env limitation, not a bug.
- **AI Chat** (`aiClient.ts` + `ChatScreen.tsx`): with no `EXPO_PUBLIC_AI_API_KEY`, header
  reads "Çevrimdışı Mod (anahtar yok)" and replies stream word-by-word (typist) prefixed
  `[Çevrimdışı Mod]`, personalized from profile+vitals. Live SSE against a real endpoint
  needs a key and was not exercised here.
- **Secure storage** (`storageService.ts`): native uses `expo-secure-store`
  (Keychain/Keystore); **web uses an AES-GCM localStorage compatibility fallback (NOT
  hardware-backed)** — don't claim native hardware security when testing on web. Persistence
  spot-check: reload the page → still authenticated → lands on Dashboard directly.
- Native Android/iOS (secure-store + native Jitsi WebView) require an emulator/device;
  not testable via Expo Web.

## SentryBaby (Yeni Doğan) module
- **Conditional tab:** the "Yeni Doğan" tab (`/yeni-dogan`) only mounts when `BabyContext.hasNewborn`
  is true. Toggle it from Profile → "Yeni Doğan Bebek" card ("...Kaldır" hides the tab / "...Ekle"
  restores it). This is separate SecureStore state (`STORAGE_KEYS.baby`) from chronic `PatientContext`
  — verify chronic data (Metformin/HbA1c/age screenings) is untouched when toggling baby state.
- **BabyScreen:** upcoming-vaccine card, WHO percentile `GrowthChart` (react-native-svg) with
  Kilo/Boy/Baş Çevresi metric tabs — switching updates the curve, legend unit, and the
  interpretation line (e.g. "Boy: 60 cm · 50-97. persentil arası" from `classifyPercentile`).
  Measurement form via "Yeni Ölçüm Ekle". Vaccine rows toggle Gecikti/Planlandı → Yapıldı on tap
  and drop out of the "Yaklaşan / Bekleyen Aşı" summary.
- **Ebe/Hemşire triage:** "Ebe / Hemşireye Bağlan" opens a `LiveVideoPanel` with a newborn-specific
  room `sentry-baby-nurse-XXXX` (distinct from chronic `sentry-triage-*`) and a live metadata overlay
  "Ateş X°C · Kilo X kg · Emzirme X/gün". Same camera caveat as chronic triage (black video on VM).
- **Cross-screen referral (key check):** NursePanel (`/nurse-panel`, opened via "Ebe / Hemşire
  Panelini Aç") has 3 referral buttons; tapping one publishes via `babyChannel` (BroadcastChannel /
  in-memory) so the mother's BabyScreen shows the SAME barcode code (e.g. `COC-######`) live as a
  referral card. Because NursePanel is a stack push, BabyScreen stays mounted underneath so its
  subscription persists — navigate back (not re-login) to see the delivered card. Codes are prefixed
  COC (pediatric) / ASM (family-health) / EVD (home).
- Vaccine schedule/percentile/vitals are demo data (labeled "Sağlık Bakanlığı GBP", "simülasyondur").

## Devin Secrets Needed
None to test the offline/simulated golden path. Optional: `EXPO_PUBLIC_AI_API_KEY`
(+ `EXPO_PUBLIC_AI_BASE_URL`, `EXPO_PUBLIC_AI_MODEL`) to exercise the live LLM streaming
path in Chat instead of the offline fallback.

## Klinik revizyon modülleri (MEWS · FHIR · WCAG · KVKK)
- **KVKK Privacy Shield first-launch gate:** `RootNavigator` renders `PrivacyShieldScreen`
  BEFORE the auth/login screen when `PrivacyContext.accepted` is false (persisted under
  `STORAGE_KEYS.privacyConsent`). On a fresh `localhost:8081` origin the shield shows first;
  if you've tested before, localStorage may already hold consent AND auth, so it may skip
  straight to Dashboard after accepting. To re-see the first-launch gate, clear site data
  (or use a fresh origin/incognito). Distinct from the **pre-triage modal**: Triage/Baby
  "Görüşmeyi Başlat"/"Ebe/Hemşireye Bağlan" opens `PrivacyShieldModal` (slide-up, "Okudum,
  Onaylıyorum"/"Vazgeç") BEFORE the `LiveVideoPanel` activates.
- **MEWS card (CDSS) is the key dynamic check:** Dashboard `MewsCard` derives band from the
  latest vitals via `services/mewsEngine.ts` (transparent scoring, not AI). To force RED,
  save vitals in Profile → "Günlük Vital Girişi" (now **6 fields**: Büyük/Küçük Tansiyon,
  Nabız, Şeker, **Solunum Hızı**, **Ateş**). Example that yields "KIRMIZI · MEWS 10":
  systolic 75, pulse 135, respiratory 32, temp 39 (each param 3/3/2/2). Stable values
  (120/80, pulse 72, resp 16, temp 36.7) yield "YEŞİL · MEWS 0" with no triage button.
  A single param scoring 3 alone forces red. If the card looks identical after changing
  vitals, the engine/context wiring is broken.
- **FHIR proof:** Profile's "Erişilebilirlik ve Gizlilik" card shows a live resource count
  ("HL7 FHIR (R4) ... N kaynak"). Saving a full vitals set raises it (e.g. 4→6) as more
  `Observation` resources are generated (`services/fhir.ts`, LOINC-coded). National ID is
  SHA-256 pseudonymized (`services/security.ts`, verified against Node `crypto`).
- **WCAG accessibility mode:** one-tap header button (top-right, aria-label "Erişilebilirlik
  modunu aç veya kapat") flips the whole app to dark high-contrast + enlarged text
  (`context/AccessibilityContext.tsx`, persisted); tapping again reverts. Same toggles also
  live as switches in Profile's accessibility card.
- **SVG trends:** Dashboard "Sağlık Trend Grafikleri" renders dependency-free `react-native-svg`
  line charts (`TrendChart`/`HealthTrends`). BP chart falls back to `BP_HISTORY` seed if <2
  real BP records; glucose chart needs ≥2 real glucose records. Corporate green is now the
  darker `#00875A` (was `#10b981`).

## Testing tips
- The browser wrapper on this VM is a real desktop Chrome; use the `computer` tool for
  clicks/typing. The annotated DOM returned alongside screenshots is reliable for reading
  text/state (e.g. confirming input `text="Dinleniyor..."`).
- Web layout is full-width desktop; responsive phone/tablet behavior (flex-based) is not
  verified this way — note that as a caveat.
