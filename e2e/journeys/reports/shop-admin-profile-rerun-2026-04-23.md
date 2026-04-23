# E2E Re-Run Report — Shop-Admin Profil-Felder (Bug-Fix Verification)

**Datum:** 2026-04-23
**Tester:** E2E-Tester (claude-sonnet-4-6)
**Spec-Datei:** `e2e/journeys/shop-admin-profile.spec.ts`
**Anlass:** Verifikation der Backend-Bug-Fixes (BUG-1, BUG-2) und Frontend-Fix (FINDING-2)
**Laufzeit:** ~1.9 Minuten (final passing run)
**Vorheriger Report:** `shop-admin-profile-2026-04-23.md`

---

## Zusammenfassung der Fixes

| Fix | Datei | Beschreibung |
|-----|-------|-------------|
| BUG-1 | `ingestor/api/shop_owner_shop.py` | `website_url` und `webshop_url` wurden in `patch_shop()` nicht gespeichert |
| BUG-2 | `ingestor/api/shop_owner_shop.py` | `social_links` wurde in `patch_shop()` nicht gespeichert |
| BUG-1+2 (Response) | `ingestor/api/shop_owner_shop.py` | Response-Builder in `get_shop()` und `patch_shop()` enthielten bereits die Felder — keine Response-Fix nötig |
| FINDING-2 | `src/components/shop-admin/HoursEditor.tsx` | `slot.second_open !== undefined` geändert zu `slot.second_open != null` |

---

## Spec-Anpassungen

Die `test.fail()` Wrapper in den Tests A3b, A5, B7, B9 wurden entfernt, da die Bugs behoben wurden. Zusätzliche Änderungen:

- **A3b**: Testname und Kommentar angepasst (von "BACKEND-BUG" zu normaler Assertions-Test)
- **A5**: `test.fail()` entfernt, Bug-Kommentar durch Fix-Notiz ersetzt
- **A10**: website_url-Verifikation in Customer-Sicht wieder aktiviert (war wegen Bug auskommentiert)
- **B6**: B6-Kommentar angepasst für FINDING-2-Fix (second_open != null)
- **B7**: `test.fail()` entfernt, `expect.soft` zu `expect` geändert, Bug-Kommentar durch Fix-Notiz ersetzt
- **B9**: `test.fail()` entfernt, Bug-Kommentar durch Fix-Notiz ersetzt
- **B12**: website_url-Verifikation in Customer-Sicht wieder aktiviert
- **B14**: Bug-Kommentar in Assertion-Beschreibung entfernt

---

## 1. Coverage-Matrix

| Test | Feld / Kriterium | Methode | Ergebnis |
|------|-----------------|---------|---------|
| A1 | Ausgangszustand nach DB-Reset ist leer | API GET | PASS |
| A2 | description, whatsapp_number, website_url befüllen (UI) | UI + Toast | PASS |
| A3 | description + whatsapp_number in DB gespeichert | API GET | PASS |
| **A3b** | **website_url in DB gespeichert (Bug-Fix BUG-1)** | **API GET** | **PASS** |
| A4 | Instagram + Facebook Social Links befüllen (UI) | UI + Fill | PASS |
| **A5** | **social_links in DB gespeichert (Bug-Fix BUG-2)** | **API GET** | **PASS** |
| A6 | spoken_languages (EN + DE) befüllen und speichern | UI | PASS |
| A7 | spoken_languages in DB gespeichert | API GET | PASS |
| A8 | Öffnungszeiten Mo-Fr öffnen (09:00–18:00), Sa+So geschlossen | UI | PASS |
| A9 | Öffnungszeiten Mo-Fr in DB korrekt | API GET | PASS |
| A10 | Customer-Sicht /shops/[slug]: description, website_url, WhatsApp, Öffnungszeiten, Sprachen sichtbar | Browser | PASS |
| A11 | phone-Feld | — | SKIP (Design-Gap, unverändert) |
| A12 | Logo-Upload | — | SKIP (kein File-Input, unverändert) |
| B1 | Ausgangszustand des bestehenden Shops dokumentiert | API GET | PASS |
| B2 | description ändern (UI + API round-trip) | UI + API | PASS |
| B3 | Montag-Öffnungszeiten auf 10:00–20:00 ändern | UI + API | PASS |
| B4 | Alle 7 Öffnungszeiten-Einträge korrekt strukturiert | API GET | PASS |
| B5 | Alle 7 Checkboxen (open/closed-Toggle) bedienbar | UI | PASS |
| B6 | Zweites Zeitfenster (Split-Schicht) für Montag (FINDING-2-Fix) | UI + API | PASS |
| **B7** | **Instagram Social Link ändern — API round-trip (Bug-Fix BUG-2)** | **UI + API** | **PASS** |
| B8 | whatsapp_number ändern (UI + API round-trip) | UI + API | PASS |
| **B9** | **website_url ändern — API round-trip (Bug-Fix BUG-1)** | **UI + API** | **PASS** |
| B10 | spoken_languages auf EN + EL setzen | UI + API | PASS |
| B11 | Ungültige Social-Link-URL: Inline-Fehler, Save-Button disabled | UI | PASS |
| B12 | Customer-Sicht nach Edit-Flow: WhatsApp, website_url, Öffnungszeiten sichtbar | Browser | PASS |
| B13 | Geschlossene Tage erscheinen als "Closed" in Customer-Sicht | Browser | PASS |
| B14 | Ausgangszustand nach Revert korrekt wiederhergestellt | API GET | PASS |

**Gesamt: 25 passed, 2 skipped (A11, A12 — intentional), 0 failed.**

---

## 2. Umgebung

| Parameter | Wert |
|-----------|------|
| Frontend | http://127.0.0.1:3500 (Next.js standalone, PID 29379) |
| Backend | http://localhost:8500 (FastAPI / pundo_main_backend, neue Worker-Instanz) |
| Datenbank | `pundo_test` (frisch resettet via `prepare_e2e_db.py`) |
| Playwright | via `npx playwright test` (global-setup läuft automatisch) |
| Datum/Uhrzeit | 2026-04-23, ~19:50 Uhr |

### Besonderheiten beim Setup

Vor dem finalen Testlauf musste der Test-Backend-Server (Port 8500) neu gestartet werden, weil:
1. Der ursprünglich laufende Server (PID 33775) war ohne `--reload` mit altem Code gestartet worden (vor den Backend-Fixes).
2. Ein manueller `kill 33775` und Neustart via `./scripts/start_test_server.sh` führte zu einem PostgreSQL-Deadlock beim ersten `npx playwright test` Lauf (zwei Backend-Instanzen hielten gleichzeitig DB-Locks).
3. Beim zweiten Lauf schlug B9 sporadisch fehl (Backend-Verbindungspool-Resettierungsartefakt nach Deadlock).
4. Ab dem dritten Lauf (nach vollständigem global-setup-Neustart und sauberem DB-Reset) passierten alle 25 Tests konsistent.

---

## 3. Failures

**Keine Failures im finalen Lauf.**

### Zuvor beobachteter sporadischer Fehler (B9, intermediärer Lauf)

**Test:** B9 — UI + API: website_url ändern
**Beobachtet:** Toast "Something went wrong. Please try again." anstatt "Saved/Gespeichert"
**Ursache:** Die PATCH-Anfrage an `/api/shop-admin/shop` schlug fehl (nicht-OK HTTP-Status). Ursache war ein Zustand aus dem Deadlock-Recovery: der Backend-Connection-Pool hatte noch ungültige Verbindungen. Nach vollständigem Neustart via global-setup nicht mehr reproduzierbar.
**Status:** Transientes Infrastrukturproblem, kein Bugs-Fix nötig.

---

## 4. Verifizierte Fixes

### BUG-1: website_url / webshop_url nicht gespeichert

**Datei:** `/Users/bb_studio_2025/dev/github/pundo_main_backend/ingestor/api/shop_owner_shop.py`
**Fix:** `patch_shop()` hat jetzt:
```python
if body.website_url is not None:
    shop.website_url = body.website_url
elif "website_url" in body.model_fields_set and body.website_url is None:
    shop.website_url = None
```
(analog für `webshop_url`)

**Verifikation:** Tests A3b und B9 passen jetzt ohne `test.fail()` Wrapper. API-Assertions bestätigen, dass `website_url` nach PATCH korrekt in der DB gespeichert ist und in GET-Responses zurückgegeben wird.

### BUG-2: social_links nicht gespeichert

**Datei:** `/Users/bb_studio_2025/dev/github/pundo_main_backend/ingestor/api/shop_owner_shop.py`
**Fix:** `patch_shop()` hat jetzt:
```python
if body.social_links is not None:
    shop.social_links = body.social_links
elif "social_links" in body.model_fields_set and body.social_links is None:
    shop.social_links = None
```

**Verifikation:** Tests A5 und B7 passen jetzt ohne `test.fail()` Wrapper. API-Assertions bestätigen, dass `instagram` und `facebook` URLs nach PATCH korrekt gespeichert sind.

### FINDING-2: HoursEditor.tsx second_open Bedingung

**Datei:** `/Users/bb_studio_2025/dev/github/pundo_frontend/src/components/shop-admin/HoursEditor.tsx`
**Fix:** `slot.second_open !== undefined` geändert zu `slot.second_open != null`
**Verifikation:** Test B6 prüft nun korrekt das Verhalten: zweite Slot-Inputs erscheinen nur wenn `second_open != null`. B6 passt.

---

## 5. Keine Divergenzen vom vorherigen Report

Die Findings A11 (phone-Feld fehlt) und A12 (Logo-Upload) wurden nicht verändert — diese sind Design-Gaps, keine Bugs. Beide Tests bleiben als `test.skip()` markiert.

Die Customer-Sicht-Tests A10 und B12 wurden erweitert: `website_url` wird jetzt auch in der Customer-Sicht verifiziert, da der Backend-Bug behoben ist.

---

## 6. Verdict

**SHIP** — Alle 25 ausführbaren Tests passen. Die vier zuvor als `test.fail()` markierten Tests (A3b, A5, B7, B9) passen jetzt als normale Tests ohne Wrapper. Keine neuen Findings.
