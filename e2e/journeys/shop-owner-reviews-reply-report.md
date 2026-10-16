---
id: shop-owner-reviews-reply-report
title: Shop-Owner Bewertungen — Antworten, Melden, Moderation (F5930)
status: implemented
spec-file: e2e/journeys/shop-owner-reviews-reply-report.spec.ts
priority: P2
owner-agent: coder
proposed-in-spec: 2026-10-16-bewertungen-shop-portal
touches-modules:
  - src/app/(shop-admin)/shop-admin/(portal)/reviews/**
  - src/app/(shop-admin)/shop-admin/(portal)/dashboard/**
  - src/components/shop-admin/reviews/**
  - src/components/shop-admin/AdminNav.tsx
  - src/app/(system-admin)/admin/(portal)/reviews/**
  - src/components/system-admin/ReviewModerationList.tsx
  - src/components/reviews/**
  - src/lib/shop-admin-api.ts
  - src/lib/i18n/shop-admin-reviews.ts
touches-roles:
  - shop-owner
  - customer
  - admin
  - guest
touches-states:
  - Review.is_visible:true
  - Review.is_visible:false
  - ReviewReply.is_visible:false
status-changed-at: 2026-10-16T14:00:00Z
status-changed-by-spec: 2026-10-16-bewertungen-shop-portal
last-run: never
last-result: N/A
---

### Journey: Shop-Owner Bewertungen — Antworten, Melden, Moderation

**Ziel:** Ein Shop-Owner sieht die Bewertungen seines Shops und seiner Produkte (und nur diese), antwortet öffentlich, meldet eine Bewertung an pundo, und pundo moderiert (Antwort/Bewertung ausblenden) im System-Admin. Die Moderation sperrt den Owner, ein Umgehen durch Löschen und Neuschreiben ist nicht möglich.

**Trigger-Regel:** Pflicht (P2), wenn `reviews/**` im Shop-Portal, `components/shop-admin/reviews/**`, die Portal-Navigation, die System-Admin-Moderation (`/admin/reviews`), `components/reviews/**` oder `shop-admin-api.ts` im Diff sind.

**Test-Daten-Matrix:**

| Fixture | Was | Warum |
|---|---|---|
| `shop-a` | `specShop('REVA')` mit Listing eines Items (nicht veröffentlicht zählt mit) | Eigener Scope des Owners, Owner-Token per Impersonation |
| `shop-b` | `specShop('REVB')` mit eigener Bewertung | Fremder Shop: darf nie sichtbar oder änderbar sein (IDOR) |
| `customer` | `e2e-<run>-rev-<uuid>@pundo.com` (auto-verifiziert) | Schreibt die drei Bewertungen |
| `reviews` | je eine Bewertung auf A (Shop), B (Shop), Produkt von A | Scope-Trennung, Badge, Antwort, Meldung, Moderation |

**Schritte (Runbook = die 14 Tests der Spec):**
1. Badge im Portal-Menü zeigt ≥ 2 neu (Shop- + Produktbewertung)
2. Liste „Mein Shop“ zeigt nur die Bewertung von A (nicht B, nicht die Produktbewertung); Öffnen setzt das Badge auf 0 (mark-seen)
3. API-IDOR: Antwort/Bearbeiten/Löschen/Melden auf die Bewertung von B und auf eine unbekannte ID → 404 `review_not_found`
4. Tab „Meine Produkte“: Hinweis, kein „Reply“-Knopf, „Report“ vorhanden; Antwort per API → 403 `reply_not_allowed`
5. **AC-1** Antwort anlegen (UI) → öffentlich auf `/en/shops/<slug>` und in `/shops/{id}/reviews`; bearbeiten
6. **AC-3** Grenzwerte: 1000 Zeichen ok, 1001 → Feldmeldung (UI) bzw. 422, leer / nur Leerzeichen → 422; **AC-2** zweite Antwort → 409 `reply_exists`
7. Antwort löschen (UI, `confirm`) → öffentlich weg
8. **AC-2** Melden (UI, Grund + Kommentar) → „Reported“; zweites Melden → 409 `already_reported`
9. Admin `/admin/reviews?filter=owner_reported` zeigt Quelle „Shop owner“, Shopname und Kommentar; Shop B hat keine Meldung
10. Admin blendet die Antwort aus → öffentlich weg, Portal „Reply hidden by pundo“, Bearbeiten per API → 409 `reply_hidden`
11. Admin blendet die Bewertung aus → öffentlich weg, Portal „Hidden by pundo“ ohne Aktionen, Antwort per API → 409 `review_hidden`
12. Reload des Portals: Badge 0; `/shop-admin/reviews/1/audit-log` → 404
13. Owner-Token gegen `GET /api/v1/admin/reviews` → 401
14. `ar` bei 390 px: `html[dir=rtl]`, übersetzte Überschrift, kein horizontaler Overflow

**Aufräumen:** `shop.destroy()` beider Shops (kaskadiert Bewertungen und Antworten); Kunde über den Marker-Teardown.

**Known Risks:** Schritt 12 erwartet HTTP 404 (nicht 200 + noindex durch Streaming); Prüfung des Soft-404-Verhaltens siehe Memory „Soft-404 durch Streaming“.

### Ergaenzung e2e-tester (2026-10-16): `shop-owner-reviews-i18n-rtl-security.spec.ts`

Zweite Spec zur selben Journey (11 Tests, gleicher Katalogeintrag, kein eigener Eintrag). Deckt ab, was die Haupt-Spec nicht prueft:
- **AC-2** Owner-Liste ohne fremde Daten und ohne Kunden-E-Mail; alle Schreibpfade (POST/PATCH/DELETE reply, report) mit fremder ID -> 404, auch Owner B gegen die Antwort von A
- **AC-8** Owner-Token (Header und Cookie) sowie kein Token gegen alle 6 Admin-Review-Endpoints -> 401, Zustand unveraendert
- **AC-11** Leerzustand mit Link zur eigenen Shopseite, Kachel "No reviews yet"
- **AC-3/AC-10** Produktbewertung mit Produktlink, ohne Reply/Moderationsaktion; Dashboard-Kachel "N new"
- **AC-15** de/el/ru/ar/he bei 390 px (Uebersetzung, `dir`, kein Overflow, Antworttext unveraendert); ar/he mit geoeffnetem Meldedialog im Viewport
- **AC-9/AC-13** oeffentliche Shopseite (UI): Antwort weg nach "Hide reply", Bewertung weg nach "Hide review"; Audit-Log-Seite im System-Admin
- **AC-12** `/admin/reviews` in EL (Ueberschrift, Aktionen, Shopname)
