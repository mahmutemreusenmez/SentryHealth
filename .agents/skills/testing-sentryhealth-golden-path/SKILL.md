---
name: testing-sentryhealth-golden-path
description: Test SentryHealth end-to-end via the UI (login, patient registration with caregiver/schedule, KVKK anonymization, logout). Use when verifying UI/API changes or refactors that touch auth, patient registration, anonymization, or scorecard rendering.
---

# Testing SentryHealth golden path

SentryHealth is a Turkish-language clinical patient-monitoring SPA (static `public/`
frontend + Express API). Testing is best done through the UI.

## Setup
1. `cp .env.example .env` and set a real `ANONYMIZATION_KEY` (any 32+ char string, e.g.
   `test-secret-key-1234567890`). Missing/short key may make the server refuse to start.
2. `npm install` then `npm run dev` → serves on http://localhost:3000.
3. Login is admin-locked. Credentials live in source (`InMemoryUserStore`): username
   `yönetici`, password `yönetici123`. Expected logged-in user: "Prof. Dr. Ayşe Yılmaz".
   (These are app fixtures, not secrets to request.)

## Golden-path flow (single flow covers most backend utilities)
1. **Login** → header should show the doctor name. Exercises JSON body parsing + user→DTO.
2. **Dashboard/Hastalar list** loads ~200 seeded patients with MEWS scores. Proves authed
   API calls (bearer-token extraction) work.
3. **+ Yeni Hasta Ekle** opens a registration modal with: fullName, nationalId (11 digits,
   `pattern=\d{11}`), dateOfBirth, condition + contactChannel (native `<select>`), caregiver
   fields, and a schedule editor (day checkboxes, time rows, template text). Fill all, submit.
   - Success = KVKK modal: masked name/TCKN, HMAC pseudonym, patient code `H-xxx`, and
     **Yaş Grubu** (age group). Verify age group matches DOB (e.g. DOB 1990 → `35-49`) — this
     is the sharpest check that `deriveAgeGroup` is intact.
   - After closing, the new patient's detail panel shows the caregiver card + schedule card
     (proves caregiver/schedule parsing) and an interaction log with dated rows (proves
     timestamp→ISO serialization).
4. **Logout (Çıkış)** returns to the login screen.

## UI gotchas
- Native `<select>` dropdowns: click to open, click the option; the annotated DOM shows
  `selectedindex`/`selected="true"` to confirm the choice registered.
- The registration modal is scrollable; the time input and template field are near the
  bottom — scroll the modal before interacting. The time input is `type=time`; triple-click
  then type e.g. `09:00AM` (it may keep a prior value if you click the wrong row after scroll,
  so re-verify via DOM).
- Turkish characters (ü, ş, ı) type fine with the `type` action.
- Use the annotated DOM (returned with each Chrome screenshot) to read field `text=` values
  and confirm state rather than relying on the screenshot alone.

## What each utility maps to (for refactor regression testing)
- login body parse + user DTO → Test 1
- bearer token extraction → Test 2 (dashboard) and logout
- deriveAgeGroup, caregiver parse, schedule parse, json body → Test 3 (registration)
- timestamp→ISO → interaction log / scorecard (Test 3 detail view, or MEWS view)

## Devin Secrets Needed
None. App uses in-source fixture login credentials; `ANONYMIZATION_KEY` is any local string.
