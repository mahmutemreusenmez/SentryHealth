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
On the Auth screen enter a **valid T.C. format** (11 digits, not starting with 0, e.g.
`10000000146`) and any password with **≥4 chars**, then press "e-Devlet Kapısı ile Giriş
Yap". The button shows a "Doğrulanıyor..." spinner (~1.6s in `AuthContext.login`) then
routes to Dashboard. Invalid TC / short password sets `auth.error` and does NOT navigate.
Log out via Profile → "Güvenli Çıkış Yap" (`useAuth().logout`), which returns to Auth.

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

## Devin Secrets Needed
None. The app uses local mock data; no login/API keys required to test.

## Testing tips
- The browser wrapper on this VM is a real desktop Chrome; use the `computer` tool for
  clicks/typing. The annotated DOM returned alongside screenshots is reliable for reading
  text/state (e.g. confirming input `text="Dinleniyor..."`).
- Web layout is full-width desktop; responsive phone/tablet behavior (flex-based) is not
  verified this way — note that as a caveat.
