# Design: E2E-Tester Erweiterung um User-Journey-Tests

**Slug:** `e2e-tester-journeys-20260423`
**Datum:** 2026-04-23
**Designer:** /designer

---

## 1. Problem & Users

**Problem:** Der aktuelle `e2e-tester`-Skill prüft **einzelne Seiten und Features** isoliert (Startseite lädt, Suche funktioniert, RTL-Flag gesetzt). Er deckt **keine durchgängigen Prozessketten** ab, die sich über mehrere Rollen, Seiten und Zustandsübergänge erstrecken. Dadurch bleiben systemische Fehler unentdeckt — z.B. dass ein deaktivierter Shop in der Karten-API noch erscheint, oder dass Reviews eines inaktivierten Shops weiterhin öffentlich angezeigt werden.

**Users (intern):**
- **Bernhard (Owner/Entwickler):** Will vor jedem Release sicher sein, dass kritische Rollen-Flows (Shop-Owner-Lifecycle, Kunden-Kauf-Lifecycle, Admin-Moderation) vollständig funktionieren.
- **Zukünftige Contributors / CI:** Sollen bei PR automatisch sehen, ob eine Änderung einen Journey-Flow bricht.

**Warum jetzt:** Der Shop-Owner-Bereich ist produktiv. Ohne Journey-Tests kann ein Refactor (z.B. an der Shop-Status-Logik) still alle Kunden-sichtbaren Effekte brechen, ohne dass Unit- oder Einzel-E2E-Tests das bemerken.

**Entscheidung (Meta-Frage des Users):**
Kein eigener Skill. Die Journey-Tests werden als **neue Phase 3.5 "User-Journey-Tests"** in den bestehenden `e2e-tester`-Skill integriert. Vorteile: gemeinsame `.last_run`-Logik, gemeinsame Static-Checks, gemeinsame TESTSET.md, gemeinsame Test-Umgebungs-Regeln (3500/8500). Die Journey-Tests sind technisch weiterhin Playwright-Specs unter `e2e/`, aber mit eigenem Namensraum (`e2e/journeys/*.spec.ts`) und eigener Fixture-Bibliothek.

---

## 2. User Flows

### Flow A — Shop-Owner-Lifecycle (Kern-Journey, prio 1)

Journey-Name: `shop-owner-lifecycle`

1. **Registrierung:** Neuer Shop-Owner registriert sich via `/shop-admin/register` mit frischer E-Mail.
2. **Verifizierung:** ⚠️ ANNAHME: Doppel-Opt-In via E-Mail wird im Test-Modus durch direkten DB-Flag-Set umgangen (kein Mail-Server). ❓ OFFEN: Existiert ein Test-Endpoint `/api/v1/test/verify-email` im Backend?
3. **Login:** Owner meldet sich via `/shop-admin/login` an, Redirect zu `/shop-admin/dashboard`.
4. **Shop anlegen:** Owner legt Shop-Profil an (Name, Adresse, Öffnungszeiten, Sprachen).
5. **Shop aktivieren:** Owner setzt Shop-Status auf "aktiv" (oder: Admin-Freigabe — ❓ OFFEN: welches Modell?).
6. **Produkt anlegen:** Owner legt 2 Produkte und je 1 Offer (Preis) an.
7. **Öffentliche Sichtbarkeit prüfen (als anonymer Kunde):**
   - a) Shop erscheint auf Kartenseite (`/map`) als Marker
   - b) Suche nach Produktname führt zur ProductCard mit Offer des Shops
   - c) Shop-Detailseite `/shops/[id]` zeigt Produkte und Offers
   - d) ShopCard zeigt `has_available_products: true` Badge
8. **Review hinzufügen (als anderer Test-User):** 1 Review mit 5 Sternen für den Shop.
9. **Review-Sichtbarkeit prüfen:** Review erscheint auf `/shops/[id]` und beeinflusst Rating.
10. **Shop deaktivieren:** Owner setzt Shop-Status auf "inaktiv" (oder löscht Shop — beide Varianten testen, ❓ OFFEN).
11. **Nicht-Sichtbarkeit prüfen (als anonymer Kunde):**
    - a) Shop erscheint **nicht** mehr auf `/map`
    - b) Suche findet Produkte nicht mehr
    - c) Shop-Detailseite `/shops/[id]` → 404 oder "nicht verfügbar"
    - d) Review taucht nirgendwo mehr öffentlich auf (auch nicht in einem Review-Aggregat)
12. **Cleanup:** Test-Daten (User, Shop, Produkte, Reviews) aus `pundo_test` DB entfernt.

### Flow B — Kunden-Discovery-Journey (prio 2)

Journey-Name: `customer-discovery`

1. Anonymer Kunde öffnet `/` in Sprache `de`.
2. Sucht nach Produkt-Keyword (z.B. "Olivenöl").
3. Klickt auf Pin auf Karte → Detail-URL öffnet sich (neue Tab? siehe `test-results/main-E2E-08`).
4. Wechselt Sprache auf `ar` → `<html dir="rtl">`, Layout gespiegelt, Labels übersetzt.
5. Öffnet Shop-Detailseite → Öffnungszeiten + Sprachen werden in AR angezeigt.
6. Edge-Case: Suche mit 0 Treffern → leerer Zustand mit Community-Feedback-CTA.

### Flow C — Admin-Moderation-Journey (prio 3)

Journey-Name: `admin-moderation`

1. Admin-Login via `/admin/login`.
2. Neuer Shop-Owner-Antrag erscheint in Admin-Queue.
3. Admin lehnt Shop ab → Owner sieht abgelehnten Status, Shop ist nicht öffentlich.
4. Admin genehmigt anderen Shop → wird öffentlich sichtbar.
5. Admin löscht problematisches Review → Review verschwindet von Shop-Detailseite + Rating-Aggregat.

⚠️ ANNAHME: Admin-Moderation-UI existiert bereits. ❓ OFFEN: Falls nein, dieser Flow wird zurückgestellt.

### Edge Cases (für alle Flows)

- **Parallele Testläufe:** Fixture-User müssen pro Lauf eindeutig sein (Email `e2e+<uuid>@pundo.test`), sonst kollidieren Re-Runs.
- **Teildurchgang mit Abbruch:** Wenn Schritt 6 fehlschlägt, muss Cleanup (Schritt 12) dennoch laufen — sonst wächst `pundo_test` leaky.
- **Backend nicht erreichbar:** Journey-Test soll **skippen mit klarer Meldung**, nicht hängen oder false-fail.

---

## 3. Screen / Component / File Inventory

### Neu zu schreiben

| Pfad | Zweck |
|---|---|
| `e2e/journeys/shop-owner-lifecycle.spec.ts` | Flow A, ~200 LOC inkl. Assertions |
| `e2e/journeys/customer-discovery.spec.ts` | Flow B |
| `e2e/journeys/admin-moderation.spec.ts` | Flow C (optional, siehe OFFEN) |
| `e2e/journeys/fixtures/users.ts` | `createTestShopOwner()`, `createTestCustomer()`, `createTestAdmin()` — generieren UUID-basierte Test-Accounts, geben Auth-Cookie zurück |
| `e2e/journeys/fixtures/shop.ts` | `createTestShop()`, `activateShop()`, `deactivateShop()`, `deleteShop()` — direkte API-Calls gegen Backend-Test-Endpoints |
| `e2e/journeys/fixtures/products.ts` | `createTestProduct()`, `createTestOffer()` |
| `e2e/journeys/fixtures/cleanup.ts` | `cleanupJourneyData(journeyId)` — löscht alle in einem Testlauf erzeugten Entitäten; läuft in `test.afterAll` und im globalen Teardown |
| `e2e/journeys/README.md` | Kurze Einführung: wie lokal laufen, Fixture-Konventionen, DB-Reset |

### Zu ändern

| Pfad | Änderung |
|---|---|
| `.claude/skills/e2e-tester/SKILL.md` | Neue **Phase 3.5: User-Journey-Tests** nach Phase 3; neues Kapitel mit Journey-Matrix, Fixture-Konventionen, Priorisierung |
| `e2e/TESTSET.md` | Neuer Abschnitt "Journey-Tests" im Template |
| `playwright.config.ts` | Separates Project `journeys` mit höherem Timeout (journey-Tests dauern 30–90s), eigenem Retries=1 |
| ggf. `e2e/global-setup.ts` | Sicherstellen: `pundo_test` DB ist erreichbar, ggf. Seed-State-Reset-Endpoint callen |

### Backend-Seite (❓ OFFEN — separates Spec fürs Backend-Repo)

Nötig für saubere Journey-Tests:
- `POST /api/v1/test/verify-email` (Test-Only-Endpoint, nur auf Port 8500 aktiv)
- `DELETE /api/v1/test/cleanup?journey_id=<id>` (löscht alle Entitäten mit Tag)
- Alternativ: Direkter `psql pundo_test`-Zugriff aus Playwright-Fixtures via Bash-Step

⚠️ ANNAHME: Wir wählen den Test-Endpoint-Ansatz (sauberer, keine DB-Credentials in Tests).

---

## 4. Acceptance Criteria

Jedes Kriterium ist vom `e2e-tester`-Skill via Playwright messbar.

### AC-1 — Journey-Phase ist im Skill dokumentiert
**Given** `.claude/skills/e2e-tester/SKILL.md`
**When** geöffnet
**Then** enthält sichtbaren Abschnitt `## Phase 3.5: User-Journey-Tests` mit Journey-Matrix (Name, Priorität, Dauer-Ziel, Abbruch-Verhalten).

### AC-2 — Shop-Owner-Lifecycle-Journey läuft grün
**Given** Frontend auf 3500, Backend auf 8500, leere `pundo_test` DB (oder mit nicht-kollidierenden Test-Präfixen)
**When** `npx playwright test e2e/journeys/shop-owner-lifecycle.spec.ts`
**Then** Exit-Code 0, alle 12 Schritte bestanden, Dauer < 120s.

### AC-3 — Inaktivierter Shop verschwindet komplett aus Public-API
**Given** Schritt 10 (Shop deaktivieren) ist ausgeführt
**When** anonymer Kunde ruft `/map`, `/search?q=<produktname>`, `/shops/<id>` auf
**Then**
- Karte enthält keinen Marker mit `shop_id == <id>` (geprüft via DOM + Network-Response)
- Suche liefert 0 Treffer für die Produkte dieses Shops
- `/shops/<id>` gibt HTTP 404 **oder** rendert klaren "nicht verfügbar"-Zustand (keine Produktdaten sichtbar)

### AC-4 — Review eines inaktivierten Shops ist nicht öffentlich
**Given** Schritt 10 ausgeführt
**When** beliebige öffentliche Seite geladen
**Then** der Review-Text erscheint in **keinem** DOM-Node und in **keiner** API-Response (Network-Tab prüfen).

### AC-5 — Cleanup läuft auch bei Testfehler
**Given** Journey bricht in Schritt 6 ab (simuliert via `expect.soft().fail()`)
**When** Playwright `afterAll`-Hook läuft
**Then** alle in diesem Testlauf erzeugten User/Shops/Produkte/Reviews sind aus `pundo_test` gelöscht — verifiziert durch zweiten API-Call auf `/api/v1/test/cleanup?journey_id=...` mit Leermeldung.

### AC-6 — Journey-Tests laufen niemals gegen Port 8000/3000
**Given** `playwright.config.ts` des Journey-Projects
**When** Playwright startet
**Then** Safety-Check im Config wirft Exception, wenn `baseURL` Port 3000 oder `BACKEND_URL` Port 8000 enthält (analog zur bestehenden Regel).

### AC-7 — TESTSET.md zeigt Journey-Ergebnisse
**Given** `npm run e2e:journeys` (neues Script) wurde ausgeführt
**When** `e2e/TESTSET.md` geöffnet
**Then** enthält Abschnitt `### Journey-Tests` mit Tabelle je Journey: `| Name | Status | Dauer | Failed Step |`.

### AC-8 — Customer-Discovery-Journey prüft RTL-Sprachwechsel mitten im Flow
**Given** Flow B aktiv
**When** Schritt 4 (Sprachwechsel auf `ar`) ausgeführt
**Then** `<html dir="rtl">` gesetzt UND mindestens ein in Schritt 1–3 sichtbares Label ist nun in arabischer Übersetzung (String-Vergleich gegen `translations.ts` `ar`-Block).

### AC-9 — Skill triggert Journeys automatisch nach /coder
**Given** `/e2e-tester` wird nach `/coder`-Übergabe aktiviert
**When** Phase 3 abgeschlossen
**Then** Phase 3.5 läuft automatisch ALLE Journey-Tests mit Priorität 1 (Shop-Owner-Lifecycle verpflichtend). Priorität 2–3 nur wenn relevante Dateien im git-Diff (`src/app/map/`, `src/app/search/`, `src/app/admin/`).

### AC-10 — Fehler in Journey-Test ist reproduzierbar debugbar
**Given** ein Journey-Test schlägt fehl
**When** Entwickler schaut in `test-results/`
**Then** vorhanden: Screenshot des fehlschlagenden Schritts, Playwright-Trace, Log mit Journey-ID, letzter API-Call-Body.

---

## 5. Open Questions

❓ **OFFEN-1: E-Mail-Verifizierung im Test-Modus.** Gibt es einen Test-Endpoint im Backend, um den Verify-Flag direkt zu setzen? Falls nein: Backend-Task vorschalten oder DB-direkt-Fixture akzeptieren.

❓ **OFFEN-2: Shop-Aktivierung — Self-Service oder Admin-Freigabe?** Das Datenmodell und die Journey-Schritte unterscheiden sich fundamental. Bitte klären, bevor Flow A gecodet wird.

❓ **OFFEN-3: "Deaktivieren" vs. "Löschen".** Soll Flow A Schritt 10 beide Varianten testen? Empfehlung: Beide, als `test.describe.parallel` aufteilen.

❓ **OFFEN-4: Admin-Moderation-UI.** Existiert sie bereits? Falls nein, Flow C zurückstellen bis separates Spec.

❓ **OFFEN-5: Cleanup-Strategie.** Test-API-Endpoints (saubere Variante) oder `psql pundo_test` aus Playwright-Bash-Step (schneller, aber mehr Coupling)? Meine Empfehlung: Test-API.

❓ **OFFEN-6: CI-Integration.** Sollen Journeys auf jedem Push laufen (teuer, 2–5 Min) oder nur auf `main` und PR-ready Labels? Empfehlung: nur bei Label `journey-test` oder nightly.

❓ **OFFEN-7: Parallelität.** Dürfen mehrere Journeys parallel gegen dieselbe `pundo_test`-DB laufen? Empfehlung: Ja, wenn alle Fixtures mit UUID-Präfix arbeiten und keine globalen Zustände (Admin-Settings) ändern.

---

Design complete at `specs/e2e-tester-journeys-20260423/01-design.md`. Ready for /architect.
