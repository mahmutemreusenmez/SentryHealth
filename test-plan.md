# Test Plan — PR #4 Security Hardening

App: local server `npm run dev` on http://localhost:3000. Creds from `.env`: `yönetici` / `dev-admin-password-change-me`.

## API assertions (shell)
1. **Backdoor removed** — `GET /api/patients` with `Authorization: Bearer sentryhealth-local-fallback-token` → **401** (previously 200 admin). FAIL if 200.
2. **No auth** — `GET /api/patients` with no header → **401**.
3. **Valid login** — `POST /api/auth/login` {yönetici / dev-admin-password-change-me} → **200** with a 64-char hex `token` + `user.role=admin`. Token authorizes `GET /api/patients` → **200** with patients array.
4. **Wrong password** — `POST /api/auth/login` {yönetici / wrong} → **401**, no token.

## UI flow (recorded)
5. Open http://localhost:3000 → login screen shown.
6. Enter `yönetici` / `dev-admin-password-change-me`, submit → dashboard/app loads with patient data visible (proves server-verified login works with env creds, not the removed hardcoded literal).
7. Navigate to KVKK/settings panel → the HMAC key field must NOT display the literal `default-secret-key`; it shows the generic label instead. FAIL if literal key value shown.

Pass criteria: all assertions match expected values above; a broken (un-hardened) build would show 200 for step 1 and expose the literal key in step 7.
