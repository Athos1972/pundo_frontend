# Phase 5: Report-Vorlagen — e2e-tester, pundo_frontend

Referenz zu `../e2e-tester.md`. Wird nur bei der genannten Phase gelesen.

### TESTSET.md aktualisieren

Datei: `e2e/TESTSET.md`

```markdown
## Letzter Testlauf
Datum: YYYY-MM-DD
Ergebnis: X/Y bestanden, Z übersprungen

### Statische Prüfung
| Prüfung | Status |
|---------|--------|
| TypeScript | PASS/FAIL |
| ESLint | PASS / X Warnings |

### Coverage-Status
| Modul | Coverage | Ziel | Status |
|-------|----------|------|--------|
| src/lib/utils.ts | XX% | 90% | PASS/GAP |
| src/lib/api.ts | XX% | 80% | PASS/GAP |

### COVERAGE_GAP (nicht blockierend)
| Modul | Aktuell | Ziel | Ursache |
|-------|---------|------|---------|
| ShopMapClient.tsx | 0% | 70% | Leaflet braucht Canvas/DOM |

### E2E-Tests
| Test | Status | Metriken |
|------|--------|---------|
| E2E-01 Startseite | PASS/FAIL | |
| E2E-02 Suche | PASS/FAIL | |
| E2E-03 RTL ar/he | PASS/FAIL | |
| E2E-04 Produkt-Detail | PASS/FAIL | |
| E2E-05 Shop & Karte | PASS/FAIL | |
| E2E-06 Responsive Mobile | PASS/FAIL | |
| E2E-07 Fehler-Handling | PASS/FAIL | |

### RTL-Validierung
| Sprache | dir-Attribut | Status |
|---------|-------------|--------|
| ar | rtl | PASS/FAIL |
| he | rtl | PASS/FAIL |
| en/de/el/ru | ltr | PASS/FAIL |

### Code-Fixes während des Tests
| Datei | Änderung | Grund |

### Open Failures (Bug-Register)
Quelle der Wahrheit: Vault `00 Überblick/__ Bugs & Hotfixes/` — kein `pre-existing` mehr.
`verdict:"SHIP"` nur wenn `open_failures: []` in `.claude/playbooks/state/e2e-tester.last_run`.

| Bug-ID | Kategorie | Status | Owner | Entdeckt |
```

### Abschlussbericht

```
╔══════════════════════════════════════════════════════╗
║  E2E-Tester Qualitätsbericht – YYYY-MM-DD            ║
╚══════════════════════════════════════════════════════╝

Statische Prüfung:
  TypeScript: PASS / X Fehler
  ESLint:     PASS / X Warnings

Unit-Tests: X/Y bestanden

Coverage-Status:
  Logik-Module    (90%-Ziel): X/Y über Ziel, Z COVERAGE_GAP
  Komponenten     (80%-Ziel): X/Y über Ziel, Z COVERAGE_GAP
  Neu geschriebene Tests: X Tests in Y Dateien

E2E-Tests:
| Test | Status |
|------|--------|
| E2E-01 Startseite         | PASS |
| E2E-02 Suche              | PASS |
| E2E-03 RTL ar/he          | PASS |
| E2E-04 Produkt-Detail     | PASS |
| E2E-05 Shop & Karte       | PASS/SKIP |
| E2E-06 Responsive Mobile  | PASS |
| E2E-07 Fehler-Handling    | PASS |

RTL: ar=rtl, he=rtl, en/de/el/ru=ltr ✓

COVERAGE_GAPs (nicht blockierend):
  - src/components/map/ShopMapClient.tsx: 0%
    Ursache: Leaflet braucht Browser-Canvas — nur im Browser testbar

Known Issues:
  - <ID>: <Beschreibung>

Entscheidungen für Bernhard:
  - <Journey-Vorschläge, Katalog-/Status-Korrekturen, Docs-Patches, unsichere RCA>

Vorgeschlagene Commit-Message (falls Tester Code/Tests geändert hat): <...> (nicht committen)
```
