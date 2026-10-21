---
id: contact-form
title: Kontaktformular senden (6 Sprachen), Captcha-Fehler, Rate-Limit (B6220-003)
status: implemented
spec-file: e2e/journeys/contact-form.spec.ts
priority: P2
owner-agent: coder
proposed-in-spec: 2026-10-13-contact-rate-limit
touches-modules:
  - src/components/contact/**
  - src/app/api/contact/**
  - src/app/(customer)/[lang]/contact/**
  - src/components/ui/TurnstileWidget.tsx
touches-roles:
  - guest
status-changed-at: 2026-10-13T00:00:00Z
status-changed-by-spec: 2026-10-13-contact-rate-limit
last-run: 2026-10-13T16:05:00Z
last-result: PASS
---

### Journey: Kontaktformular

**Ziel:** Das Kontaktformular funktioniert in allen 6 Sprachen mit Turnstile (Prüfung nur im Backend), zeigt bei `captcha_failed` und `429` die richtigen Texte und der Backend-Endpoint ist ohne Browser rate-limitiert.

**Hinweis:** Das Test-Backend (8500) hat kein `SMTP_HOST`. Ein Request, der Captcha und Rate-Limit passiert hat, endet daher mit `503`. Das gilt hier als Beleg, dass die Prüfungen bestanden wurden. Es wird keine Mail verschickt.

### C1: Absenden in allen 6 Sprachen (en, de, el, ru, ar, he)
**Steps:** `/<lang>/contact` öffnen, Formular ausfüllen, warten bis der Button aktiv ist (Widget hat Token), absenden.
**Expected:** `POST /api/contact` enthält ein nicht-leeres `turnstile_token`; Status `200` oder `503` (nie `400 captcha_failed`, nie `429`). AR/HE: `dir="rtl"`.

### C2: Captcha-Fehler
**Steps:** Antwort von `/api/contact` auf `400 {error:'captcha_failed'}` mocken (Body aus `e2e/fixtures/contracts/contact-captcha-failed.json`, den die Route erzeugt, geprüft von `src/tests/e2e-contract-fixtures.test.ts`), absenden.
**Expected:** Text `turnstile_failed` sichtbar, Button erst nach neuem Token wieder aktiv.

### C3: Rate-Limit (429) in en und he
**Steps:** Antwort auf `429 {error:'rate_limited'}` mocken (`e2e/fixtures/contracts/contact-rate-limited.json`), absenden.
**Expected:** Text `contact_rate_limited` der jeweiligen Sprache, kein generischer Fehlertext.

### C4: Backend-Endpoint direkt (API)
**Steps:** `POST :8500/api/v1/contact` wiederholt mit einer eindeutigen `X-Forwarded-For`-Adresse (TEST-NET).
**Expected:** Spätestens nach dem Limit (3/min × Multiplikator × 4 Worker) `429`. Davor `503` (ohne SMTP). Wird `200` geliefert (SMTP konfiguriert), bricht der Test ab, damit keine Mails entstehen.
