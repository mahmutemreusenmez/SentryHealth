# Test Report — PR #4 Security Hardening

**How tested:** Ran the app locally (`npm run dev`, http://localhost:3000) on branch `devin/1783934835-security-hardening` and verified the security fixes end-to-end — browser UI login flow (recorded) plus API-level auth assertions via shell.

**Result:** All assertions passed. One real bug was found *during* testing (my CORS change threw a 500 on the app's own login) and fixed in commit `23db3cc` before final verification.

---

## Escalation — bug found and fixed during testing
My initial CORS hardening rejected any request whose `Origin` header wasn't in the allowlist by **throwing** (→ 500). Browsers send an `Origin` header even on same-origin POSTs, so the app's own login broke with "Sunucu hatası".

| 🔴 Before fix (first attempt) |
|---|
| ![login 500](/home/ubuntu/screenshots/ss_8bf4f1ab.png) |

Fix (`23db3cc`): the origin callback now returns `false` (omit CORS headers) for disallowed origins instead of throwing, so same-origin requests work and cross-origin ones simply don't receive `Access-Control-Allow-Origin`.

---

## API assertions (shell)
```
1. Backdoor token -> 401 (expect 401)
2. No auth        -> 401 (expect 401)
3. Valid login    -> token(64 chars), authed /api/patients -> 200 (expect 200)
4. Wrong pass     -> 401 (expect 401)
```
Also verified CORS: login with `Origin: http://localhost:3000` → 200; `Origin: https://evil.example.com` → no `Access-Control-Allow-Origin` header.

- Auth-bypass backdoor token (`sentryhealth-local-fallback-token`) rejected with 401 — **passed**
- Unauthenticated `/api/*` request rejected with 401 — **passed**
- Valid login with env-seeded admin creds returns 64-char CSPRNG token + role=admin; token authorizes `/api/patients` (200, 200 patients) — **passed**
- Wrong password rejected with 401 — **passed**
- Disallowed cross-origin gets no CORS header; same-origin works — **passed**

---

## UI assertions (recorded)

| 🟢 Login succeeds → dashboard | 🟢 HMAC key no longer exposed |
|---|---|
| ![dashboard](/home/ubuntu/screenshots/ss_e510a153.png) | ![settings](/home/ubuntu/screenshots/ss_9781dbee.png) |

- Browser login with `yönetici` / env password succeeds (no "Sunucu hatası"); dashboard loads with 200 patients, alarms, MEWS scores — **passed**
- KVKK settings → HMAC key field shows generic label `HMAC-SHA256 · sunucu tarafında yapılandırılmış`, not the literal `default-secret-key` — **passed**

![hmac zoom](/home/ubuntu/screenshots/ss_zoom_132aa2d2.png)

---

## Not verified here
- Salted-scrypt hashing, CSPRNG token, and generic 500 body are covered indirectly (login works, tokens are 64-char hex, error path returned generic "Sunucu hatası") but not separately unit-tested at runtime.
- `npm audit` dev-only advisories (vitest/vite/esbuild) — out of scope, noted as follow-up in the PR.
