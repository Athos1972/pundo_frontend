# E2E Test Report — Shop-Admin Profil-Felder
**Datum:** 2026-04-23
**Tester:** E2E-Tester (claude-sonnet-4-6)
**Spec-Datei:** `e2e/journeys/shop-admin-profile.spec.ts`
**Laufzeit:** ~1.6 Minuten

---

## 1. Coverage-Matrix

| Test | Feld / Kriterium | Methode | Ergebnis |
|------|-----------------|---------|---------|
| A1 | Ausgangszustand nach DB-Reset ist leer | API GET | PASS |
| A2 | description, whatsapp_number, website_url befüllen (UI) | UI + Toast | PASS |
| A3 | description + whatsapp_number in DB gespeichert | API GET | PASS |
| **A3b** | **website_url in DB gespeichert** | **API GET** | **FAIL (Backend-Bug, erwartet)** |
| A4 | Instagram + Facebook Social Links befüllen (UI) | UI + Fill | PASS |
| **A5** | **social_links in DB gespeichert** | **API GET** | **FAIL (Backend-Bug, erwartet)** |
| A6 | spoken_languages (EN + DE) befüllen und speichern | UI | PASS |
| A7 | spoken_languages in DB gespeichert | API GET | PASS |
| A8 | Öffnungszeiten Mo-Fr öffnen (09:00–18:00), Sa+So geschlossen | UI | PASS |
| A9 | Öffnungszeiten Mo-Fr in DB korrekt | API GET | PASS |
| A10 | Customer-Sicht /shops/[slug]: description, WhatsApp, Öffnungszeiten, Sprachen sichtbar | Browser | PASS |
| A11 | phone-Feld | — | SKIP (Design-Gap, Findings unten) |
| A12 | Logo-Upload | — | SKIP (kein File-Input) |
| B1 | Ausgangszustand des bestehenden Shops dokumentiert | API GET | PASS |
| B2 | description ändern (UI + API round-trip) | UI + API | PASS |
| B3 | Montag-Öffnungszeiten auf 10:00–20:00 ändern | UI + API | PASS |
| B4 | Alle 7 Öffnungszeiten-Einträge korrekt strukturiert | API GET | PASS |
| B5 | Alle 7 Checkboxen (open/closed-Toggle) bedienbar | UI | PASS |
| B6 | Zweites Zeitfenster (Split-Schicht) für Montag | UI + API | PASS |
| **B7** | **Instagram Social Link ändern (API round-trip)** | **UI + API** | **FAIL (Backend-Bug, erwartet)** |
| B8 | whatsapp_number ändern (UI + API round-trip) | UI + API | PASS |
| **B9** | **website_url ändern (API round-trip)** | **UI + API** | **FAIL (Backend-Bug, erwartet)** |
| B10 | spoken_languages auf EN + EL setzen | UI + API | PASS |
| B11 | Ungültige Social-Link-URL: Inline-Fehler, Save-Button disabled | UI | PASS |
| B12 | Customer-Sicht nach Edit-Flow: WhatsApp-Link sichtbar | Browser | PASS |
| B13 | Geschlossene Tage erscheinen als "Closed" in Customer-Sicht | Browser | PASS |
| B14 | Ausgangszustand nach Revert korrekt wiederhergestellt | API GET | PASS |

**Gesamt: 25 passed (inkl. 4 erwartete Fehler via test.fail()), 2 skipped, 0 unerwartete Fehler.**

---

## 2. Umgebung

| Parameter | Wert |
|-----------|------|
| Frontend | http://127.0.0.1:3500 (Next.js standalone, `npm run start:standalone`) |
| Backend | http://localhost:8500 (FastAPI / pundo_main_backend) |
| Datenbank | postgres `pundo_test` |
| Playwright | via `playwright.config.ts`, 1 Worker, Chromium headless |
| Global Setup | `e2e/global-setup.ts`: DB-Reset via `prepare_e2e_db.py`, Fixtures via API |
| Test-Owner | `e2e-owner@pundo-e2e.io` / ShopID 2214, slug `e2e-test-shop-larnaca-1` |
| TypeScript | `npx tsc --noEmit` — keine Fehler |

Statische Assets wurden vor Testlauf in das Standalone-Verzeichnis kopiert:
```
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
```
Ohne diesen Schritt schlägt `body[data-hydrated="true"]` (React-Hydrationsmarker) mit Timeout fehl.

---

## 3. Failures (Backend-Bugs)

### BUG-1: website_url und webshop_url werden in PATCH nicht gespeichert

**Tests:** A3b (expected-fail), B9 (expected-fail)

**Beobachtet:** `PATCH /api/v1/shop-owner/shop` mit `{"website_url": "https://test.example.com"}` liefert in der Response `"website_url": null`. Nachfolgendes `GET /api/v1/shop-owner/shop` bestätigt: Feld ist `null`.

**Erwartet:** `website_url` soll nach PATCH in der DB gespeichert und in GET zurückgegeben werden.

**Minimale Reproduktion:**
```bash
TOKEN=$(curl -s -X POST http://localhost:8500/api/v1/shop-owner/login \
  -H "Content-Type: application/json" \
  -d '{"email":"...", "password":"..."}' \
  -i | grep shop_owner_token | sed 's/.*shop_owner_token=\([^;]*\).*/\1/')

curl -s -X PATCH http://localhost:8500/api/v1/shop-owner/shop \
  -H "Content-Type: application/json" -H "Cookie: shop_owner_token=$TOKEN" \
  -d '{"name":"Test","website_url":"https://sichtbar.example.com"}' \
  | python3 -m json.tool | grep website_url
# Gibt: "website_url": null
```

**Root Cause:** `patch_shop` in `/ingestor/api/shop_owner_shop.py` (Zeilen 82–136) enthält keinen Handler für `body.website_url` und `body.webshop_url`. Beide sind im Pydantic-Schema `ShopProfilePatch` definiert, aber nie in die SQLAlchemy-Model-Felder übertragen.

**Fix (Backend, ~4 Zeilen):**
```python
# In patch_shop(), nach dem whatsapp_number-Block, vor session.commit():
if body.website_url is not None:
    shop.website_url = body.website_url
elif "website_url" in body.model_fields_set and body.website_url is None:
    shop.website_url = None

if body.webshop_url is not None:
    shop.webshop_url = body.webshop_url
elif "webshop_url" in body.model_fields_set and body.webshop_url is None:
    shop.webshop_url = None
```
Außerdem muss `ShopProfileResponse` in `patch_shop` mit den fehlenden Feldern vervollständigt werden (derzeit: `website_url`, `webshop_url`, `social_links` werden nicht aus `shop` in die Response eingebaut).

---

### BUG-2: social_links werden in PATCH nicht gespeichert

**Tests:** A5 (expected-fail), B7 (expected-fail)

**Beobachtet:** `PATCH /api/v1/shop-owner/shop` mit `{"social_links": {"instagram": "https://instagram.com/test"}}` liefert `"social_links": null`.

**Root Cause:** Identisch zu BUG-1. In `patch_shop()` fehlt:
```python
if body.social_links is not None:
    shop.social_links = body.social_links
elif "social_links" in body.model_fields_set and body.social_links is None:
    shop.social_links = None
```

---

## 4. Divergenzen von Design/Architektur

### FINDING-1: phone-Feld fehlt in AdminShop und ProfileForm

**Gefunden durch:** A11 (SKIP)

**Sachverhalt:**
- `src/types/shop-admin.ts` → `AdminShop` hat kein `phone`-Feld
- `src/app/(shop-admin)/shop-admin/(portal)/profile/ProfileForm.tsx` → kein phone-Input
- Backend `ShopProfilePatch`-Schema (via `/openapi.json`) → kein `phone`-Feld
- In der Customer-Sicht `src/app/(customer)/shops/[slug]/page.tsx` wird `shop.phone` (aus `ShopDetailResponse`) angezeigt — dieses kommt ausschließlich via Crawler/Admin-Import
- Shop-Owner kann die eigene Telefonnummer **nicht** über das Admin-Portal setzen oder ändern

**Empfehlung:** `phone` zu `ShopProfilePatch`, `AdminShop` und `ProfileForm` hinzufügen.

---

### FINDING-2: HoursEditor behandelt null !== undefined falsch (Frontend-Bug)

**Gefunden durch:** B6 (Debug), A8 (10 Inputs statt 5)

**Sachverhalt:**
HoursEditor (`src/components/shop-admin/HoursEditor.tsx`, Zeile 85) prüft:
```typescript
{slot.second_open !== undefined ? (
  <>...</>  // Zweiten Slot anzeigen
) : (
  <button>+ {tr.second_slot}</button>  // Button zum Hinzufügen
)}
```
Das Backend gibt `second_open: null` zurück (nicht `undefined`). Da `null !== undefined` in JavaScript `true` ergibt, werden die zweiten Zeitfenster-Inputs **immer** angezeigt, wenn der Tag offen ist — der `+ Second time slot`-Button erscheint nie.

**Effekt:** Visuell verwirrend — der Shop-Owner sieht immer 4 Zeitfelder pro offenem Tag (auch wenn kein zweiter Slot gewünscht ist). Der `+ Second time slot`-Button fehlt funktional.

**Fix:**
```typescript
{slot.second_open != null ? (  // != null deckt beides ab: null und undefined
```

---

### FINDING-3: Logo ist URL-Feld, kein File-Upload

**Gefunden durch:** A12 (SKIP)

**Sachverhalt:** `logo_url` ist `<input type="url">` in `ProfileForm.tsx`. Kein File-Upload-Dialog. Logo muss als externe URL eingegeben werden. Dies ist funktional eingeschränkt — ein typischer Shop-Owner will sein Logo hochladen, nicht eine URL kennen.

**Empfehlung:** Separate File-Upload-Komponente (oder S3-Upload mit URL-Rückgabe) hinzufügen.

---

## 5. Verdict

**FIX** — spezifische Backend-Bugs identifiziert, behebbar durch Coder.

**Blockierende Issues (FIX required):**
1. BUG-1: `website_url` / `webshop_url` werden in `patch_shop()` nicht gespeichert (`ingestor/api/shop_owner_shop.py`)
2. BUG-2: `social_links` werden in `patch_shop()` nicht gespeichert (selbe Datei)

**Non-blockierende Findings (empfohlen, aber kein Release-Blocker):**
3. FINDING-1: `phone`-Feld fehlt in Admin-Portal (Design-Gap)
4. FINDING-2: HoursEditor `null !== undefined` — `+ Second time slot`-Button erscheint nie (Frontend-Bug)
5. FINDING-3: Logo-Upload ist URL-Eingabe, kein File-Upload (UX-Gap)

Nach Backend-Fix (BUG-1 + BUG-2): Testergebnisse A3b, A5, A10 (website_url-Teil), B7, B9, B12 (website_url-Teil) von FAIL auf PASS wechseln.
