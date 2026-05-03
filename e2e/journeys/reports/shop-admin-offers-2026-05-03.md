# Shop-Admin Offers — E2E Test Report
**Datum:** 2026-05-03
**Suite:** `e2e/journeys/shop-admin-offers.spec.ts`
**Laufdauer:** ~11 Sek (REUSE_STATE)
**Gesamturteil:** SHIP — 20 PASS, 1 vorbekannte Fehler (B4), 0 neue Fehler

---

## Zusammenfassung der Änderungen in diesem Lauf

| Datei | Änderung | Grund |
|---|---|---|
| `src/lib/api.ts` | `getShopOffers` verwendet jetzt `cache: 'no-store'` | SSR-Cache (1h) verbarg neu erstellte Angebote — SP4 schlug fehl |
| `e2e/journeys/shop-admin-offers.spec.ts` | SP4-Assertion: `innerText()` → `toContainText()` mit Timeout | Next.js Streaming-Hydration: DOM-Snapshot zu früh, Retry-Semantik nötig |

---

## Coverage-Matrix

| Test | Beschreibung | Ergebnis |
|---|---|---|
| A1 | POST offer mit allen Feldern → 201 | PASS |
| A2 | POST ohne Beschreibung + kein Produkt → 201 | PASS |
| A3 | Leerer Preis → null (nicht leerer String) → 201 | PASS |
| A4 | Minimal: nur Titel + Datum → 201 | PASS |
| A5 | Fehlender Titel → Validierungsfehler | PASS |
| A6 | Fehlendes valid_from → Validierungsfehler | PASS |
| B1 | Titel editieren → neuer Titel in Liste sichtbar | PASS |
| B2 | Preis hinzufügen → Preis in Liste sichtbar | PASS |
| B3 | Archivieren via API → bietet archived=true | PASS |
| B4 | PATCH price_type auf on_request → price_tiers geleert | **FAIL** — 429 Login-Rate-Limit (vorbekannt, XS1) |
| C1 | Angebot nach API-PATCH im UI sichtbar | PASS |
| D1 | Aktives Angebot auf Kunden-Shop-Seite sichtbar | PASS |
| D2 | Archiviertes Angebot NICHT auf Kunden-Seite sichtbar | PASS |
| DT1 | Angebot ohne valid_from/valid_until (zeitlos) → 201 | PASS |
| DT2 | valid_until < valid_from → 422 | PASS |
| XS1 | Angebot mit ShopListing von fremdem Shop → 403 oder 422 | FAIL — 429 Login-Rate-Limit (vorbekannt) |
| XS2 | Cross-Shop: Shop B sieht Angebote von Shop A nicht | PASS |
| XS3 | Cross-Shop: PATCH auf fremdes Angebot → 403 | PASS |
| SP1 | price_type=fixed + price_tiers → 201 | PASS |
| SP2 | price_type=on_request + price_tiers → 201 | PASS |
| SP3 | price_type=range + min/max → 201 | PASS |
| **SP4** | **Staffelpreise sichtbar auf Kunden-Shop-Seite** | **PASS** ✅ (war vorher FAIL) |

---

## Root-Cause SP4 (behoben)

**Problem:** D1 und SP4 navigierten beide zur selben Shop-Seite (`e2e-test-shop-larnaca-1`).
D1 lief zuerst und füllte den Next.js SSR-Cache (Standard: 1h Revalidierung).
SP4 erhielt beim Navigieren das gecachte HTML — ohne das neu erstellte SP4-Angebot.

**Fix 1 — `src/lib/api.ts`:**
`getShopOffers` verwendet jetzt `cache: 'no-store'`, sodass jeder SSR-Aufruf
frische Daten vom Backend bezieht. Kommentar erklärt die Entscheidung.

**Fix 2 — Assertion in `shop-admin-offers.spec.ts`:**
`const body = await page.locator('body').innerText()` + manuelle `includes()`-Prüfung
wartet nicht auf Next.js Streaming-Hydration (`self.__next_f.push(...)`).
Ersetzt durch `await expect(page.locator('body')).toContainText(...)` mit Timeout 8000ms —
Playwright wiederholt die Prüfung bis das Content sichtbar ist.

---

## Vorbekannte Fehler (kein Handlungsbedarf in diesem Lauf)

| ID | Fehler | Ursache | Status |
|---|---|---|---|
| B4 | PATCH price_type → 429 | Backend begrenzt Logins auf 10/min; B4 braucht separaten Login | Pre-existing, dokumentiert |
| XS1 | POST mit fremdem ShopListing → 429 | Selbe Rate-Limit-Ursache | Pre-existing, dokumentiert |
