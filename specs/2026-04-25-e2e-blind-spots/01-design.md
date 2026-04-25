# Design: E2E Blind Spots — Versteckte Fehler sichtbar machen

**Feature-Slug:** `2026-04-25-e2e-blind-spots`  
**Datum:** 2026-04-25  
**Autor:** e2e-tester  
**Status:** Bereit für Architektur-Review

---

## Ausgangslage

Die E2E-Journey-Suite zeigt `120 passed · 59 skipped · 0 failed`. Das klingt grün, ist es aber nicht: Ein erheblicher Teil der 59 skipped Tests versteckt echte Fehler hinter `test.skip()`. Der Testreport lügt.

**Wichtiger Hinweis vom Produktteam:** Die als "fehlend" identifizierten Backend-Endpoints **existieren bereits** und werden im Frontend verwendet. Das bedeutet: Die Ursache der Test-Failures liegt vermutlich nicht im fehlenden Backend, sondern in falscher Auth, falschem Payload oder falschem Test-Setup. Das muss der Architekt zusammen mit dem Backend-Architekten klären, bevor neue Endpoints implementiert werden.

---

## Problem 1 — Fixture-Setup schlägt still fehl (Priorität: Hoch)

### Was passiert

`shop-card-enrichment.spec.ts` benötigt einen zweiten Shop (Shop-B) für Cross-Shop-Szenarien. Shop-B wird im `beforeAll` via `POST /api/v1/admin/shops` angelegt. Das schlägt fehl — aber statt zu werfen, setzt der `beforeAll` einfach `ctx.shopASlug = null`. Alle 20+ nachfolgenden Tests prüfen:

```typescript
if (!ctx.shopASlug) { test.skip(true, 'shopA nicht verfügbar'); return }
```

**Das Ergebnis:** 20 Tests erscheinen im Report als "skipped (optional)" — in Wirklichkeit ist ein kritisches Setup-Problem verborgen.

### Was der Architekt klären muss

1. **Warum schlägt `POST /api/v1/admin/shops` im Test-Context fehl?**  
   - Endpoint existiert lt. Produktteam bereits
   - Mögliche Ursachen: falsches Auth-Schema im Test (`admin_token` Cookie vs. Bearer?), falscher Payload, andere Base-URL, fehlende Seedings in `pundo_test`
   - Bitte mit Backend-Architekten prüfen: Welche Felder sind required? Welche Auth-Methode?

2. **Muster-Fix für `beforeAll`:**  
   Wenn Fixture-Setup fehlschlägt, soll `beforeAll` **werfen**, nicht still `null` setzen:
   ```typescript
   // Falsch (lügt):
   if (!shopBRes.ok) { ctx.shopBId = null }
   
   // Richtig (schreit laut):
   if (!shopBRes.ok) throw new Error(
     `SETUP BROKEN: POST /api/v1/admin/shops → ${shopBRes.status}: ${await shopBRes.text()}`
   )
   ```

### Acceptance Criteria

- [ ] AC-1: `beforeAll` in `shop-card-enrichment.spec.ts` wirft bei Fixture-Fehler — kein stilles `null`
- [ ] AC-2: Alle 20+ cascading Skips laufen tatsächlich durch (oder failen laut mit echtem Fehler)
- [ ] AC-3: `POST /api/v1/admin/shops` Payload + Auth im Test-Context dokumentiert und getestet

---

## Problem 2 — Legacy-Specs: 32 tote Tests durch API-Umbau (Priorität: Hoch)

### Was passiert

Zwei Spec-Dateien sind mit `describe.fixme` markiert und laufen nicht:

| Datei | Grund |
|---|---|
| `shop-admin-offer-product.spec.ts` (~28 Tests) | Testet `shop_owner_products`-Tabelle, die entfernt wurde |
| `shop-admin-product-offer-ui.spec.ts` (~4 Tests) | Testet `/shop-admin/products/new` das jetzt auf `/offers/new` redirectet |

**Wichtig:** `fixme` ist schlimmer als `skip` — die Tests laufen nicht, erscheinen im Report aber nicht einmal als "skipped". Sie sind komplett unsichtbar.

### Was der Architekt klären muss

1. **Was ist der neue Golden Path für Shop-Owner → Produkt → Angebot?**  
   Aktuell: Shop-Owner geht zu `/shop-admin/offers/new` → zweistufiges Formular (ShopListing anlegen + UnifiedOffer verknüpfen). Ist das der finale Flow?

2. **Existiert ein eigener Produktkatalog noch?**  
   - `/shop-admin/products` — Route existiert noch. Soll sie bleiben?
   - Wenn nein: Route entfernen, Legacy-Specs löschen
   - Wenn ja: Neue Specs für diesen Flow schreiben

3. **Was von den alten Test-Szenarien bleibt relevant?**  
   Die alten Specs deckten ab: Cross-Shop-Isolation, Preis-Edgecases, Staffelpreise, archivierte Angebote. Diese Szenarien sind weiterhin wichtig — nur der Weg dorthin hat sich geändert.

### Acceptance Criteria

- [ ] AC-4: Architektur-Entscheidung dokumentiert: Produktkatalog ja/nein, neuer Flow beschrieben
- [ ] AC-5: `fixme`-Blöcke werden entweder gelöscht (wenn Flow obsolet) oder durch neue Specs ersetzt
- [ ] AC-6: Neue Journey-Specs für ShopListing/UnifiedOffer-Flow decken die relevanten alten Szenarien ab

---

## Problem 3 — Fehlender Journey-Test: Registrierungsflow (Priorität: Mittel)

### Was passiert

Der wichtigste Onboarding-Pfad — Register → E-Mail bestätigen → Pending Approval — ist **nicht in der Journey-Suite abgedeckt**. Der Bug (`/shop-admin/register/check-email` → 404) wurde in dieser Session bereits gefixt. Aber es gibt keinen Test, der sicherstellt dass der Fix nicht wieder rückgängig gemacht wird.

### Flow (end-to-end)

```
/shop-admin/register
  → POST /api/v1/shop-owner/register (Backend: 201)
  → Redirect: /shop-admin/register/check-email  ← NEU (heute erstellt)
  → User klickt Link in E-Mail (oder im Dev-Mode: Token aus Backend-Log)
  → /shop-admin/verify-email?token=...
  → POST /api/v1/shop-owner/verify-email (Backend: 200)
  → Redirect: /shop-admin/pending-approval
  → Admin approved → /shop-admin/dashboard
```

**Dev-Mode Spezialfall:** Wenn `SMTP_HOST` nicht gesetzt ist, loggt das Backend den Token direkt:
```
SMTP_HOST not set — skipping verification email (token=UaGwIr...)
```
Der Test muss diesen Token aus dem Backend-Log oder via direktem DB-Zugriff extrahieren.

### Acceptance Criteria

- [ ] AC-7: Journey-Test `shop-owner-onboarding.spec.ts` deckt den vollständigen Flow ab
- [ ] AC-8: Token-Extraktion im Test ohne echte E-Mail (via Backend-API oder DB-Query)
- [ ] AC-9: Test läuft in `pundo_test`-Umgebung (Port 3500/8500), nicht gegen Produktiv

---

## Problem 4 — Test-Struktur-Prinzip: stilles Skip ist verbotener Pattern (Priorität: Mittel)

### Was passiert

Quer durch alle Specs: Wenn ein `beforeAll`-Setup-Schritt fehlschlägt, setzt er Context-Variablen auf `null` und alle Tests skippen sich selbst. Das ist ein **Anti-Pattern** das sich über alle Journey-Specs zieht.

### Regeländerung

**Neu gilt:** Unterschied zwischen zwei Arten von Skips:

```typescript
// ✅ ERLAUBT: Bewusster Skip wegen optionalem Feature
test.skip(true, 'Logo-Upload nicht implementiert — optionales Feature')

// ❌ VERBOTEN: Stiller Skip wegen kaputter Prerequisite
if (!ctx.shopId) { test.skip(true, 'shopId fehlt'); return }
// → stattdessen:
if (!ctx.shopId) { throw new Error('PREREQUISITE BROKEN: shopId nicht gesetzt') }
```

### Acceptance Criteria

- [ ] AC-10: Coding-Guideline in `e2e/journeys/README.md` dokumentiert (wann skip, wann throw)
- [ ] AC-11: `shop-card-enrichment.spec.ts` als Pilot umgestellt
- [ ] AC-12: Alle anderen Specs: prerequisite-Skips durch throws ersetzen (kann schrittweise passieren)

---

## Nicht in Scope

- Produktiv-Backend-Änderungen (nur `pundo_test`-Kompatibilität)
- Neue Features (nur Test-Abdeckung bestehender Features)
- Performance-Tests

---

## Abhängigkeiten

| Abhängigkeit | Wer | Warum |
|---|---|---|
| Backend-Architekt | `POST /api/v1/admin/shops` Auth + Payload klären | Problem 1 |
| Backend-Architekt | Token-Extraktion ohne SMTP für Problem 3 | Problem 3 |
| Produktteam | Entscheidung ShopListing-Flow (Problem 2) | Problem 2 |

---

## Dateien die betroffen sind

```
e2e/journeys/shop-card-enrichment.spec.ts     ← Problem 1: beforeAll fix
e2e/journeys/shop-admin-offer-product.spec.ts ← Problem 2: löschen oder neu schreiben
e2e/journeys/shop-admin-product-offer-ui.spec.ts ← Problem 2: löschen oder neu schreiben
e2e/journeys/shop-owner-onboarding.spec.ts    ← Problem 3: NEU erstellen
e2e/journeys/README.md                        ← Problem 4: NEU erstellen (Guidelines)
e2e/global-setup.ts                           ← ggf. Token-Extraktion für Problem 3
```
