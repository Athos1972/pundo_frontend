## Journey: Shop-Owner Bewertungen: Antworten, Melden, Moderation — PASS
Datum: 2026-10-16 13:22 UTC

### Aufgebaute Test-Daten
| Fixture | ID/Slug | Status |
|---|---|---|
| shop-a | 78738 / e2e-20261016132050-reva-d3c8 | OK |
| shop-b | 78739 / e2e-20261016132050-revb-2ded | OK |
| customer | e2e-20261016132050-rev-f09f3276@pundo.com | OK |
| reviews | A=2426, B=2427, Produkt=2428 | OK |

### Schritt-für-Schritt-Protokoll
| # | Beschreibung | Erwartet | Tatsächlich | Status |
|---|---|---|---|---|
| 1 | Badge im Menü | >= 2 neu | 2 | PASS |
| 2 | Liste Mein Shop + mark-seen | nur A, Badge 0 | ok | PASS |
| 3 | IDOR | 404 review_not_found, Liste nur A | ok | PASS |
| 4 | Tab Meine Produkte | Hinweis, kein Antworten, 403 per API | ok | PASS |
| 5 | Antwort anlegen + bearbeiten | öffentlich sichtbar, bearbeitet | ok | PASS |
| 6 | Grenzwerte + zweite Antwort | 1000 ok, 1001/leer 422, zweite 409 | ok | PASS |
| 7 | Antwort löschen | öffentlich weg | ok | PASS |
| 8 | Melden | Reported, zweite 409 | ok | PASS |
| 9 | Admin: Filter "Reported by shop owner" | Quelle Shop owner, Kommentar | ok | PASS |
| 10 | Admin blendet Antwort aus | öffentlich weg, Owner gesperrt | ok | PASS |
| 11 | Admin blendet Bewertung aus | öffentlich weg, Portal ohne Aktionen | ok | PASS |
| 12 | Badge 0 + Audit-Log-Route 404 | ok | ok | PASS |
| 13 | Admin-API mit Owner-Token | 401 | 401 | PASS |
| 14 | ar @ 390 px | dir=rtl, kein Overflow | overflow=0 | PASS |

### Aufräumen
Beide Spec-Shops per Admin-Delete entfernt (kaskadiert Bewertungen, Antworten); Kunde e2e-20261016132050-rev-f09f3276@pundo.com räumt der Teardown (Marker e2e-20261016132050-).