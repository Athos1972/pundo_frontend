# Architecture: E2E Blind Spots — Versteckte Fehler sichtbar machen

**Feature-Slug:** `2026-04-25-e2e-blind-spots`
**Datum:** 2026-04-25
**Autor:** architect
**Vorgänger:** `01-design.md`
**Status:** Ready for coder

---

## 0. Zusammenfassung der Recherche-Ergebnisse

Bevor der Plan kommt, hier die Antworten auf die zwei offenen Fragen aus dem Design:

### Frage 1 — Warum schlägt `POST /api/v1/admin/shops` im Test fehl?

**Wurzel gefunden.** Der Endpoint existiert und funktioniert. Das Frontend ruft ihn korrekt auf
(`src/components/system-admin/ShopForm.tsx:97-142`, via BFF `/api/admin/shops` POST). Das Problem
liegt **ausschließlich im Test-Payload**.

Tatsächliches Vorkommen — Datei: `e2e/journeys/shop-owner-full-lifecycle.spec.ts:283-289` (NICHT
`shop-card-enrichment.spec.ts` wie im Design angenommen — der Design-Text bezeichnet die falsche
Datei; die Logik mit `shopASlug` / `shopBSlug` und 5 Cascading-Skips lebt in `shop-owner-full-lifecycle.spec.ts`).

**Was der Test sendet (falsch):**
```typescript
{
  name: `${PREFIX}-shop-B`,         // ← existiert nicht im Schema
  address_raw: '...',                // ← existiert nicht im Schema
  owner_id: ctx.ownerId,             // ← existiert nicht im Schema
  lat: 34.9050,
  lng: 33.6183,
}
```

**Was der Endpoint laut `AdminShopCreate` (Backend `ingestor/schemas/admin.py:89-116`) erwartet:**
```python
slug: str                  # required
status: str = "active"
names: dict                # required (z.B. {"en": "Shop B"})
address_line1: Optional[str]
city: Optional[str]
country_code: str = "CY"
lat / lng: Optional[float]
... (kein "name", "address_raw", "owner_id")
```

Auth ist korrekt — das Cookie `admin_token=...` wird via `adminHeaders()` mitgesendet und der
`require_admin`-Dependency akzeptiert das. Der Fehler ist **422 Unprocessable Entity**, nicht 401.

**Konsequenz:** Es muss **keine Backend-Änderung** für Problem 1 erfolgen. Der Test-Payload
muss an `AdminShopCreate` angepasst werden. Der zweite, separate Aspekt — das stille Schlucken
des Fehlers im `beforeAll` — bleibt das eigentliche strukturelle Problem (Problem 4).

Hinweis: Das Endpoint legt **keinen** `ShopOwner` an (kein `owner_id`-Feld) — die Verknüpfung
muss im Test danach explizit gesetzt werden, falls Shop-B einem Owner zugeordnet sein soll.
Aktuell wird das im Test gar nicht gemacht; der bisherige `owner_id`-Eintrag im Payload war
wirkungslos. Im Zielzustand ist Shop-B owner-los — das reicht für die UI-Coverage-Szenarien
(Fallback-Avatar, minimal-ShopCard).

### Frage 2 — Token-Extraktion ohne SMTP

**Es gibt keinen Dev-Endpoint im Backend.** Suche in `pundo_main_backend/ingestor/api/` nach
`dev/last`, `debug/token`, `test-only`, `dev-only` ergibt 0 Treffer. Der Token wird nur in
`shop_owner_auth.py:74-77` per `logger.warning` ins stdout geschrieben.

Es gibt zwei realistische Optionen:

| Option | Vorteil | Nachteil |
|---|---|---|
| **A — DB-Query** via `psql` oder `python` Script aus dem Test (analog zum bestehenden `seed_admin.py`-Aufruf in `shop-owner-full-lifecycle.spec.ts:118-150`) | Kein Backend-Change; nutzt bestehende Mechanik (`DATABASE_URL_TEST`, `BACKEND_REPO/.venv/bin/python`) | Test wird stärker an Backend-Repo-Layout gekoppelt |
| **B — Neuer Backend-Endpoint** `GET /api/v1/shop-owner/dev/last-token?email=...` (nur aktiv wenn `SMTP_HOST` leer) | Sauberer, agnostischer Test | Backend-Change nötig; Sicherheitsrisiko falls versehentlich in Prod aktiv |

**Empfehlung:** **Option A** — direkter DB-Query via Python-One-Liner, identisch zum existierenden
`seed_admin.py`-Pattern. Spalte `email_verification_token` in Tabelle `shop_owners` ist bereits
da. Kein Backend-Change nötig. Kein Sicherheitsrisiko.

Falls der User auf Option B besteht: Backend-Architekt muss einen separaten Spec aufmachen.

---

## 1. Affected modules / files

### Frontend (kein App-Code, nur Test-Infrastruktur)

```
e2e/journeys/shop-owner-full-lifecycle.spec.ts   ← Problem 1 + 4: Payload fix + throw-statt-skip
e2e/journeys/shop-admin-offer-product.spec.ts    ← Problem 2: Tote Specs prüfen + entkernen/löschen
e2e/journeys/shop-admin-product-offer-ui.spec.ts ← Problem 2: Tote Specs prüfen + entkernen/löschen
e2e/journeys/shop-owner-onboarding.spec.ts       ← Problem 3: NEU
e2e/journeys/_helpers/dev-token.ts               ← Problem 3: NEU (Token via DB-Query)
e2e/journeys/_helpers/admin-shop-payload.ts      ← Problem 1: NEU (typed Helper für AdminShopCreate)
e2e/journeys/README.md                           ← Problem 4: Skip-vs-Throw-Guideline
```

### Backend

Keine Änderungen. Beide offenen Backend-Fragen sind oben beantwortet (Endpoint existiert; Token
via DB statt API).

### Quertabelle: Welche Datei deckt welches AC ab?

| AC | Datei |
|---|---|
| AC-1, AC-2 | `shop-owner-full-lifecycle.spec.ts` |
| AC-3 | `_helpers/admin-shop-payload.ts` + Doku in `README.md` |
| AC-4, AC-5, AC-6 | `shop-admin-offer-product.spec.ts`, `shop-admin-product-offer-ui.spec.ts` (siehe Task T6) |
| AC-7 | `shop-owner-onboarding.spec.ts` |
| AC-8 | `_helpers/dev-token.ts` |
| AC-9 | Port-Safety in jeder Spec (existiert bereits als Pattern) |
| AC-10 | `e2e/journeys/README.md` |
| AC-11 | `shop-owner-full-lifecycle.spec.ts` (Pilot) |
| AC-12 | Quer durch alle Specs (Task T8) |

---

## 2. Data model changes

**Keine.** Weder Frontend-Types noch Backend-Schema werden angefasst. Alle 4 Probleme
sind Test-Hygiene.

Einziger DB-Touch: read-only `SELECT email_verification_token FROM shop_owners WHERE email=...`
für Problem 3. Kein Schema-Change.

---

## 3. API contracts

Keine neuen oder geänderten Endpoints. Wir dokumentieren hier nur den **bestehenden**
`POST /api/v1/admin/shops`-Vertrag, den der Test bisher falsch benutzt:

```http
POST /api/v1/admin/shops
Cookie: admin_token=<JWT>
Content-Type: application/json

{
  "slug": "e2e-lifecycle-abc123-shop-b",      // required
  "names": { "en": "Shop B (e2e)" },          // required
  "status": "active",                          // default
  "country_code": "CY",                        // default
  "address_line1": "Mackenzie Beach, Larnaca",
  "city": "Larnaca",
  "lat": 34.9050,
  "lng": 33.6183,
  "is_online_only": false
}

→ 201 Created
{ "id": 42, "slug": "...", "names": {...}, ... }   // AdminShopResponse
```

**Pflichtfelder:** `slug`, `names`. Alles andere ist optional oder hat Defaults.

**Nicht zulässige Felder im Test-Payload (entfernen):** `name`, `address_raw`, `owner_id`.
Pydantic ignoriert sie zwar (`extra="ignore"` ist Default), das verschleiert aber Intent
und kann bei `extra="forbid"`-Tightening zukünftig brechen.

---

## 4. Dependencies & integration points

**Keine neuen Libraries.** Wir bleiben bei den vorhandenen Tools:

- `@playwright/test` (vorhanden)
- `child_process.execSync` für Python-Aufrufe (Pattern existiert in `shop-owner-full-lifecycle.spec.ts:118-150`)
- `${BACKEND_REPO}/.venv/bin/python` für DB-Queries (Pattern existiert)
- `BACKEND_REPO`-Env-Var bzw. Default `/Users/bb_studio_2025/dev/github/pundo_main_backend`

**Integration-Points:**

- **Frontend BFF** `/api/admin/shops` (Next-Route) — wird von Tests nicht direkt benutzt, sondern
  Tests gehen direkt gegen `http://localhost:8500/api/v1/admin/shops`. Das bleibt so.
- **Backend** `POST /api/v1/admin/shops`, `POST /api/v1/shop-owner/register`,
  `POST /api/v1/shop-owner/verify-email`, `POST /api/v1/admin/shop-owners/{id}` (alle existieren).
- **DB** `pundo_test` (Port nur via Backend, nie direkt — wir gehen über Python-Script wie
  bestehender Code).

Keine Feature-Flags. Keine SMTP-Konfiguration nötig (wir nutzen den `SMTP_HOST not set`-Pfad,
der bereits implementiert ist).

---

## 5. Risks & mitigations

| Risiko | Wahrscheinlichkeit | Mitigation |
|---|---|---|
| **Throw-statt-Skip in `beforeAll` bricht andere CI-Runs** — wenn die DB nicht sauber ist, scheitert die ganze Suite | Mittel | Throws nur bei **Setup-Fehlern**, nicht bei Daten-Edgecases. Pre-Cleanup in `beforeAll` läuft schon. Coder muss prüfen dass cleanup-Hooks auch bei Throw greifen (Playwright `afterAll` läuft auch bei `beforeAll`-Failure). |
| **DB-Query via Python-Script ist langsam** (~300ms pro Aufruf) | Klein | Nur 1× pro Onboarding-Test. Akzeptabel. |
| **Cascading throws** — wenn shop-B-Setup wirft, läuft kein einziger Test der Suite | Mittel | Bewusst akzeptiert. Lieber 1 lautes FAIL als 20 stille SKIPs. Das ist genau der Sinn von Problem 4. |
| **Legacy-Specs `fixme` löschen verliert Test-Szenarien** (Cross-Shop-Isolation, Staffelpreise, archivierte Angebote) | Hoch | **NICHT einfach löschen.** Vorgehen: erst inventarisieren (T5), dann entscheiden (T6). Szenarien die noch relevant sind, in `shop-admin-offers.spec.ts` migrieren. |
| **Token aus DB-Query weicht vom Backend-Log ab** (z.B. token rotated) | Klein | DB ist source of truth — der Backend-Log ist nur ein Side-Effect. |
| **`/shop-admin/products/new` redirect ist absichtlich** (Produktteam-Entscheidung) | Hoch | T5 (Inventarisierung) muss explizit fragen. Wenn Antwort = "ja, redirect bleibt", dann T6 = Specs ersatzlos löschen + relevante Szenarien nach `shop-admin-offers.spec.ts` portieren. |
| **`extra=ignore` in Pydantic v2** — Test sendet weiterhin `owner_id`, aber niemand erkennt es | Klein | T1 erstellt typed Helper, der unbekannte Felder via TS verbietet. |

### Breaking changes / migration risk

**Keine produktiven Breaking-Changes.** Alle Änderungen sind im `e2e/`-Verzeichnis. Lokale
Dev-Loops und Prod-Deploys bleiben unberührt.

**Test-Suite Breaking:** Tests die bisher fälschlich passten/skipten werden jetzt failen.
Das ist **gewollt**.

---

## 6. Task breakdown

Tasks sind so geschnitten dass jeder ≈ 0.5-1 Tag Coder-Arbeit ist. Reihenfolge stellt
Abhängigkeiten dar — `Bedingung:` zeigt explizite Vorbedingungen.

### Problem 1 — Fixture-Setup throw statt null

#### **T1 — Typed Helper `_helpers/admin-shop-payload.ts`**
- Neue Datei: `e2e/journeys/_helpers/admin-shop-payload.ts`
- Exportiert TypeScript-Type `AdminShopCreatePayload` (Spiegel von `AdminShopCreate` aus dem Backend) und Builder-Funktion `buildAdminShopPayload(opts)` mit Defaults (`country_code: 'CY'`, `status: 'active'`, …).
- Verbietet via TypeScript unbekannte Felder (`name`, `address_raw`, `owner_id`).
- Inline-Doku als JSDoc, mit Verweis auf `pundo_main_backend/ingestor/schemas/admin.py:AdminShopCreate`.
- **Bedingung:** keine.

#### **T2 — `shop-owner-full-lifecycle.spec.ts`: Shop-B Payload-Fix**
- Zeilen 283-300: Payload auf `buildAdminShopPayload({ slug: ..., names: {en: ...}, address_line1: ..., lat, lng })` umbauen.
- Sicherstellen dass slug eindeutig ist (PREFIX + suffix).
- **Bedingung:** T1.

#### **T3 — `shop-owner-full-lifecycle.spec.ts`: throw-statt-null im `beforeAll`**
- Zeile 296-300: Statt `console.warn` und `ctx.fixtures.push({...built: false})`, `throw new Error('SETUP BROKEN: POST /api/v1/admin/shops returned ${status}: ${text}')`.
- Auch Owner-Login (Zeile 248-256), Owner-Detail (Zeile 261-279), shopAId-Resolution: bei `null`-Ergebnis throw.
- Cleanup-Hook (`afterAll`) prüfen: läuft er auch bei `beforeAll`-Throw? Playwright sagt ja, aber explizit testen.
- 5 cascading skips entfernen (Zeilen 444, 465, 489, 532, 646, 700) — die Tests laufen jetzt durch oder die ganze Suite failt sauber.
- **Bedingung:** T2.

### Problem 3 — Onboarding-Journey-Test

#### **T4 — Helper `_helpers/dev-token.ts`**
- Neue Datei: `e2e/journeys/_helpers/dev-token.ts`
- Exportiert `async function getVerificationToken(email: string): Promise<string>`.
- Implementierung: `execSync` mit `${BACKEND_REPO}/.venv/bin/python -c "..."` führt SQLAlchemy-Query gegen `DATABASE_URL_TEST` aus, holt `email_verification_token` für `email`. Gibt String zurück oder wirft, wenn null.
- Polling-Variante mit Retry (3× alle 200ms) für race-conditions zwischen `register`-Call und DB-Sichtbarkeit.
- **Bedingung:** keine.

#### **T5 — Spec `shop-owner-onboarding.spec.ts`**
- Neue Datei: `e2e/journeys/shop-owner-onboarding.spec.ts`
- Port-Safety wie üblich (3500/8500).
- Uniqueness via UUID-PREFIX (analog `shop-owner-full-lifecycle.spec.ts`).
- Schritte:
  1. `page.goto('/shop-admin/register')` → Formular ausfüllen → submit → erwartet Redirect auf `/shop-admin/register/check-email` (kein 404).
  2. Alternativ: API-Call `POST /api/v1/shop-owner/register` für deterministisches Setup, dann UI nur für Verify-Schritt.
  3. `getVerificationToken(email)` aufrufen.
  4. `page.goto('/shop-admin/verify-email?token=...')` → erwartet Redirect auf `/shop-admin/pending-approval`.
  5. Admin-Login + `PATCH /api/v1/admin/shop-owners/{id}` → status approved.
  6. Owner-Login → erwartet Redirect auf `/shop-admin/dashboard` (oder existierendes Verhalten).
- Cleanup: Owner via `PATCH .../status: rejected` oder DB-Cleanup wie in `shop-owner-full-lifecycle.spec.ts:cleanupAll`.
- Min. 6 Tests (`test.describe.serial`).
- **Bedingung:** T4.

### Problem 2 — Legacy-Specs

#### **T6 — Inventarisierung Legacy-Specs (Architekt-Entscheidung needed before code)**
- Lies `shop-admin-offer-product.spec.ts` (3 fixme blocks bei Zeilen 222, 867 — zusammen ~32 Tests) und `shop-admin-product-offer-ui.spec.ts` (1 fixme bei Zeile 77 — ~4 Tests) komplett durch.
- Erstelle Inventar-Tabelle in `specs/2026-04-25-e2e-blind-spots/legacy-spec-inventory.md` mit Spalten: Test-Name | Szenario | Heutiger Flow | Aktion (delete/migrate/rewrite).
- Bestätige beim User: Bleibt `/shop-admin/products/*` als Redirect-only? (Code zeigt aktuell ja: `src/app/(shop-admin)/shop-admin/(portal)/products/{page,new/page,[id]/edit/page}.tsx` redirecten alle.)
- **Output:** Entscheidungstabelle, kein Code.
- **Bedingung:** keine.

#### **T7 — Legacy-Specs neu schreiben oder löschen**
- Auf Basis von T6:
  - **Wenn delete:** Datei löschen, in `e2e/journeys/CATALOG.md` Eintrag aktualisieren / entfernen.
  - **Wenn migrate:** Relevantes Szenario nach `shop-admin-offers.spec.ts` portieren (Cross-Shop-Isolation, Preis-Edgecases, archivierte Angebote, Staffelpreise via `shop_owner_price_tiers`).
  - **Wenn rewrite:** neue Spec gegen den ShopListing/UnifiedOffer-Flow (`/shop-admin/offers/new` Two-Step-Form).
- Existierende `*.md`-Runbooks (`shop-admin-offer-product.md`, `shop-admin-product-offer-ui.md`) entsprechend aktualisieren oder löschen.
- **Bedingung:** T6.

### Problem 4 — Skip-vs-Throw Guidelines

#### **T8 — Guideline in `e2e/journeys/README.md`**
- Sektion "Skip vs. Throw — Wann ist welcher Skip erlaubt?" anhängen.
- Erlaubt: `test.skip(true, '...')` für **bewusst optionale Features** (z.B. Logo-Upload, der nicht implementiert ist).
- Verboten: silent-null im `ctx`, gefolgt von `if (!ctx.x) test.skip(...)` — stattdessen `throw new Error('PREREQUISITE BROKEN: ...')`.
- Beispiel-Snippets aus dem Pilot (T3) zeigen Vorher/Nachher.
- Verlinkung zu `shop-owner-full-lifecycle.spec.ts` als Referenz-Implementierung.
- **Bedingung:** T3.

#### **T9 — (Optional, schrittweise) Andere Specs auf Throw umstellen**
- Suche nach Pattern `if (!ctx.X) { test.skip(true, '...'); return }` in `e2e/journeys/`.
- Kandidaten: `shop-owner-lifecycle.spec.ts`, `customer-and-review-lifecycle.spec.ts`, `shop-admin-offers.spec.ts`, etc.
- Pro Spec einzeln entscheiden ob throw sicher ist (Setup-Fehler vs. echte optionale Daten).
- **Kann in mehrere kleine Tasks aufgeteilt werden** wenn Coder zu viel auf einmal sieht.
- **Bedingung:** T8.

### Abhängigkeitsgraph

```
T1 ──► T2 ──► T3 ──► T8 ──► T9
                       │
T4 ──► T5             │
                       │
T6 ──► T7              │
                       │
        (alle parallel-fähig nach T1/T4/T6)
```

T1, T4, T6 sind unabhängig und können parallel gestartet werden.

---

## 7. Open questions / Required confirmations

Diese Punkte muss der User vor Coder-Start (oder als Teil von T6) bestätigen:

1. **`/shop-admin/products/*` bleibt redirect-only?** (T6) — Wenn ja, Legacy-Specs löschen + nach `shop-admin-offers.spec.ts` migrieren.
2. **Token via DB-Query (Option A) ok?** (T4) — Architekt empfiehlt A. Wenn der User Option B (neuer Backend-Endpoint) will, muss zuerst ein separater Backend-Spec aufgemacht werden.
3. **Cascading throws statt skips ist gewollt** (T3) — wenn die ganze Suite bei einem `beforeAll`-Fehler rot wird, ist das das Ziel, nicht der Bug.

Wenn keine Antwort erfolgt, geht der Coder von den oben genannten Default-Annahmen aus (1 = redirect bleibt + migrate; 2 = Option A; 3 = ja, gewollt).

---

> Architecture complete at `specs/2026-04-25-e2e-blind-spots/02-architecture.md`. Ready for coder.
